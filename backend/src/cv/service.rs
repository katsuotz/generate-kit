use std::sync::Arc;

use time::{OffsetDateTime, format_description::well_known::Rfc3339};

use super::{
    model::{
        CvSessionResponse, RenderCvRequest, RenderCvResponse, SaveCvSessionInput,
        SaveCvSessionRequest, TemplateCatalogItem,
    },
    repository::{CvRepository, CvTemplateRepository},
    template,
};
use crate::{error::AppError, sessions::model::Principal};

const MAX_DRAFT_BYTES: usize = 1_048_576;

pub struct CvService {
    repository: Arc<dyn CvRepository>,
    templates: Arc<CvTemplateService>,
}

impl CvService {
    pub fn new(repository: Arc<dyn CvRepository>, templates: Arc<CvTemplateService>) -> Self {
        Self {
            repository,
            templates,
        }
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
        let template_id = template::normalize_template_id(&request.template_id);
        if template_id.trim().is_empty() || template_id.len() > 64 {
            return Err(AppError::BadRequest("template_id is invalid".into()));
        }
        self.templates.require_active(template_id).await?;
        let generated_template_id = request
            .generated_template_id
            .as_deref()
            .or_else(|| {
                request
                    .generated_source
                    .as_ref()
                    .map(|_| request.template_id.as_str())
            })
            .map(template::normalize_template_id)
            .map(str::to_owned)
            .filter(|_| request.generated_source.is_some());
        if let Some(generated_template_id) = generated_template_id.as_deref() {
            if generated_template_id.len() > 64 {
                return Err(AppError::BadRequest(
                    "generated_template_id is invalid".into(),
                ));
            }
            self.templates.require_active(generated_template_id).await?;
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
            template_id: template_id.to_owned(),
            generated_template_id,
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

#[derive(Clone)]
pub struct CvTemplateService {
    repository: Arc<dyn CvTemplateRepository>,
}

impl CvTemplateService {
    pub fn new(repository: Arc<dyn CvTemplateRepository>) -> Self {
        Self { repository }
    }

    pub async fn catalog(&self) -> Result<Vec<TemplateCatalogItem>, AppError> {
        Ok(self
            .repository
            .list_active()
            .await?
            .into_iter()
            .map(|template| TemplateCatalogItem {
                id: template.id.clone(),
                name: template.name,
                description: template.description,
                display_order: template.display_order,
                active: template.active,
                preview_asset: template.preview_asset,
                preview_url: Some(format!("/api/v1/cv/templates/{}/preview", template.id)),
            })
            .collect())
    }

    pub async fn require_active(
        &self,
        requested_id: &str,
    ) -> Result<super::model::CvTemplateRecord, AppError> {
        let id = template::normalize_template_id(requested_id);
        self.repository
            .get_active(id)
            .await?
            .ok_or_else(|| AppError::BadRequest("unknown or inactive CV template".into()))
    }

    pub async fn preview(
        &self,
        requested_id: &str,
    ) -> Result<(&'static [u8], &'static str), AppError> {
        let record = self.require_active(requested_id).await?;
        template::preview_asset(&record.preview_asset).ok_or(AppError::NotFound)
    }
}

pub struct CvRenderService {
    templates: Arc<CvTemplateService>,
}

impl CvRenderService {
    pub fn new(templates: Arc<CvTemplateService>) -> Self {
        Self { templates }
    }

    pub async fn render(&self, request: RenderCvRequest) -> Result<RenderCvResponse, AppError> {
        let requested_id = template::normalize_template_id(&request.template_id);
        let record = self.templates.require_active(requested_id).await?;
        let data = template::parse_cv_data(&request.data)?;
        let generated_at = OffsetDateTime::now_utc();
        let source = template::render_template_asset(&record.source_asset, &data, generated_at)?;
        if source.len() > template::MAX_RENDER_SOURCE_BYTES {
            return Err(AppError::BadRequest(
                "generated LaTeX exceeds 512 KiB".into(),
            ));
        }
        Ok(RenderCvResponse {
            template_id: record.id,
            source: source.clone(),
            generated_at: generated_at
                .format(&Rfc3339)
                .map_err(|error| AppError::Internal(error.to_string()))?,
        })
    }
}
