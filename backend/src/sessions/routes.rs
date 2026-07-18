use axum::{
    Json,
    extract::State,
    http::{HeaderMap, header},
};

use super::model::AnonymousSessionResponse;
use crate::{AppState, error::AppError};

pub async fn anonymous_session(
    State(state): State<AppState>,
) -> Result<Json<AnonymousSessionResponse>, AppError> {
    Ok(Json(state.sessions.create_anonymous().await?))
}

pub fn bearer_token(headers: &HeaderMap) -> Result<&str, AppError> {
    let value = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or(AppError::Unauthorized)?;
    value.strip_prefix("Bearer ").ok_or(AppError::Unauthorized)
}
