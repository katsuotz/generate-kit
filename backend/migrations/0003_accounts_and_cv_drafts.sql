CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    email text NOT NULL UNIQUE CHECK (char_length(email) BETWEEN 3 AND 320),
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth_sessions (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash bytea NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz
);

CREATE INDEX auth_sessions_user_id_idx ON auth_sessions(user_id, created_at DESC);
CREATE INDEX auth_sessions_active_idx ON auth_sessions(token_hash, expires_at)
WHERE revoked_at IS NULL;

ALTER TABLE projects
    ALTER COLUMN session_id DROP NOT NULL,
    ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE projects
    ADD CONSTRAINT projects_single_owner_check
    CHECK ((session_id IS NULL) <> (user_id IS NULL));

CREATE INDEX projects_user_id_idx ON projects(user_id, updated_at DESC);

ALTER TABLE documents
    ADD CONSTRAINT documents_id_project_key UNIQUE (id, project_id);

CREATE TABLE cv_drafts (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_id uuid NOT NULL,
    schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    template_id text NOT NULL DEFAULT 'default' CHECK (char_length(template_id) BETWEEN 1 AND 64),
    generated_source text CHECK (generated_source IS NULL OR octet_length(generated_source) <= 524288),
    generated_at timestamptz,
    fingerprint text CHECK (fingerprint IS NULL OR char_length(fingerprint) <= 128),
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(data::text) <= 1048576),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT cv_drafts_document_project_fk
        FOREIGN KEY (document_id, project_id) REFERENCES documents(id, project_id)
);

CREATE UNIQUE INDEX cv_drafts_document_id_idx ON cv_drafts(document_id);
CREATE INDEX cv_drafts_project_id_idx ON cv_drafts(project_id, updated_at DESC);
