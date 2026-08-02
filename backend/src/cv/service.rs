use std::sync::Arc;

use time::{OffsetDateTime, format_description::well_known::Rfc3339};

use super::{
    model::{CvSessionResponse, SaveCvSessionInput, SaveCvSessionRequest},
    repository::CvRepository,
};
use crate::{error::AppError, sessions::model::Principal};

const MAX_DRAFT_BYTES: usize = 1_048_576;

pub struct CvService {
    repository: Arc<dyn CvRepository>,
}

impl CvService {
    pub fn new(repository: Arc<dyn CvRepository>) -> Self {
        Self { repository }
    }

    pub async fn get(&self, principal: &Principal) -> Result<Option<CvSessionResponse>, AppError> {
        self.repository.get(principal).await
    }

    pub async fn save(
        &self,
        principal: &Principal,
        request: SaveCvSessionRequest,
    ) -> Result<CvSessionResponse, AppError> {
        if request.version < 0 {
            return Err(AppError::BadRequest(
                "cv session version cannot be negative".into(),
            ));
        }
        if request.schema_version < 1 {
            return Err(AppError::BadRequest(
                "schema_version must be positive".into(),
            ));
        }
        if request.template_id.trim().is_empty() || request.template_id.len() > 64 {
            return Err(AppError::BadRequest("template_id is invalid".into()));
        }
        if !request.data.is_object() {
            return Err(AppError::BadRequest(
                "cv session data must be a JSON object".into(),
            ));
        }
        if serde_json::to_vec(&request.data)
            .map_err(|error| AppError::BadRequest(format!("invalid cv session data: {error}")))?
            .len()
            > MAX_DRAFT_BYTES
        {
            return Err(AppError::BadRequest("cv session data exceeds 1 MiB".into()));
        }
        if request
            .generated_source
            .as_ref()
            .is_some_and(|source| source.len() > 524_288)
        {
            return Err(AppError::BadRequest(
                "generated_source exceeds 512 KiB".into(),
            ));
        }
        if request
            .fingerprint
            .as_ref()
            .is_some_and(|fingerprint| fingerprint.len() > 128)
        {
            return Err(AppError::BadRequest("fingerprint is too long".into()));
        }
        let generated_at = request
            .generated_at
            .as_deref()
            .map(|value| {
                OffsetDateTime::parse(value, &Rfc3339)
                    .map_err(|_| AppError::BadRequest("generated_at must be RFC3339".into()))
            })
            .transpose()?;
        let expected_version = request.version;
        let input = SaveCvSessionInput {
            project_id: request.project_id,
            document_id: request.document_id,
            schema_version: request.schema_version,
            template_id: request.template_id,
            data: request.data,
            generated_source: request.generated_source,
            generated_at,
            fingerprint: request.fingerprint,
        };
        self.repository
            .save(principal, expected_version, &input)
            .await
    }
}
