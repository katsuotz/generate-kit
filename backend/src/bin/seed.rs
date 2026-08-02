use latex_renderer_backend::{
    config::Config,
    sessions::{SessionService, repository::PgSessionRepository},
};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    let email = argument_or_env("--email", "SEED_EMAIL")?;
    let password = argument_or_env("--password", "SEED_PASSWORD")?;
    let config = Config::from_env()?;
    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect(&config.database_url)
        .await?;
    sqlx::migrate!("./migrations").run(&pool).await?;

    let service = SessionService::new(
        Arc::new(PgSessionRepository::new(pool.clone())),
        time::Duration::seconds(config.session_ttl.as_secs() as i64),
    );
    let account = service.seed_user(&email, &password).await?;
    let mut transaction = pool.begin().await?;
    let project_id: uuid::Uuid = if let Some(id) = sqlx::query_scalar(
        "SELECT id FROM projects WHERE user_id = $1 AND name = 'Demo CV' ORDER BY created_at LIMIT 1",
    )
    .bind(account.id)
    .fetch_optional(&mut *transaction)
    .await?
    {
        id
    } else {
        sqlx::query_scalar(
            "INSERT INTO projects (user_id, name) VALUES ($1, 'Demo CV') RETURNING id",
        )
        .bind(account.id)
        .fetch_one(&mut *transaction)
        .await?
    };
    let document_id: uuid::Uuid = if let Some(id) = sqlx::query_scalar(
        "SELECT id FROM documents WHERE project_id = $1 AND name = 'cv.tex' ORDER BY created_at LIMIT 1",
    )
    .bind(project_id)
    .fetch_optional(&mut *transaction)
    .await?
    {
        id
    } else {
        sqlx::query_scalar(
            "INSERT INTO documents (project_id, name) VALUES ($1, 'cv.tex') RETURNING id",
        )
        .bind(project_id)
        .fetch_one(&mut *transaction)
        .await?
    };
    let source = r#"\documentclass{article}\begin{document}Demo CV\end{document}"#;
    sqlx::query(
        "INSERT INTO document_revisions (document_id, revision_number, source) SELECT $1, 1, $2 WHERE NOT EXISTS (SELECT 1 FROM document_revisions WHERE document_id = $1)",
    )
    .bind(document_id)
    .bind(source)
    .execute(&mut *transaction)
    .await?;
    let data = serde_json::json!({
        "identity": {"fullName": "Demo Candidate", "professionalTitles": "Product engineer", "location": "Remote", "email": email, "phone": "", "profiles": []},
        "summary": "A deterministic sample CV for local development.",
        "experience": [], "achievements": [], "skills": [], "education": [], "certificates": [], "projects": []
    });
    sqlx::query(
        "INSERT INTO cv_drafts (project_id, document_id, schema_version, template_id, generated_template_id, data, generated_source, generated_at, fingerprint) VALUES ($1, $2, 1, 'editorial-v1', 'editorial-v1', $3, $4, now(), 'demo-seed') ON CONFLICT (document_id) DO UPDATE SET template_id = 'editorial-v1', generated_template_id = 'editorial-v1', data = EXCLUDED.data, generated_source = EXCLUDED.generated_source, generated_at = EXCLUDED.generated_at, fingerprint = EXCLUDED.fingerprint, updated_at = now()",
    )
    .bind(project_id)
    .bind(document_id)
    .bind(data)
    .bind(source)
    .execute(&mut *transaction)
    .await?;
    transaction.commit().await?;
    println!(
        "seeded account {} ({}) and demo CV",
        account.email, account.id
    );
    Ok(())
}

fn argument_or_env(
    argument: &str,
    environment: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    if let Some(index) = args.iter().position(|value| value == argument) {
        if let Some(value) = args.get(index + 1) {
            if !value.is_empty() {
                return Ok(value.clone());
            }
        }
        return Err(format!("missing value for {argument}").into());
    }
    std::env::var(environment)
        .map_err(|_| format!("set {environment} or pass {argument} VALUE").into())
}
