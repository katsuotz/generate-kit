use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Clone, Debug)]
pub enum Principal {
    Anonymous {
        session_id: Uuid,
    },
    User {
        user_id: Uuid,
        auth_session_id: Uuid,
    },
}

impl Principal {
    pub fn user_id(&self) -> Option<Uuid> {
        match self {
            Self::Anonymous { .. } => None,
            Self::User { user_id, .. } => Some(*user_id),
        }
    }

    pub fn anonymous_session_id(&self) -> Option<Uuid> {
        match self {
            Self::Anonymous { session_id } => Some(*session_id),
            Self::User { .. } => None,
        }
    }
}

#[derive(Clone, Debug, Serialize)]
pub struct AnonymousSessionResponse {
    pub session_id: Uuid,
    pub token: String,
    pub expires_at: OffsetDateTime,
}

#[derive(Clone, Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
}

#[derive(Clone, Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct AccountResponse {
    pub id: Uuid,
    pub email: String,
    pub created_at: OffsetDateTime,
}

#[derive(Clone, Debug)]
pub struct UserRecord {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub created_at: OffsetDateTime,
}

#[derive(Clone, Debug)]
pub struct AuthSessionResponse {
    pub account: AccountResponse,
    pub token: String,
    pub expires_at: OffsetDateTime,
}
