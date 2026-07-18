# LaTeX Renderer backend

Rust/Axum service for persisted CV documents and isolated LaTeX compilation.

The source is feature-based: `sessions`, `documents`, and `compilation`. Each feature contains its models, routes, repository, and service. PostgreSQL repositories implement small feature-specific traits, and services are constructed with those traits so the HTTP and worker entry points share the same use cases without adding unnecessary abstraction layers.

## Local development

Start the backend stack from the repository root:

```powershell
docker compose --env-file .env up -d
```

The API host port is configured in `.env` via `API_PORT` and defaults to `18732`. `FRONTEND_ORIGIN` controls the single browser origin allowed by CORS. Keep `../frontend/.env` in sync if you change the API port. Run Compose from this directory so it reads the backend `.env` directly.

Beta 2 uses a separate Docker volume because PostgreSQL beta catalog versions are not directly compatible across beta releases. Existing data must be migrated with PostgreSQL upgrade tooling or `pg_dump`/`pg_restore`.

Run the API:

```powershell
Set-Location backend
cargo run --bin latex-renderer-backend
```

Run the worker:

```powershell
Set-Location backend
cargo run --bin latex-renderer-worker
```

Host-side worker runs keep compilation disabled unless `LATEX_COMPILER_ENABLED=true` and `LATEX_COMPILER_PATH` point to an installed XeLaTeX environment. The Compose worker uses the dedicated `worker` image target, which contains XeLaTeX, LaTeX extras, and CV-oriented fonts and enables compilation. The API image does not contain TeX. Normal API and database tests do not require TeX.

## API

- `GET /health/live`
- `GET /health/ready`
- `POST /api/v1/sessions/anonymous`
- `POST /api/v1/projects`
- `POST /api/v1/projects/{project_id}/documents`
- `GET /api/v1/documents/{document_id}`
- `PUT /api/v1/documents/{document_id}`
- `POST /api/v1/documents/{document_id}/compile`
- `GET /api/v1/compile-jobs/{job_id}`
- `DELETE /api/v1/compile-jobs/{job_id}`
- `GET /api/v1/artifacts/{artifact_id}`

All application identifiers are PostgreSQL UUIDv7 values generated with `uuidv7()`.
