use axum::{
    Json,
    extract::{Path, State},
    http::HeaderMap,
};
use uuid::Uuid;

use super::model::{
    CreateDocumentRequest, CreateProjectRequest, DocumentResponse, ProjectResponse,
    UpdateDocumentRequest,
};
use crate::sessions::routes::validate_origin;
use crate::{AppState, error::AppError};

pub async fn create_project(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<CreateProjectRequest>,
) -> Result<Json<ProjectResponse>, AppError> {
    validate_origin(&headers, &state.config, true)?;
    let principal = state.sessions.authenticate(&headers).await?;
    Ok(Json(
        state
            .documents
            .create_project(&principal, &request.name)
            .await?,
    ))
}

pub async fn create_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(project_id): Path<Uuid>,
    Json(request): Json<CreateDocumentRequest>,
) -> Result<Json<DocumentResponse>, AppError> {
    validate_origin(&headers, &state.config, true)?;
    let principal = state.sessions.authenticate(&headers).await?;
    Ok(Json(
        state
            .documents
            .create_document(&principal, project_id, &request.name, &request.source)
            .await?,
    ))
}

pub async fn update_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(document_id): Path<Uuid>,
    Json(request): Json<UpdateDocumentRequest>,
) -> Result<Json<DocumentResponse>, AppError> {
    validate_origin(&headers, &state.config, true)?;
    let principal = state.sessions.authenticate(&headers).await?;
    Ok(Json(
        state
            .documents
            .update_document(&principal, document_id, &request.source)
            .await?,
    ))
}

pub async fn get_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(document_id): Path<Uuid>,
) -> Result<Json<DocumentResponse>, AppError> {
    let principal = state.sessions.authenticate(&headers).await?;
    Ok(Json(
        state
            .documents
            .get_document(&principal, document_id)
            .await?,
    ))
}
