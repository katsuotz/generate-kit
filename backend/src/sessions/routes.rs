use axum::{
    Json,
    extract::State,
    http::{HeaderMap, HeaderValue, StatusCode, header},
};

use super::{
    model::{AccountResponse, AnonymousSessionResponse, LoginRequest, Principal, RegisterRequest},
    service::{ANONYMOUS_COOKIE, AUTH_COOKIE, bearer_token as parsed_bearer_token, cookie_value},
};
use crate::{AppState, config::Config, error::AppError};

pub async fn anonymous_session(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<(HeaderMap, Json<AnonymousSessionResponse>), AppError> {
    validate_origin(&headers, &state.config, true)?;
    let session = state.sessions.create_anonymous().await?;
    let mut response_headers = HeaderMap::new();
    response_headers.append(
        header::SET_COOKIE,
        cookie_header(
            ANONYMOUS_COOKIE,
            &session.token,
            state.config.session_ttl.as_secs(),
            state.config.cookie_secure,
        )?,
    );
    Ok((response_headers, Json(session)))
}

pub async fn register(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<RegisterRequest>,
) -> Result<(HeaderMap, Json<AccountResponse>), AppError> {
    validate_origin(&headers, &state.config, true)?;
    let transfer_session_id = match supplied_principal(&state, &headers).await? {
        Some(Principal::Anonymous { session_id }) => Some(session_id),
        Some(Principal::User { .. }) => {
            return Err(AppError::Conflict("an account is already signed in".into()));
        }
        None => None,
    };
    let session = state
        .sessions
        .register(&request.email, &request.password, transfer_session_id)
        .await?;
    Ok((
        auth_cookie_headers(&state.config, &session.token),
        Json(session.account),
    ))
}

pub async fn login(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<LoginRequest>,
) -> Result<(HeaderMap, Json<AccountResponse>), AppError> {
    validate_origin(&headers, &state.config, true)?;
    let session = state
        .sessions
        .login(&request.email, &request.password)
        .await?;
    Ok((
        auth_cookie_headers(&state.config, &session.token),
        Json(session.account),
    ))
}

pub async fn logout(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<(HeaderMap, StatusCode), AppError> {
    validate_origin(&headers, &state.config, true)?;
    state.sessions.logout(&headers).await?;
    Ok((clear_cookie_headers(&state.config), StatusCode::NO_CONTENT))
}

pub async fn me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AccountResponse>, AppError> {
    let principal = state.sessions.authenticate(&headers).await?;
    Ok(Json(state.sessions.account(&principal).await?))
}

pub fn validate_origin(
    headers: &HeaderMap,
    config: &Config,
    state_changing: bool,
) -> Result<(), AppError> {
    if !state_changing {
        return Ok(());
    }
    if let Some(origin) = headers.get(header::ORIGIN) {
        if !config.origin_is_allowed(origin) {
            return Err(AppError::Forbidden);
        }
    }
    Ok(())
}

pub fn bearer_token(headers: &HeaderMap) -> Result<&str, AppError> {
    parsed_bearer_token(headers).ok_or(AppError::Unauthorized)
}

pub fn auth_cookie_headers(config: &Config, token: &str) -> HeaderMap {
    let mut headers = HeaderMap::new();
    if let Ok(cookie) = cookie_header(
        AUTH_COOKIE,
        token,
        config.session_ttl.as_secs(),
        config.cookie_secure,
    ) {
        headers.append(header::SET_COOKIE, cookie);
    }
    headers
}

fn clear_cookie_headers(config: &Config) -> HeaderMap {
    let mut headers = HeaderMap::new();
    if let Ok(cookie) = cookie_header(AUTH_COOKIE, "", 0, config.cookie_secure) {
        headers.append(header::SET_COOKIE, cookie);
    }
    headers
}

fn cookie_header(
    name: &str,
    value: &str,
    max_age_seconds: u64,
    secure: bool,
) -> Result<HeaderValue, AppError> {
    let secure_suffix = if secure { "; Secure" } else { "" };
    let value = format!(
        "{name}={value}; Path=/; HttpOnly; SameSite=Lax; Max-Age={max_age_seconds}{secure_suffix}"
    );
    HeaderValue::try_from(value).map_err(|error| AppError::Internal(error.to_string()))
}

async fn supplied_principal(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<Option<Principal>, AppError> {
    let supplied = headers.contains_key(header::AUTHORIZATION)
        || cookie_value(headers, AUTH_COOKIE).is_some()
        || cookie_value(headers, ANONYMOUS_COOKIE).is_some();
    if supplied {
        Ok(Some(state.sessions.authenticate(headers).await?))
    } else {
        Ok(None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{net::SocketAddr, path::PathBuf, time::Duration};

    fn config() -> Config {
        Config {
            database_url: "postgres://localhost/test".into(),
            bind_addr: SocketAddr::from(([127, 0, 0, 1], 1)),
            frontend_origin: "http://localhost:5173".parse().unwrap(),
            compiler_enabled: false,
            compiler_path: PathBuf::from("xelatex"),
            compile_timeout: Duration::from_secs(30),
            session_ttl: Duration::from_secs(3600),
            cookie_secure: false,
        }
    }

    #[test]
    fn rejects_cross_origin_state_changes() {
        let mut headers = HeaderMap::new();
        headers.insert(header::ORIGIN, "https://evil.example".parse().unwrap());
        assert!(matches!(
            validate_origin(&headers, &config(), true),
            Err(AppError::Forbidden)
        ));
    }

    #[test]
    fn allows_requests_without_origin_for_non_browser_clients() {
        let headers = HeaderMap::new();
        assert!(validate_origin(&headers, &config(), true).is_ok());
    }
}
