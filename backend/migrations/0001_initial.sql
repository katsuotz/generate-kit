CREATE TYPE compile_job_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');

CREATE TABLE anonymous_sessions (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    token_hash bytea NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz
);

CREATE TABLE projects (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    session_id uuid NOT NULL REFERENCES anonymous_sessions(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX projects_session_id_idx ON projects(session_id, updated_at DESC);

CREATE TABLE documents (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX documents_project_id_idx ON documents(project_id, updated_at DESC);

CREATE TABLE document_revisions (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    revision_number bigint NOT NULL CHECK (revision_number > 0),
    source text NOT NULL CHECK (octet_length(source) <= 524288),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(document_id, revision_number)
);

CREATE INDEX document_revisions_document_id_idx ON document_revisions(document_id, revision_number DESC);

CREATE TABLE compile_jobs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    revision_id uuid NOT NULL REFERENCES document_revisions(id) ON DELETE CASCADE,
    profile text NOT NULL CHECK (profile = 'cv-xelatex'),
    status compile_job_status NOT NULL DEFAULT 'queued',
    diagnostics jsonb NOT NULL DEFAULT '[]'::jsonb,
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    requested_at timestamptz NOT NULL DEFAULT now(),
    started_at timestamptz,
    finished_at timestamptz,
    cancellation_requested_at timestamptz,
    error_code text
);

CREATE INDEX compile_jobs_queue_idx ON compile_jobs(status, requested_at)
WHERE status = 'queued';
CREATE INDEX compile_jobs_revision_idx ON compile_jobs(revision_id, requested_at DESC);

CREATE TABLE compile_artifacts (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    job_id uuid NOT NULL UNIQUE REFERENCES compile_jobs(id) ON DELETE CASCADE,
    media_type text NOT NULL CHECK (media_type = 'application/pdf'),
    bytes bytea NOT NULL CHECK (octet_length(bytes) <= 10485760),
    sha256 bytea NOT NULL CHECK (octet_length(sha256) = 32),
    page_count integer CHECK (page_count IS NULL OR page_count > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
);

CREATE INDEX compile_artifacts_expiry_idx ON compile_artifacts(expires_at);
