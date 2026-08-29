use std::sync::Arc;

use latex_renderer_backend::{
    compilation::{CompilationService, repository::PgCompilationRepository, worker},
    config::Config,
    documents::{DocumentService, repository::PgDocumentRepository},
};
use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "latex_renderer_backend=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();
    let config = Config::from_env()?;
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&config.database_url)
        .await?;
    let documents = Arc::new(DocumentService::new(Arc::new(PgDocumentRepository::new(
        pool.clone(),
    ))));
    let compilation =
        CompilationService::new(Arc::new(PgCompilationRepository::new(pool)), documents);
    worker::run(compilation, config).await?;
    Ok(())
}
