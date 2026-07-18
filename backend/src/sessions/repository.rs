use async_trait::async_trait;
use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::error::AppError;

#[async_trait]
pub trait SessionRepository: Send + Sync {
    async fn create(&self, token_hash: &[u8], expires_at: OffsetDateTime)
    -> Result<Uuid, AppError>;

    async fn find_active(&self, token_hash: &[u8]) -> Result<Uuid, AppError>;
}

pub struct PgSessionRepository {
    pool: PgPool,
}

impl PgSessionRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl SessionRepository for PgSessionRepository {
    async fn create(
        &self,
        token_hash: &[u8],
        expires_at: OffsetDateTime,
    ) -> Result<Uuid, AppError> {
        Ok(sqlx::query_scalar(
            "INSERT INTO anonymous_sessions (token_hash, expires_at) VALUES ($1, $2) RETURNING id",
        )
        .bind(token_hash)
        .bind(expires_at)
        .fetch_one(&self.pool)
        .await?)
    }

    async fn find_active(&self, token_hash: &[u8]) -> Result<Uuid, AppError> {
        sqlx::query_scalar(
            "SELECT id FROM anonymous_sessions WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()",
        )
        .bind(token_hash)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::Unauthorized)
    }
}
