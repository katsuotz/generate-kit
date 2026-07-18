use axum::{
    Json,
    extract::{Path, State},
    http::{HeaderMap, StatusCode, header},
    response::Response,
};
use uuid::Uuid;

use super::model::{CompileJobResponse, CompileRequest};
use crate::sessions::routes::bearer_token;
use crate::{AppState, error::AppError};

pub async fn create_compile_job(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(document_id): Path<Uuid>,
    Json(request): Json<CompileRequest>,
) -> Result<(StatusCode, Json<CompileJobResponse>), AppError> {
    let session_id = state
        .sessions
        .authenticate_token(bearer_token(&headers)?)
        .await?;
    let job = state
        .compilation
        .create_job(
            session_id,
            document_id,
            request.revision_id,
            &request.profile,
        )
        .await?;
    Ok((StatusCode::ACCEPTED, Json(job)))
}

pub async fn get_compile_job(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(job_id): Path<Uuid>,
) -> Result<Json<CompileJobResponse>, AppError> {
    let session_id = state
        .sessions
        .authenticate_token(bearer_token(&headers)?)
        .await?;
    Ok(Json(state.compilation.get_job(session_id, job_id).await?))
}

pub async fn cancel_compile_job(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(job_id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let session_id = state
        .sessions
        .authenticate_token(bearer_token(&headers)?)
        .await?;
    state.compilation.cancel_job(session_id, job_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_artifact(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(artifact_id): Path<Uuid>,
) -> Result<Response, AppError> {
    let session_id = state
        .sessions
        .authenticate_token(bearer_token(&headers)?)
        .await?;
    let bytes = state
        .compilation
        .get_artifact(session_id, artifact_id)
        .await?;
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/pdf")
        .header(header::CONTENT_LENGTH, bytes.len())
        .body(axum::body::Body::from(bytes))
        .map_err(|error| AppError::Internal(error.to_string()))
}
