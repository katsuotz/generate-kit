use std::sync::Arc;

use uuid::Uuid;

use super::{
    model::{CompileJobResponse, Diagnostic},
    repository::CompilationRepository,
};
use crate::{documents::DocumentService, error::AppError};

#[derive(Clone)]
pub struct CompilationService {
    repository: Arc<dyn CompilationRepository>,
    documents: Arc<DocumentService>,
}

impl CompilationService {
    pub fn new(
        repository: Arc<dyn CompilationRepository>,
        documents: Arc<DocumentService>,
    ) -> Self {
        Self {
            repository,
            documents,
        }
    }

    pub async fn create_job(
        &self,
        session_id: Uuid,
        document_id: Uuid,
        revision_id: Uuid,
        profile: &str,
    ) -> Result<CompileJobResponse, AppError> {
        if profile != "cv-xelatex" {
            return Err(AppError::BadRequest("unsupported compile profile".into()));
        }
        self.documents
            .document_owned(session_id, document_id)
            .await?;
        self.documents
            .revision_owned(session_id, revision_id)
            .await?;
        let (revision_document, _) = self.documents.revision_document(revision_id).await?;
        if revision_document != document_id {
            return Err(AppError::BadRequest(
                "revision does not belong to document".into(),
            ));
        }
        let job_id = self.repository.create_job(revision_id, profile).await?;
        self.repository.get_job(job_id).await
    }

    pub async fn get_job(
        &self,
        session_id: Uuid,
        job_id: Uuid,
    ) -> Result<CompileJobResponse, AppError> {
        self.repository.job_owned(session_id, job_id).await?;
        self.repository.get_job(job_id).await
    }

    pub async fn cancel_job(&self, session_id: Uuid, job_id: Uuid) -> Result<(), AppError> {
        self.repository.job_owned(session_id, job_id).await?;
        self.repository.cancel_job(job_id).await
    }

    pub async fn get_artifact(
        &self,
        session_id: Uuid,
        artifact_id: Uuid,
    ) -> Result<Vec<u8>, AppError> {
        self.repository
            .artifact_owned(session_id, artifact_id)
            .await?;
        self.repository.get_artifact(artifact_id).await
    }

    pub async fn claim_job(&self) -> Result<Option<(Uuid, Uuid, String)>, AppError> {
        self.repository.claim_job().await
    }

    pub async fn source_for_revision(&self, revision_id: Uuid) -> Result<String, AppError> {
        self.documents
            .revision_document(revision_id)
            .await
            .map(|(_, source)| source)
    }

    pub async fn is_cancelled(&self, job_id: Uuid) -> Result<bool, AppError> {
        self.repository.is_cancelled(job_id).await
    }

    pub async fn finish_job(
        &self,
        job_id: Uuid,
        diagnostics: &[Diagnostic],
        error_code: Option<&str>,
    ) -> Result<(), AppError> {
        self.repository
            .finish_job(job_id, diagnostics, error_code)
            .await
    }

    pub async fn save_artifact(
        &self,
        job_id: Uuid,
        bytes: &[u8],
        page_count: Option<i32>,
    ) -> Result<(), AppError> {
        self.repository
            .save_artifact(job_id, bytes, page_count)
            .await
    }

    pub async fn recover_stale_jobs(&self) -> Result<u64, AppError> {
        self.repository.recover_stale_jobs().await
    }
}
