# LaTeX Renderer

LaTeX Renderer is a pnpm/Rust monorepo for editing LaTeX documents and previewing compiled PDFs. The current product is focused on CV workflows: the SvelteKit frontend provides the editor experience, while the Rust backend persists documents and queues isolated XeLaTeX compilation jobs.

## Repository layout

```text
.
├── frontend/       SvelteKit, Svelte 5, Tailwind CSS 4, CodeMirror, PDF.js
├── backend/        Rust/Axum API and PostgreSQL-backed compilation worker
├── docs/           Frontend plan, backend plan, and remaining work
├── package.json    Root pnpm workspace metadata
└── pnpm-lock.yaml  Shared JavaScript dependency lockfile
```

The backend remains a single Rust crate. Its code is organized by feature (`sessions`, `documents`, and `compilation`) with repositories for persistence and services for business logic. Redis is intentionally not required yet.

## Requirements

- Node.js with pnpm 10
- Rust and Cargo
- Docker Desktop with Compose

The development stack uses PostgreSQL 19 Beta 2. It is pre-release software and should be used for development and compatibility testing only.

## Local setup

Install frontend dependencies from the repository root:

```powershell
pnpm install
```

Create local environment files if they do not already exist:

```powershell
Copy-Item frontend/.env.example frontend/.env
Copy-Item backend/.env.example backend/.env
```

Environment files are ignored by Git. The committed `.env.example` files contain local-development placeholders only.

Start PostgreSQL, the API, and the XeLaTeX worker:

```powershell
Set-Location backend
docker compose --env-file .env up -d --build
Set-Location ..
```

The default local endpoints are:

- Frontend: `http://localhost:5173`
- API: `http://localhost:18732`
- PostgreSQL: `localhost:5434`

Start the frontend in another terminal:

```powershell
pnpm --dir frontend dev
```

Check the API health endpoints:

```powershell
Invoke-WebRequest http://localhost:18732/health/live
Invoke-WebRequest http://localhost:18732/health/ready
```

## Frontend commands

Run these from the repository root:

```powershell
pnpm --dir frontend check
pnpm --dir frontend lint
pnpm --dir frontend test
pnpm --dir frontend test:e2e
pnpm --dir frontend build
```

The frontend always uses the backend preview adapter and renders returned PDF artifacts with PDF.js. Playwright starts a deterministic HTTP fixture that implements the backend contract and returns a valid PDF artifact, so browser tests do not require a running compiler.

## Backend commands

Run these from the repository root:

```powershell
cargo fmt --manifest-path backend/Cargo.toml -- --check
cargo check --manifest-path backend/Cargo.toml --locked --all-targets
cargo test --manifest-path backend/Cargo.toml --locked
```

The Compose API and worker are built from `backend/Dockerfile`. The worker image includes XeLaTeX, the CV-oriented LaTeX packages, Font Awesome, Roboto, Roboto Slab, and related font discovery support. Compilation runs with `-no-shell-escape`, a bounded timeout, temporary workspaces, and cleanup.

## API surface

- `GET /health/live`
- `GET /health/ready`
- `POST /api/v1/sessions/anonymous`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET /api/v1/cv/session`
- `POST /api/v1/cv/session`
- `PUT /api/v1/cv/session`
- `POST /api/v1/projects`
- `POST /api/v1/projects/{project_id}/documents`
- `GET /api/v1/documents/{document_id}`
- `PUT /api/v1/documents/{document_id}`
- `POST /api/v1/documents/{document_id}/compile`
- `GET /api/v1/compile-jobs/{job_id}`
- `DELETE /api/v1/compile-jobs/{job_id}`
- `GET /api/v1/artifacts/{artifact_id}`

The frontend creates or restores an anonymous session, persists document revisions, starts a compile job, polls its status, maps diagnostics to editor locations, and renders the resulting PDF with PDF.js.

## Current scope

Implemented:

- Responsive LaTeX editor and PDF preview workspace
- Mouse and keyboard scrolling, pane resizing, and mobile pane navigation
- Tailwind CSS 4 utility-based styling
- Anonymous sessions and document/revision persistence
- PostgreSQL-backed compile jobs and bounded PDF artifacts
- Structured compiler diagnostics
- XeLaTeX CV profile with common CV packages and fonts

Deferred:

- Password reset, email verification, MFA, and role-based administration
- Active compiler-process cancellation and stronger resource isolation
- Artifact retention cleanup, quotas, and observability
- CI and production deployment configuration
- Richer document/project navigation

See [docs/what-left-to-do.md](docs/what-left-to-do.md) for the maintained backlog, [docs/frontend-plan.md](docs/frontend-plan.md) for frontend architecture, and [docs/backend-plan.md](docs/backend-plan.md) for backend architecture.

## Development notes

Do not commit `.env` files, dependencies, build output, test reports, logs, or generated screenshots. PostgreSQL Beta 2 uses a dedicated Compose volume because beta catalog versions are not guaranteed to be compatible across releases.
