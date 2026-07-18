use std::sync::Arc;

use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use rand::RngCore;
use sha2::{Digest, Sha256};
use time::{Duration, OffsetDateTime};
use uuid::Uuid;

use super::{model::AnonymousSessionResponse, repository::SessionRepository};
use crate::error::AppError;

pub struct SessionService {
    repository: Arc<dyn SessionRepository>,
    ttl: Duration,
}

impl SessionService {
    pub fn new(repository: Arc<dyn SessionRepository>, ttl: Duration) -> Self {
        Self { repository, ttl }
    }

    pub async fn create_anonymous(&self) -> Result<AnonymousSessionResponse, AppError> {
        let mut bytes = [0_u8; 32];
        rand::rng().fill_bytes(&mut bytes);
        let token = URL_SAFE_NO_PAD.encode(bytes);
        let hash = Sha256::digest(token.as_bytes());
        let expires_at = OffsetDateTime::now_utc() + self.ttl;
        let session_id = self.repository.create(hash.as_slice(), expires_at).await?;

        Ok(AnonymousSessionResponse {
            session_id,
            token,
            expires_at,
        })
    }

    pub async fn authenticate_token(&self, token: &str) -> Result<Uuid, AppError> {
        let hash = Sha256::digest(token.as_bytes());
        self.repository.find_active(hash.as_slice()).await
    }
}
