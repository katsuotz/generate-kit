use async_trait::async_trait;
use sqlx::{PgPool, Row, postgres::PgRow};
use time::OffsetDateTime;
use uuid::Uuid;

use super::model::{
    CvSessionResponse, DocumentMetadata, ProjectMetadata, RevisionMetadata, SaveCvSessionInput,
};
use crate::{error::AppError, sessions::model::Principal};

#[async_trait]
pub trait CvRepository: Send + Sync {
    async fn get(&self, principal: &Principal) -> Result<Option<CvSessionResponse>, AppError>;
    async fn save(
        &self,
        principal: &Principal,
        expected_version: i64,
        input: &SaveCvSessionInput,
    ) -> Result<CvSessionResponse, AppError>;
}

pub struct PgCvRepository {
    pool: PgPool,
}

impl PgCvRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl CvRepository for PgCvRepository {
    async fn get(&self, principal: &Principal) -> Result<Option<CvSessionResponse>, AppError> {
        let (user_id, session_id) = owner_columns(principal);
        Ok(sqlx::query(CV_SESSION_QUERY)
            .bind(user_id)
            .bind(session_id)
            .fetch_optional(&self.pool)
            .await?
            .map(response_from_row)
            .transpose()?)
    }

    async fn save(
        &self,
        principal: &Principal,
        expected_version: i64,
        input: &SaveCvSessionInput,
    ) -> Result<CvSessionResponse, AppError> {
        let (user_id, session_id) = owner_columns(principal);
        let mut transaction = self.pool.begin().await?;
        let existing = sqlx::query(
            "SELECT c.id, c.project_id, c.document_id, c.version FROM cv_drafts c JOIN projects p ON p.id = c.project_id JOIN documents d ON d.id = c.document_id AND d.project_id = p.id WHERE ((p.user_id = $1 AND $1 IS NOT NULL) OR (p.session_id = $2 AND $2 IS NOT NULL)) ORDER BY c.updated_at DESC LIMIT 1 FOR UPDATE",
        )
        .bind(user_id)
        .bind(session_id)
        .fetch_optional(&mut *transaction)
        .await?;

        let draft_id = if let Some(row) = existing {
            let draft_id: Uuid = row.try_get("id")?;
            let project_id: Uuid = row.try_get("project_id")?;
            let document_id: Uuid = row.try_get("document_id")?;
            let current_version: i64 = row.try_get("version")?;
            if expected_version == 0 || expected_version != current_version {
                return Err(AppError::Conflict("cv session version is stale".into()));
            }
            if input.project_id.is_some_and(|id| id != project_id)
                || input.document_id.is_some_and(|id| id != document_id)
            {
                return Err(AppError::BadRequest(
                    "project or document does not match the cv session".into(),
                ));
            }
            sqlx::query(
                "UPDATE cv_drafts SET schema_version = $1, template_id = $2, data = $3, generated_source = $4, generated_at = $5, fingerprint = $6, version = version + 1, updated_at = now() WHERE id = $7",
            )
            .bind(input.schema_version)
            .bind(&input.template_id)
            .bind(&input.data)
            .bind(&input.generated_source)
            .bind(input.generated_at)
            .bind(&input.fingerprint)
            .bind(draft_id)
            .execute(&mut *transaction)
            .await?;
            draft_id
        } else {
            if expected_version != 0 {
                return Err(AppError::Conflict("cv session version is stale".into()));
            }
            let (project_id, document_id) =
                ensure_document(&mut transaction, principal, input).await?;
            sqlx::query_scalar(
                "INSERT INTO cv_drafts (project_id, document_id, schema_version, template_id, data, generated_source, generated_at, fingerprint) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
            )
            .bind(project_id)
            .bind(document_id)
            .bind(input.schema_version)
            .bind(&input.template_id)
            .bind(&input.data)
            .bind(&input.generated_source)
            .bind(input.generated_at)
            .bind(&input.fingerprint)
            .fetch_one(&mut *transaction)
            .await?
        };

        transaction.commit().await?;
        self.get_by_id(principal, draft_id).await
    }
}

impl PgCvRepository {
    async fn get_by_id(
        &self,
        principal: &Principal,
        draft_id: Uuid,
    ) -> Result<CvSessionResponse, AppError> {
        let (user_id, session_id) = owner_columns(principal);
        sqlx::query(
            "SELECT c.id, c.project_id, c.document_id, c.schema_version, c.template_id, c.data, c.generated_source, c.generated_at, c.fingerprint, c.version, c.created_at, c.updated_at, p.id AS project_id_value, p.name AS project_name, d.id AS document_id_value, d.name AS document_name, d.updated_at AS document_updated_at, r.id AS latest_revision_id, r.revision_number AS latest_revision_number, r.created_at AS latest_revision_created_at FROM cv_drafts c JOIN projects p ON p.id = c.project_id JOIN documents d ON d.id = c.document_id AND d.project_id = p.id LEFT JOIN LATERAL (SELECT id, revision_number, created_at FROM document_revisions WHERE document_id = d.id ORDER BY revision_number DESC LIMIT 1) r ON true WHERE c.id = $1 AND ((p.user_id = $2 AND $2 IS NOT NULL) OR (p.session_id = $3 AND $3 IS NOT NULL))",
        )
        .bind(draft_id)
        .bind(user_id)
        .bind(session_id)
        .fetch_optional(&self.pool)
        .await?
        .map(response_from_row)
        .transpose()?
        .ok_or(AppError::NotFound)
    }
}

async fn ensure_document(
    transaction: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    principal: &Principal,
    input: &SaveCvSessionInput,
) -> Result<(Uuid, Uuid), AppError> {
    let (user_id, session_id) = owner_columns(principal);
    match (input.project_id, input.document_id) {
        (Some(project_id), Some(document_id)) => {
            let exists: bool = sqlx::query_scalar(
                "SELECT EXISTS (SELECT 1 FROM projects p JOIN documents d ON d.project_id = p.id WHERE p.id = $1 AND d.id = $2 AND ((p.user_id = $3 AND $3 IS NOT NULL) OR (p.session_id = $4 AND $4 IS NOT NULL)))",
            )
            .bind(project_id)
            .bind(document_id)
            .bind(user_id)
            .bind(session_id)
            .fetch_one(&mut **transaction)
            .await?;
            if exists {
                Ok((project_id, document_id))
            } else {
                Err(AppError::NotFound)
            }
        }
        (None, None) => {
            let project_id: Uuid = if let Some(id) = sqlx::query_scalar(
                "SELECT id FROM projects WHERE ((user_id = $1 AND $1 IS NOT NULL) OR (session_id = $2 AND $2 IS NOT NULL)) ORDER BY updated_at DESC LIMIT 1",
            )
            .bind(user_id)
            .bind(session_id)
            .fetch_optional(&mut **transaction)
            .await?
            {
                id
            } else {
                sqlx::query_scalar(
                    "INSERT INTO projects (user_id, session_id, name) VALUES ($1, $2, 'My CV') RETURNING id",
                )
                .bind(user_id)
                .bind(session_id)
                .fetch_one(&mut **transaction)
                .await?
            };
            let document_id: Uuid = if let Some(id) = sqlx::query_scalar(
                "SELECT id FROM documents WHERE project_id = $1 ORDER BY updated_at DESC LIMIT 1",
            )
            .bind(project_id)
            .fetch_optional(&mut **transaction)
            .await?
            {
                id
            } else {
                let id: Uuid = sqlx::query_scalar(
                    "INSERT INTO documents (project_id, name) VALUES ($1, 'cv.tex') RETURNING id",
                )
                .bind(project_id)
                .fetch_one(&mut **transaction)
                .await?;
                sqlx::query(
                    "INSERT INTO document_revisions (document_id, revision_number, source) VALUES ($1, 1, $2)",
                )
                .bind(id)
                .bind(input.generated_source.as_deref().unwrap_or(""))
                .execute(&mut **transaction)
                .await?;
                id
            };
            Ok((project_id, document_id))
        }
        _ => Err(AppError::BadRequest(
            "project_id and document_id must be supplied together".into(),
        )),
    }
}

fn owner_columns(principal: &Principal) -> (Option<Uuid>, Option<Uuid>) {
    (principal.user_id(), principal.anonymous_session_id())
}

fn response_from_row(row: PgRow) -> Result<CvSessionResponse, AppError> {
    let latest_revision = row
        .try_get::<Option<Uuid>, _>("latest_revision_id")?
        .map(|id| {
            Ok::<RevisionMetadata, AppError>(RevisionMetadata {
                id,
                number: row.try_get("latest_revision_number")?,
                created_at: format_time(row.try_get("latest_revision_created_at")?),
            })
        })
        .transpose()?;
    let latest_revision_id = latest_revision.as_ref().map(|revision| revision.id);
    let latest_revision_number = latest_revision.as_ref().map(|revision| revision.number);
    let latest_revision_created_at = latest_revision
        .as_ref()
        .map(|revision| revision.created_at.clone());
    Ok(CvSessionResponse {
        id: row.try_get("id")?,
        project_id: row.try_get("project_id")?,
        document_id: row.try_get("document_id")?,
        project: ProjectMetadata {
            id: row.try_get("project_id_value")?,
            name: row.try_get("project_name")?,
        },
        document: DocumentMetadata {
            id: row.try_get("document_id_value")?,
            name: row.try_get("document_name")?,
            updated_at: format_time(row.try_get("document_updated_at")?),
            latest_revision,
        },
        latest_revision_id,
        latest_revision_number,
        latest_revision_created_at,
        schema_version: row.try_get("schema_version")?,
        template_id: row.try_get("template_id")?,
        data: row.try_get("data")?,
        generated_source: row.try_get("generated_source")?,
        generated_at: row
            .try_get::<Option<OffsetDateTime>, _>("generated_at")?
            .map(format_time),
        fingerprint: row.try_get("fingerprint")?,
        version: row.try_get("version")?,
        created_at: format_time(row.try_get("created_at")?),
        updated_at: format_time(row.try_get("updated_at")?),
    })
}

fn format_time(value: OffsetDateTime) -> String {
    value
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_else(|_| value.unix_timestamp().to_string())
}

const CV_SESSION_QUERY: &str = "SELECT c.id, c.project_id, c.document_id, c.schema_version, c.template_id, c.data, c.generated_source, c.generated_at, c.fingerprint, c.version, c.created_at, c.updated_at, p.id AS project_id_value, p.name AS project_name, d.id AS document_id_value, d.name AS document_name, d.updated_at AS document_updated_at, r.id AS latest_revision_id, r.revision_number AS latest_revision_number, r.created_at AS latest_revision_created_at FROM cv_drafts c JOIN projects p ON p.id = c.project_id JOIN documents d ON d.id = c.document_id AND d.project_id = p.id LEFT JOIN LATERAL (SELECT id, revision_number, created_at FROM document_revisions WHERE document_id = d.id ORDER BY revision_number DESC LIMIT 1) r ON true WHERE ((p.user_id = $1 AND $1 IS NOT NULL) OR (p.session_id = $2 AND $2 IS NOT NULL)) ORDER BY c.updated_at DESC LIMIT 1";
