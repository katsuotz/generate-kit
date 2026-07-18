use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
}

#[derive(Clone, Debug, Deserialize)]
pub struct CreateDocumentRequest {
    pub name: String,
    pub source: String,
}

#[derive(Clone, Debug, Deserialize)]
pub struct UpdateDocumentRequest {
    pub source: String,
}

#[derive(Clone, Debug, Serialize, sqlx::FromRow)]
pub struct ProjectResponse {
    pub id: Uuid,
    pub name: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct DocumentResponse {
    pub id: Uuid,
    pub project_id: Uuid,
    pub name: String,
    pub revision_id: Uuid,
    pub revision_number: i64,
    pub source: String,
}
