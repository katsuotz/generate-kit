use async_trait::async_trait;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use super::model::{ArtifactResponse, CompileJobResponse, Diagnostic};
use crate::error::AppError;

#[async_trait]
pub trait CompilationRepository: Send + Sync {
    async fn create_job(&self, revision_id: Uuid, profile: &str) -> Result<Uuid, AppError>;
    async fn job_owned(&self, session_id: Uuid, job_id: Uuid) -> Result<(), AppError>;
    async fn get_job(&self, job_id: Uuid) -> Result<CompileJobResponse, AppError>;
    async fn cancel_job(&self, job_id: Uuid) -> Result<(), AppError>;
    async fn artifact_owned(&self, session_id: Uuid, artifact_id: Uuid) -> Result<(), AppError>;
    async fn get_artifact(&self, artifact_id: Uuid) -> Result<Vec<u8>, AppError>;
    async fn claim_job(&self) -> Result<Option<(Uuid, Uuid, String)>, AppError>;
    async fn finish_job(
        &self,
        job_id: Uuid,
        diagnostics: &[Diagnostic],
        error_code: Option<&str>,
    ) -> Result<(), AppError>;
    async fn save_artifact(
        &self,
        job_id: Uuid,
        bytes: &[u8],
        page_count: Option<i32>,
    ) -> Result<(), AppError>;
    async fn is_cancelled(&self, job_id: Uuid) -> Result<bool, AppError>;
    async fn recover_stale_jobs(&self) -> Result<u64, AppError>;
}

pub struct PgCompilationRepository {
    pool: PgPool,
}

impl PgCompilationRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl CompilationRepository for PgCompilationRepository {
    async fn create_job(&self, revision_id: Uuid, profile: &str) -> Result<Uuid, AppError> {
        if let Some(id) = sqlx::query_scalar(
            "SELECT id FROM compile_jobs WHERE revision_id = $1 AND profile = $2 AND status IN ('queued', 'running') ORDER BY requested_at DESC LIMIT 1",
        )
        .bind(revision_id)
        .bind(profile)
        .fetch_optional(&self.pool)
        .await?
        {
            return Ok(id);
        }

        Ok(sqlx::query_scalar(
            "INSERT INTO compile_jobs (revision_id, profile) VALUES ($1, $2) RETURNING id",
        )
        .bind(revision_id)
        .bind(profile)
        .fetch_one(&self.pool)
        .await?)
    }

    async fn job_owned(&self, session_id: Uuid, job_id: Uuid) -> Result<(), AppError> {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM compile_jobs j JOIN document_revisions r ON r.id = j.revision_id JOIN documents d ON d.id = r.document_id JOIN projects p ON p.id = d.project_id WHERE j.id = $1 AND p.session_id = $2)",
        )
        .bind(job_id)
        .bind(session_id)
        .fetch_one(&self.pool)
        .await?;
        exists.then_some(()).ok_or(AppError::NotFound)
    }

    async fn get_job(&self, job_id: Uuid) -> Result<CompileJobResponse, AppError> {
        let row = sqlx::query(
            "SELECT j.id, j.revision_id, j.profile, j.status::text AS status, j.diagnostics, a.id AS artifact_id, a.media_type, octet_length(a.bytes) AS artifact_bytes, a.page_count FROM compile_jobs j LEFT JOIN compile_artifacts a ON a.job_id = j.id WHERE j.id = $1",
        )
        .bind(job_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::NotFound)?;
        let diagnostics =
            crate::error::json_value(&row.try_get::<serde_json::Value, _>("diagnostics")?);
        let artifact = row
            .try_get::<Option<Uuid>, _>("artifact_id")?
            .map(|id| ArtifactResponse {
                id,
                media_type: row
                    .try_get("media_type")
                    .unwrap_or_else(|_| "application/pdf".into()),
                bytes: row.try_get::<i32, _>("artifact_bytes").unwrap_or_default() as usize,
                page_count: row.try_get("page_count").unwrap_or(None),
            });
        Ok(CompileJobResponse {
            id: row.try_get("id")?,
            revision_id: row.try_get("revision_id")?,
            profile: row.try_get("profile")?,
            status: row.try_get("status")?,
            diagnostics,
            artifact,
        })
    }

    async fn cancel_job(&self, job_id: Uuid) -> Result<(), AppError> {
        let result = sqlx::query(
            "UPDATE compile_jobs SET cancellation_requested_at = now(), status = CASE WHEN status = 'queued' THEN 'cancelled'::compile_job_status ELSE status END, finished_at = CASE WHEN status = 'queued' THEN now() ELSE finished_at END WHERE id = $1 AND status IN ('queued', 'running')",
        )
        .bind(job_id)
        .execute(&self.pool)
        .await?;
        if result.rows_affected() == 0 {
            return Err(AppError::NotFound);
        }
        Ok(())
    }

    async fn artifact_owned(&self, session_id: Uuid, artifact_id: Uuid) -> Result<(), AppError> {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM compile_artifacts a JOIN compile_jobs j ON j.id = a.job_id JOIN document_revisions r ON r.id = j.revision_id JOIN documents d ON d.id = r.document_id JOIN projects p ON p.id = d.project_id WHERE a.id = $1 AND p.session_id = $2)",
        )
        .bind(artifact_id)
        .bind(session_id)
        .fetch_one(&self.pool)
        .await?;
        exists.then_some(()).ok_or(AppError::NotFound)
    }

    async fn get_artifact(&self, artifact_id: Uuid) -> Result<Vec<u8>, AppError> {
        sqlx::query_scalar(
            "SELECT bytes FROM compile_artifacts WHERE id = $1 AND expires_at > now()",
        )
        .bind(artifact_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::NotFound)
    }

    async fn claim_job(&self) -> Result<Option<(Uuid, Uuid, String)>, AppError> {
        let mut transaction = self.pool.begin().await?;
        let row = sqlx::query(
            "SELECT id, revision_id, profile FROM compile_jobs WHERE status = 'queued' AND cancellation_requested_at IS NULL ORDER BY requested_at FOR UPDATE SKIP LOCKED LIMIT 1",
        )
        .fetch_optional(&mut *transaction)
        .await?;
        let Some(row) = row else {
            transaction.commit().await?;
            return Ok(None);
        };
        let id: Uuid = row.try_get("id")?;
        let revision_id: Uuid = row.try_get("revision_id")?;
        let profile: String = row.try_get("profile")?;
        sqlx::query(
            "UPDATE compile_jobs SET status = 'running', started_at = now(), attempts = attempts + 1 WHERE id = $1",
        )
        .bind(id)
        .execute(&mut *transaction)
        .await?;
        transaction.commit().await?;
        Ok(Some((id, revision_id, profile)))
    }

    async fn finish_job(
        &self,
        job_id: Uuid,
        diagnostics: &[Diagnostic],
        error_code: Option<&str>,
    ) -> Result<(), AppError> {
        let status = match error_code {
            Some("CANCELLED") => "cancelled",
            Some(_) => "failed",
            None => "succeeded",
        };
        sqlx::query(
            "UPDATE compile_jobs SET status = $2::compile_job_status, diagnostics = $3, error_code = $4, finished_at = now() WHERE id = $1",
        )
        .bind(job_id)
        .bind(status)
        .bind(serde_json::to_value(diagnostics).unwrap_or_else(|_| serde_json::json!([])))
        .bind(error_code)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn save_artifact(
        &self,
        job_id: Uuid,
        bytes: &[u8],
        page_count: Option<i32>,
    ) -> Result<(), AppError> {
        use sha2::{Digest, Sha256};
        let hash = Sha256::digest(bytes);
        sqlx::query(
            "INSERT INTO compile_artifacts (job_id, media_type, bytes, sha256, page_count, expires_at) VALUES ($1, 'application/pdf', $2, $3, $4, now() + interval '7 days')",
        )
        .bind(job_id)
        .bind(bytes)
        .bind(hash.as_slice())
        .bind(page_count)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn is_cancelled(&self, job_id: Uuid) -> Result<bool, AppError> {
        Ok(sqlx::query_scalar(
            "SELECT cancellation_requested_at IS NOT NULL FROM compile_jobs WHERE id = $1",
        )
        .bind(job_id)
        .fetch_one(&self.pool)
        .await?)
    }

    async fn recover_stale_jobs(&self) -> Result<u64, AppError> {
        Ok(sqlx::query(
            "UPDATE compile_jobs SET status = 'queued', started_at = NULL WHERE status = 'running' AND started_at < now() - interval '2 minutes'",
        )
        .execute(&self.pool)
        .await?
        .rows_affected())
    }
}
