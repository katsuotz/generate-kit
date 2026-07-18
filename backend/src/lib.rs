pub mod compilation;
pub mod config;
pub mod documents;
pub mod error;
pub mod sessions;

use std::sync::Arc;

use axum::{
    Router,
    http::{Method, header},
    routing::{get, post},
};
use sqlx::PgPool;
use tower_http::{cors::CorsLayer, timeout::TimeoutLayer, trace::TraceLayer};

use compilation::{CompilationService, repository::PgCompilationRepository};
use config::Config;
use documents::{DocumentService, repository::PgDocumentRepository};
use sessions::{SessionService, repository::PgSessionRepository};

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub sessions: Arc<SessionService>,
    pub documents: Arc<DocumentService>,
    pub compilation: Arc<CompilationService>,
}

pub fn router(pool: PgPool, config: Config) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(config.frontend_origin.clone())
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE]);
    let sessions = Arc::new(SessionService::new(
        Arc::new(PgSessionRepository::new(pool.clone())),
        time::Duration::seconds(config.session_ttl.as_secs() as i64),
    ));
    let documents = Arc::new(DocumentService::new(Arc::new(PgDocumentRepository::new(
        pool.clone(),
    ))));
    let compilation = Arc::new(CompilationService::new(
        Arc::new(PgCompilationRepository::new(pool.clone())),
        documents.clone(),
    ));
    let state = AppState {
        pool,
        sessions,
        documents,
        compilation,
    };
    Router::new()
        .route("/health/live", get(live))
        .route("/health/ready", get(ready))
        .route(
            "/api/v1/sessions/anonymous",
            post(sessions::routes::anonymous_session),
        )
        .route("/api/v1/projects", post(documents::routes::create_project))
        .route(
            "/api/v1/projects/{project_id}/documents",
            post(documents::routes::create_document),
        )
        .route(
            "/api/v1/documents/{document_id}",
            get(documents::routes::get_document).put(documents::routes::update_document),
        )
        .route(
            "/api/v1/documents/{document_id}/compile",
            post(compilation::routes::create_compile_job),
        )
        .route(
            "/api/v1/compile-jobs/{job_id}",
            get(compilation::routes::get_compile_job)
                .delete(compilation::routes::cancel_compile_job),
        )
        .route(
            "/api/v1/artifacts/{artifact_id}",
            get(compilation::routes::get_artifact),
        )
        .with_state(state)
        .layer(TimeoutLayer::with_status_code(
            axum::http::StatusCode::REQUEST_TIMEOUT,
            std::time::Duration::from_secs(10),
        ))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
}

async fn live() -> axum::http::StatusCode {
    axum::http::StatusCode::NO_CONTENT
}

async fn ready(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> Result<axum::http::StatusCode, error::AppError> {
    sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(&state.pool)
        .await?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}
