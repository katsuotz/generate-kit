use axum::{Json, extract::State, http::StatusCode};

use super::model::{CvSessionResponse, SaveCvSessionRequest};
use crate::sessions::routes::validate_origin;
use crate::{AppState, error::AppError};

pub async fn get_session(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
) -> Result<Json<CvSessionResponse>, AppError> {
    let principal = state.sessions.authenticate(&headers).await?;
    state
        .cv
        .get(&principal)
        .await?
        .map(Json)
        .ok_or(AppError::NotFound)
}

pub async fn save_session(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(request): Json<SaveCvSessionRequest>,
) -> Result<(StatusCode, Json<CvSessionResponse>), AppError> {
    validate_origin(&headers, &state.config, true)?;
    let principal = state.sessions.authenticate(&headers).await?;
    let created = request.version == 0 && state.cv.get(&principal).await?.is_none();
    let session = state.cv.save(&principal, request).await?;
    Ok((
        if created {
            StatusCode::CREATED
        } else {
            StatusCode::OK
        },
        Json(session),
    ))
}

pub async fn get_draft(
    state: State<crate::AppState>,
    headers: axum::http::HeaderMap,
) -> Result<Json<CvSessionResponse>, AppError> {
    get_session(state, headers).await
}

pub async fn save_draft(
    state: State<crate::AppState>,
    headers: axum::http::HeaderMap,
    request: Json<SaveCvSessionRequest>,
) -> Result<(StatusCode, Json<CvSessionResponse>), AppError> {
    save_session(state, headers, request).await
}
