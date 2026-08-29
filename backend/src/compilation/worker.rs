use std::sync::Arc;

use tokio::time::{Duration, Instant, sleep};
use tracing::info;

use super::{
    CompilationService,
    compiler::{Compiler, DisabledCompiler, XeLatexCompiler},
};
use crate::config::Config;

const STALE_RECOVERY_INTERVAL: Duration = Duration::from_secs(30);

pub async fn run(
    service: CompilationService,
    config: Config,
) -> Result<(), crate::error::AppError> {
    let compiler: Arc<dyn Compiler> = if config.compiler_enabled {
        Arc::new(XeLatexCompiler::new(&config))
    } else {
        Arc::new(DisabledCompiler)
    };
    info!(enabled = config.compiler_enabled, "compile worker started");
    let mut next_stale_recovery = Instant::now();

    loop {
        if Instant::now() >= next_stale_recovery {
            let recovered = service.recover_stale_jobs().await?;
            if recovered > 0 {
                tracing::warn!(count = recovered, "recovered stale compile jobs");
            }
            next_stale_recovery = Instant::now() + STALE_RECOVERY_INTERVAL;
        }
        if let Some((job_id, revision_id, _profile)) = service.claim_job().await? {
            if service.is_cancelled(job_id).await? {
                service.finish_job(job_id, &[], Some("CANCELLED")).await?;
                continue;
            }
            let source = service.source_for_revision(revision_id).await?;
            let output = compiler.compile(&source, job_id).await;
            if output.cancelled || service.is_cancelled(job_id).await? {
                service.finish_job(job_id, &[], Some("CANCELLED")).await?;
            } else if let Some(pdf) = output.pdf {
                service.save_artifact(job_id, &pdf, None).await?;
                service
                    .finish_job(job_id, &output.diagnostics, output.error_code.as_deref())
                    .await?;
            } else {
                service
                    .finish_job(job_id, &output.diagnostics, output.error_code.as_deref())
                    .await?;
            }
        } else {
            sleep(Duration::from_millis(500)).await;
        }
    }
}
