# Frontend plan: split LaTeX editor and preview

## Status and repository layout

The first frontend foundation is implemented in `frontend/` as a SvelteKit application. Workspace metadata and the single pnpm lockfile remain at the repository root, frontend application and tooling files live under `frontend/`, and backend code belongs under `backend/`.

The app is a SvelteKit workspace with a backend-backed document and compile flow. The application has one preview path: generated TeX is sent to the backend and the returned PDF artifact is displayed with PDF.js. Run frontend scripts from the repository root with `pnpm --dir frontend <script>` or `pnpm --filter @latex-renderer/frontend <script>`.

## Implemented foundation

- SvelteKit route shell and responsive editor/preview workspace.
- Tailwind CSS 4 utility-first styling with global CSS limited to base tokens, resets, and animation primitives.
- CodeMirror-based LaTeX source editor with line highlighting for selected diagnostics.
- Desktop split panes with pointer resizing, keyboard resizing, and reset behavior.
- Mobile editor/preview pane navigation.
- Toolbar with dirty-state indication, preview action, status feedback, and keyboard shortcut.
- Preview states for idle, loading, success, empty, and structured failure.
- Typed `PreviewAdapter` boundary and `BackendPreviewAdapter` for document persistence, compile-job polling, diagnostics, and PDF artifact loading.
- Anonymous session bootstrap, project/document restoration, revision persistence, compile-job polling/cancellation, structured diagnostics, and authenticated PDF artifact loading through the backend API.
- PDF.js rendering for backend-produced PDF previews; deterministic Playwright tests use an HTTP fixture that implements the same backend contract and returns a valid PDF.
- Preview controller cancellation and monotonically increasing request IDs so stale results cannot replace newer state; the last successful preview remains available when a later request fails.
- Structured diagnostics and live status announcements.
- Unit/component tests and a Playwright accessibility/workspace smoke-test foundation.

The adapter seam keeps transport and compiler details out of the Svelte components. Real TeX semantics, package support, PDF loading, and network persistence are provided by the backend integration.

## Goals for the next frontend phases

- Keep source editing and rendered output visibly associated, including useful compiler feedback.
- Preserve the adapter and workspace state boundaries while the backend contract is integrated.
- Keep the responsive and keyboard-accessible workflow usable as the preview representation changes.
- Avoid embedding transport, compiler, or deployment assumptions in Svelte components.

## Architecture and integration boundary

- Keep route-level SvelteKit entry points thin and organize workspace behavior under `frontend/src/lib/`.
- Keep editor, preview, toolbar, diagnostics, and responsive navigation as separate feature components.
- Keep workspace state responsible for source, dirty state, selected pane, split size, request status, last successful result, and diagnostics.
- Keep preview orchestration dependent on `PreviewAdapter`, not on HTTP or process-spawning details.
- Keep browser tests deterministic with the test-only backend HTTP fixture while application code always uses `BackendPreviewAdapter` and `PUBLIC_API_BASE_URL`.
- Treat backend-generated HTML or artifact content as untrusted at the rendering boundary; define sanitization and artifact-loading rules before integration.

## Backend integration

The backend defines an asynchronous job API, structured diagnostics, bounded PDF artifacts, and the `cv-xelatex` profile. The frontend production adapter persists revisions, polls and cancels jobs, maps diagnostics to editor locations, and loads completed PDF artifacts through PDF.js.

## Remaining frontend work

- Decide whether drafts should gain richer local/remote persistence beyond the current anonymous workspace restoration.
- Improve diagnostic navigation and map backend file/line/column locations to richer CodeMirror decorations.
- Add document/project navigation only if the product requires multiple documents.
- Expand responsive, keyboard, and screen-reader verification, including browser-level accessibility checks.
- Add CI that runs the frontend checks from the monorepo root.

## Verification expectations

From the repository root, the frontend package should pass:

- `pnpm --filter @latex-renderer/frontend check`
- `pnpm --filter @latex-renderer/frontend lint`
- `pnpm --filter @latex-renderer/frontend test`
- `pnpm --filter @latex-renderer/frontend test:e2e`
- `pnpm --filter @latex-renderer/frontend build`

Keep the deterministic backend HTTP fixture for UI tests. Full compile integration tests may use the Compose worker and must not require a developer's host LaTeX installation.

## Acceptance criteria for real integration

- The frontend uses the agreed adapter contract without coupling components to transport details.
- Editing source visibly marks the draft and a user-triggered preview exposes loading, success, empty, and structured error states.
- Stale or failed requests cannot replace a newer successful result, and failed compilation does not erase the last known preview without clear labeling.
- Core workspace actions, pane navigation, resizing, focus, and status announcements remain keyboard accessible.
- Frontend checks and contract-backed integration coverage pass in CI.
