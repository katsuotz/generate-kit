# What’s left to do

The frontend foundation and backend-backed preview flow are implemented in `frontend/` and `backend/`. The repository is a pnpm/Rust monorepo with root workspace metadata and `pnpm-lock.yaml`. The mock adapter remains available for deterministic UI tests; the XeLaTeX worker is opt-in through the backend environment.

## Frontend foundation follow-up

- [ ] Decide whether drafts should remain ephemeral or persist locally/remotely.
- [ ] Add CI for `pnpm --filter @latex-renderer/frontend check`, `lint`, `test`, `test:e2e`, and `build`.
- [ ] Expand browser-level accessibility coverage and complete a screen-reader pass.
- [x] Replace the mock adapter with the backend job API and PDF.js artifact loading.
- [x] Map backend diagnostics to CodeMirror line/column locations; richer navigation remains follow-up work.
- [ ] Add document/project navigation only if multi-document editing is required.

## Backend and compiler integration

- [x] Create the backend service under `backend/` with Rust build/test conventions.
- [x] Add PostgreSQL 19 UUIDv7 migrations and persisted document/revision storage.
- [x] Add PostgreSQL-backed compile jobs, structured diagnostics, and artifact endpoints.
- [x] Pin the development XeLaTeX worker image with the CV package/font set and enable the `cv-xelatex` profile.
- [ ] Add active process cancellation, resource enforcement, retention cleanup, and quotas.
- [x] Choose PDF artifacts as the preview representation and render them with PDF.js.
- [x] Use queued PostgreSQL-backed compilation with frontend polling.
- [x] Define cancellation, timeout, stale-result, request-size, artifact-size, and response semantics for the first integration.
- [x] Define the initial `cv-xelatex` engine profile, package/font image, PDF output, and structured diagnostics.
- [ ] Design compiler isolation, filesystem restrictions, network policy, resource limits, and cleanup.
- [x] Implement the real frontend preview adapter against the backend contract.

## Product and operations

- [ ] Decide document persistence, authentication, authorization, retention, and quotas.
- [ ] Confirm deployment targets and environment configuration for `frontend/` and `backend/`.
- [ ] Add observability for compile latency, failures, cancellation, and resource usage.
- [ ] Establish error reporting and user-facing support flows.
- [ ] Define the minimum viable document model and any collaboration roadmap.
