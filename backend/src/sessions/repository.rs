use async_trait::async_trait;
use sqlx::{PgPool, Row};
use time::OffsetDateTime;
use uuid::Uuid;

use super::model::UserRecord;
use crate::error::AppError;

#[async_trait]
pub trait SessionRepository: Send + Sync {
    async fn create_anonymous(
        &self,
        token_hash: &[u8],
        expires_at: OffsetDateTime,
    ) -> Result<Uuid, AppError>;

    async fn find_active_anonymous(&self, token_hash: &[u8]) -> Result<Uuid, AppError>;

    async fn find_active_auth_session(
        &self,
        token_hash: &[u8],
    ) -> Result<Option<(Uuid, Uuid)>, AppError>;

    async fn find_user_by_email(&self, email: &str) -> Result<Option<UserRecord>, AppError>;
    async fn find_user_by_id(&self, user_id: Uuid) -> Result<UserRecord, AppError>;

    async fn create_account(
        &self,
        email: &str,
        password_hash: &str,
        auth_token_hash: &[u8],
        expires_at: OffsetDateTime,
        transfer_session_id: Option<Uuid>,
    ) -> Result<UserRecord, AppError>;

    async fn create_auth_session(
        &self,
        user_id: Uuid,
        token_hash: &[u8],
        expires_at: OffsetDateTime,
    ) -> Result<Uuid, AppError>;

    async fn revoke_auth_session(&self, token_hash: &[u8]) -> Result<(), AppError>;
    async fn revoke_anonymous_session(&self, token_hash: &[u8]) -> Result<(), AppError>;

    async fn seed_user(&self, email: &str, password_hash: &str) -> Result<UserRecord, AppError>;
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
    async fn create_anonymous(
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

    async fn find_active_anonymous(&self, token_hash: &[u8]) -> Result<Uuid, AppError> {
        sqlx::query_scalar(
            "SELECT id FROM anonymous_sessions WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()",
        )
        .bind(token_hash)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::Unauthorized)
    }

    async fn find_active_auth_session(
        &self,
        token_hash: &[u8],
    ) -> Result<Option<(Uuid, Uuid)>, AppError> {
        Ok(sqlx::query_as(
            "SELECT id, user_id FROM auth_sessions WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()",
        )
        .bind(token_hash)
        .fetch_optional(&self.pool)
        .await?)
    }

    async fn find_user_by_email(&self, email: &str) -> Result<Option<UserRecord>, AppError> {
        Ok(
            sqlx::query("SELECT id, email, password_hash, created_at FROM users WHERE email = $1")
                .bind(email)
                .fetch_optional(&self.pool)
                .await?
                .map(user_from_row)
                .transpose()?,
        )
    }

    async fn find_user_by_id(&self, user_id: Uuid) -> Result<UserRecord, AppError> {
        sqlx::query("SELECT id, email, password_hash, created_at FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await?
            .map(user_from_row)
            .transpose()?
            .ok_or(AppError::Unauthorized)
    }

    async fn create_account(
        &self,
        email: &str,
        password_hash: &str,
        auth_token_hash: &[u8],
        expires_at: OffsetDateTime,
        transfer_session_id: Option<Uuid>,
    ) -> Result<UserRecord, AppError> {
        let mut transaction = self.pool.begin().await?;
        let user = match sqlx::query(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, password_hash, created_at",
        )
        .bind(email)
        .bind(password_hash)
        .fetch_one(&mut *transaction)
        .await
        {
            Ok(row) => user_from_row(row)?,
            Err(error) if is_unique_violation(&error) => {
                return Err(AppError::Conflict("email is already registered".into()));
            }
            Err(error) => return Err(error.into()),
        };

        sqlx::query(
            "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        )
        .bind(user.id)
        .bind(auth_token_hash)
        .bind(expires_at)
        .execute(&mut *transaction)
        .await?;

        if let Some(session_id) = transfer_session_id {
            sqlx::query(
                "UPDATE projects SET user_id = $1, session_id = NULL WHERE session_id = $2",
            )
            .bind(user.id)
            .bind(session_id)
            .execute(&mut *transaction)
            .await?;
            sqlx::query("UPDATE anonymous_sessions SET revoked_at = now() WHERE id = $1")
                .bind(session_id)
                .execute(&mut *transaction)
                .await?;
        }

        transaction.commit().await?;
        Ok(user)
    }

    async fn create_auth_session(
        &self,
        user_id: Uuid,
        token_hash: &[u8],
        expires_at: OffsetDateTime,
    ) -> Result<Uuid, AppError> {
        Ok(sqlx::query_scalar(
            "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id",
        )
        .bind(user_id)
        .bind(token_hash)
        .bind(expires_at)
        .fetch_one(&self.pool)
        .await?)
    }

    async fn revoke_auth_session(&self, token_hash: &[u8]) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE auth_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL",
        )
        .bind(token_hash)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn revoke_anonymous_session(&self, token_hash: &[u8]) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE anonymous_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL",
        )
        .bind(token_hash)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn seed_user(&self, email: &str, password_hash: &str) -> Result<UserRecord, AppError> {
        let row = sqlx::query(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash RETURNING id, email, password_hash, created_at",
        )
        .bind(email)
        .bind(password_hash)
        .fetch_one(&self.pool)
        .await?;
        user_from_row(row)
    }
}

fn user_from_row(row: sqlx::postgres::PgRow) -> Result<UserRecord, AppError> {
    Ok(UserRecord {
        id: row.try_get("id")?,
        email: row.try_get("email")?,
        password_hash: row.try_get("password_hash")?,
        created_at: row.try_get("created_at")?,
    })
}

fn is_unique_violation(error: &sqlx::Error) -> bool {
    error
        .as_database_error()
        .and_then(|database_error| database_error.code())
        .is_some_and(|code| code == "23505")
}
