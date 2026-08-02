use serde::{Deserialize, Serialize};
use serde_json::Value;
use time::OffsetDateTime;
use uuid::Uuid;

fn default_schema_version() -> i32 {
    1
}

fn default_template_id() -> String {
    "default".into()
}

#[derive(Clone, Debug, Deserialize)]
pub struct SaveCvSessionRequest {
    pub project_id: Option<Uuid>,
    pub document_id: Option<Uuid>,
    #[serde(default = "default_schema_version")]
    pub schema_version: i32,
    #[serde(default = "default_template_id")]
    pub template_id: String,
    pub data: Value,
    pub generated_source: Option<String>,
    pub generated_at: Option<String>,
    pub fingerprint: Option<String>,
    #[serde(default, alias = "expected_version", alias = "base_version")]
    pub version: i64,
}

#[derive(Clone, Debug)]
pub struct SaveCvSessionInput {
    pub project_id: Option<Uuid>,
    pub document_id: Option<Uuid>,
    pub schema_version: i32,
    pub template_id: String,
    pub data: Value,
    pub generated_source: Option<String>,
    pub generated_at: Option<OffsetDateTime>,
    pub fingerprint: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct ProjectMetadata {
    pub id: Uuid,
    pub name: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct RevisionMetadata {
    pub id: Uuid,
    pub number: i64,
    pub created_at: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct DocumentMetadata {
    pub id: Uuid,
    pub name: String,
    pub updated_at: String,
    pub latest_revision: Option<RevisionMetadata>,
}

#[derive(Clone, Debug, Serialize)]
pub struct CvSessionResponse {
    pub id: Uuid,
    pub project_id: Uuid,
    pub document_id: Uuid,
    pub project: ProjectMetadata,
    pub document: DocumentMetadata,
    pub latest_revision_id: Option<Uuid>,
    pub latest_revision_number: Option<i64>,
    pub latest_revision_created_at: Option<String>,
    pub schema_version: i32,
    pub template_id: String,
    pub data: Value,
    pub generated_source: Option<String>,
    pub generated_at: Option<String>,
    pub fingerprint: Option<String>,
    pub version: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_optimistic_version_aliases_and_defaults() {
        let request: SaveCvSessionRequest = serde_json::from_value(serde_json::json!({
            "data": {"identity": {}},
            "expected_version": 4
        }))
        .unwrap();
        assert_eq!(request.version, 4);
        assert_eq!(request.schema_version, 1);
        assert_eq!(request.template_id, "default");
    }
}
