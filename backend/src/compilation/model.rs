use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Deserialize)]
pub struct CompileRequest {
    pub revision_id: Uuid,
    pub profile: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct CompileJobResponse {
    pub id: Uuid,
    pub revision_id: Uuid,
    pub profile: String,
    pub status: String,
    pub diagnostics: Vec<Diagnostic>,
    pub artifact: Option<ArtifactResponse>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Diagnostic {
    pub severity: String,
    pub code: String,
    pub message: String,
    pub file: Option<String>,
    pub line: Option<u32>,
    pub column: Option<u32>,
}

#[derive(Clone, Debug, Serialize)]
pub struct ArtifactResponse {
    pub id: Uuid,
    pub media_type: String,
    pub bytes: usize,
    pub page_count: Option<i32>,
}
