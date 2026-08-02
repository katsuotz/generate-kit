use async_trait::async_trait;
use sqlx::{PgPool, Row, postgres::PgRow};
use uuid::Uuid;

use super::model::{DocumentResponse, ProjectResponse};
use crate::error::AppError;
use crate::sessions::model::Principal;

#[async_trait]
pub trait DocumentRepository: Send + Sync {
    async fn create_project(
        &self,
        principal: &Principal,
        name: &str,
    ) -> Result<ProjectResponse, AppError>;

    async fn project_owned(&self, principal: &Principal, project_id: Uuid) -> Result<(), AppError>;
    async fn document_owned(
        &self,
        principal: &Principal,
        document_id: Uuid,
    ) -> Result<(), AppError>;
    async fn revision_owned(
        &self,
        principal: &Principal,
        revision_id: Uuid,
    ) -> Result<(), AppError>;

    async fn create_document(
        &self,
        project_id: Uuid,
        name: &str,
        source: &str,
    ) -> Result<DocumentResponse, AppError>;

    async fn get_document(
        &self,
        principal: &Principal,
        document_id: Uuid,
    ) -> Result<DocumentResponse, AppError>;

    async fn update_document(
        &self,
        document_id: Uuid,
        source: &str,
    ) -> Result<DocumentResponse, AppError>;

    async fn revision_document(&self, revision_id: Uuid) -> Result<(Uuid, String), AppError>;
}

pub struct PgDocumentRepository {
    pool: PgPool,
}

impl PgDocumentRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl DocumentRepository for PgDocumentRepository {
    async fn create_project(
        &self,
        principal: &Principal,
        name: &str,
    ) -> Result<ProjectResponse, AppError> {
        let (user_id, session_id) = owner_columns(principal);
        Ok(sqlx::query_as(
            "INSERT INTO projects (user_id, session_id, name) VALUES ($1, $2, $3) RETURNING id, name",
        )
        .bind(user_id)
        .bind(session_id)
        .bind(name)
        .fetch_one(&self.pool)
        .await?)
    }

    async fn project_owned(&self, principal: &Principal, project_id: Uuid) -> Result<(), AppError> {
        let (user_id, session_id) = owner_columns(principal);
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM projects WHERE id = $1 AND ((user_id = $2 AND $2 IS NOT NULL) OR (session_id = $3 AND $3 IS NOT NULL)))",
        )
        .bind(project_id)
        .bind(user_id)
        .bind(session_id)
        .fetch_one(&self.pool)
        .await?;
        exists.then_some(()).ok_or(AppError::NotFound)
    }

    async fn document_owned(
        &self,
        principal: &Principal,
        document_id: Uuid,
    ) -> Result<(), AppError> {
        let (user_id, session_id) = owner_columns(principal);
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM documents d JOIN projects p ON p.id = d.project_id WHERE d.id = $1 AND ((p.user_id = $2 AND $2 IS NOT NULL) OR (p.session_id = $3 AND $3 IS NOT NULL)))",
        )
        .bind(document_id)
        .bind(user_id)
        .bind(session_id)
        .fetch_one(&self.pool)
        .await?;
        exists.then_some(()).ok_or(AppError::NotFound)
    }

    async fn revision_owned(
        &self,
        principal: &Principal,
        revision_id: Uuid,
    ) -> Result<(), AppError> {
        let (user_id, session_id) = owner_columns(principal);
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM document_revisions r JOIN documents d ON d.id = r.document_id JOIN projects p ON p.id = d.project_id WHERE r.id = $1 AND ((p.user_id = $2 AND $2 IS NOT NULL) OR (p.session_id = $3 AND $3 IS NOT NULL)))",
        )
        .bind(revision_id)
        .bind(user_id)
        .bind(session_id)
        .fetch_one(&self.pool)
        .await?;
        exists.then_some(()).ok_or(AppError::NotFound)
    }

    async fn create_document(
        &self,
        project_id: Uuid,
        name: &str,
        source: &str,
    ) -> Result<DocumentResponse, AppError> {
        let mut transaction = self.pool.begin().await?;
        let id: Uuid = sqlx::query_scalar(
            "INSERT INTO documents (project_id, name) VALUES ($1, $2) RETURNING id",
        )
        .bind(project_id)
        .bind(name)
        .fetch_one(&mut *transaction)
        .await?;
        let revision = insert_revision(&mut transaction, id, source).await?;
        transaction.commit().await?;

        Ok(DocumentResponse {
            id,
            project_id,
            name: name.to_owned(),
            revision_id: revision.0,
            revision_number: revision.1,
            source: source.to_owned(),
        })
    }

    async fn update_document(
        &self,
        document_id: Uuid,
        source: &str,
    ) -> Result<DocumentResponse, AppError> {
        let mut transaction = self.pool.begin().await?;
        let row: PgRow =
            sqlx::query("SELECT project_id, name FROM documents WHERE id = $1 FOR UPDATE")
                .bind(document_id)
                .fetch_optional(&mut *transaction)
                .await?
                .ok_or(AppError::NotFound)?;
        let project_id: Uuid = row.try_get("project_id")?;
        let name: String = row.try_get("name")?;
        let revision = insert_revision(&mut transaction, document_id, source).await?;
        sqlx::query("UPDATE documents SET updated_at = now() WHERE id = $1")
            .bind(document_id)
            .execute(&mut *transaction)
            .await?;
        transaction.commit().await?;

        Ok(DocumentResponse {
            id: document_id,
            project_id,
            name,
            revision_id: revision.0,
            revision_number: revision.1,
            source: source.to_owned(),
        })
    }

    async fn get_document(
        &self,
        principal: &Principal,
        document_id: Uuid,
    ) -> Result<DocumentResponse, AppError> {
        let (user_id, session_id) = owner_columns(principal);
        let row: (Uuid, Uuid, String, Uuid, i64, String) = sqlx::query_as(
            "SELECT d.id, d.project_id, d.name, r.id AS revision_id, r.revision_number, r.source \
             FROM documents d \
             JOIN projects p ON p.id = d.project_id \
             JOIN LATERAL (\
                 SELECT id, revision_number, source \
                 FROM document_revisions \
                 WHERE document_id = d.id \
                 ORDER BY revision_number DESC \
                 LIMIT 1\
             ) r ON true \
             WHERE d.id = $1 AND ((p.user_id = $2 AND $2 IS NOT NULL) OR (p.session_id = $3 AND $3 IS NOT NULL))",
        )
        .bind(document_id)
        .bind(user_id)
        .bind(session_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::NotFound)?;

        Ok(DocumentResponse {
            id: row.0,
            project_id: row.1,
            name: row.2,
            revision_id: row.3,
            revision_number: row.4,
            source: row.5,
        })
    }

    async fn revision_document(&self, revision_id: Uuid) -> Result<(Uuid, String), AppError> {
        sqlx::query_as("SELECT document_id, source FROM document_revisions WHERE id = $1")
            .bind(revision_id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or(AppError::NotFound)
    }
}

fn owner_columns(principal: &Principal) -> (Option<Uuid>, Option<Uuid>) {
    (principal.user_id(), principal.anonymous_session_id())
}

async fn insert_revision(
    transaction: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    document_id: Uuid,
    source: &str,
) -> Result<(Uuid, i64), AppError> {
    let revision: i64 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(revision_number), 0) + 1 FROM document_revisions WHERE document_id = $1",
    )
    .bind(document_id)
    .fetch_one(&mut **transaction)
    .await?;
    let id: Uuid = sqlx::query_scalar(
        "INSERT INTO document_revisions (document_id, revision_number, source) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(document_id)
    .bind(revision)
    .bind(source)
    .fetch_one(&mut **transaction)
    .await?;
    Ok((id, revision))
}
