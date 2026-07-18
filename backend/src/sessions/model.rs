use serde::Serialize;
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize)]
pub struct AnonymousSessionResponse {
    pub session_id: Uuid,
    pub token: String,
    pub expires_at: OffsetDateTime,
}
