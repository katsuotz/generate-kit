use std::sync::Arc;

use uuid::Uuid;

use super::{
    model::{DocumentResponse, ProjectResponse},
    repository::DocumentRepository,
};
use crate::error::AppError;
use crate::sessions::model::Principal;

pub struct DocumentService {
    repository: Arc<dyn DocumentRepository>,
}

impl DocumentService {
    pub fn new(repository: Arc<dyn DocumentRepository>) -> Self {
        Self { repository }
    }

    pub async fn create_project(
        &self,
        principal: &Principal,
        name: &str,
    ) -> Result<ProjectResponse, AppError> {
        validate_name(name, 120)?;
        self.repository.create_project(principal, name).await
    }

    pub async fn create_document(
        &self,
        principal: &Principal,
        project_id: Uuid,
        name: &str,
        source: &str,
    ) -> Result<DocumentResponse, AppError> {
        self.repository.project_owned(principal, project_id).await?;
        validate_name(name, 160)?;
        validate_source(source)?;
        self.repository
            .create_document(project_id, name, source)
            .await
    }

    pub async fn update_document(
        &self,
        principal: &Principal,
        document_id: Uuid,
        source: &str,
    ) -> Result<DocumentResponse, AppError> {
        self.repository
            .document_owned(principal, document_id)
            .await?;
        validate_source(source)?;
        self.repository.update_document(document_id, source).await
    }

    pub async fn get_document(
        &self,
        principal: &Principal,
        document_id: Uuid,
    ) -> Result<DocumentResponse, AppError> {
        self.repository.get_document(principal, document_id).await
    }

    pub async fn document_owned(
        &self,
        principal: &Principal,
        document_id: Uuid,
    ) -> Result<(), AppError> {
        self.repository.document_owned(principal, document_id).await
    }

    pub async fn revision_owned(
        &self,
        principal: &Principal,
        revision_id: Uuid,
    ) -> Result<(), AppError> {
        self.repository.revision_owned(principal, revision_id).await
    }

    pub async fn revision_document(&self, revision_id: Uuid) -> Result<(Uuid, String), AppError> {
        self.repository.revision_document(revision_id).await
    }
}

fn validate_name(value: &str, max: usize) -> Result<(), AppError> {
    if value.trim().is_empty() || value.chars().count() > max {
        return Err(AppError::BadRequest("name is empty or too long".into()));
    }
    Ok(())
}

fn validate_source(source: &str) -> Result<(), AppError> {
    if source.len() > 524_288 {
        return Err(AppError::BadRequest("source exceeds 512 KiB".into()));
    }
    Ok(())
}
