# CV workflow load test

`cv-workflow.js` models persistent anonymous users against the backend API. Each VU bootstraps once, then repeats render, optimistic CV-session save, document save, and—when enabled—compile, poll, and artifact download.

## Prerequisites

- A running backend at `BASE_URL`.
- A migrated PostgreSQL database.
- Native [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) or Docker.
- For full mode, a running compilation worker with XeLaTeX and the CV assets available.

The script defaults to `http://localhost:18732` and uses bearer anonymous-session tokens. Set `ORIGIN` only when the backend is configured to allow that exact origin.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:18732` | Backend base URL |
| `TARGET_VUS` | `10` | Peak concurrent persistent users |
| `RAMP_UP` | `2m` | Ramp-up duration |
| `STEADY` | `5m` | Steady-state duration |
| `RAMP_DOWN` | `1m` | Ramp-down duration |
| `THINK_TIME_SECONDS` | `2` | User pause after each workflow |
| `COMPILE` | `true` | Run worker-backed compile and artifact steps |
| `ORIGIN` | unset | Optional HTTP `Origin` header |

The default thresholds are capacity-test SLOs: fewer than 1% failed HTTP requests, at least 99% successful workflows, at least 99% successful bootstraps, HTTP p95 below 1 second, and workflow p95 below 45 seconds. Full mode also requires at least 98% compile success and compile p95 below 35 seconds.

## Run with native k6

From the repository root:

```powershell
$env:BASE_URL = 'http://localhost:18732'
$env:TARGET_VUS = '25'
$env:COMPILE = 'false'
k6 run loadtest/cv-workflow.js
```

For a full worker-backed run, omit `COMPILE=false` and start the backend and worker with compiler support enabled, for example `LATEX_COMPILER_ENABLED=true` and a valid `LATEX_COMPILER_PATH` where the backend/worker environment requires it.

## Run with Docker

With the backend reachable from Docker Desktop at `host.docker.internal`:

```powershell
docker run --rm -i `
  -v "${PWD.Path}:/work" `
  -e BASE_URL=http://host.docker.internal:18732 `
  -e TARGET_VUS=25 `
  -e COMPILE=false `
  grafana/k6 run /work/loadtest/cv-workflow.js
```

On Linux, `--network host` and `BASE_URL=http://127.0.0.1:18732` are alternatives. The Docker image only runs k6; it does not provide PostgreSQL, the API, XeLaTeX, or the worker.

## API-only and full worker modes

API-only mode uses `COMPILE=false`. It measures anonymous sessions, template lookup, CV persistence, rendering, and document revision writes without creating compile jobs. This is useful for isolating API and database capacity.

Full mode uses the default `COMPILE=true`. It requires the worker and compiler stack, measures queueing and terminal-job latency, and downloads each successful PDF artifact. The current worker loop processes one compile job at a time, so full-mode capacity is expected to become queue-bound well before the API-only path. Compile artifacts and database rows accumulate during a run, so monitor storage and clean up test data according to the environment’s retention policy.

## Capacity runs on 4 CPU / 4 GB

Run k6 from a separate host or container when possible so the service’s 4 CPU / 4 GB budget is not shared with the load generator. Watch API and worker CPU saturation, resident memory and OOM events, PostgreSQL CPU/memory/connections/locks, request error rates, compile queue depth, compile duration, artifact storage, and host disk/network I/O. Keep enough memory for PostgreSQL and the worker; do not treat a swap-heavy run as capacity.

## Finding the maximum users

Start with `COMPILE=false` to establish API-only capacity. Increase `TARGET_VUS` in fixed steps, keep `STEADY` long enough to observe saturation, and record the highest level that meets every threshold with resource headroom. Repeat the process in full mode, then narrow the boundary with smaller steps or a binary search. Treat the result as the maximum sustainable concurrent VUs for this workflow and test duration, not as a universal user limit.

## Caveats

This is a backend capacity test, not a browser capacity test. It does not measure browser rendering, JavaScript execution, layout, PDF preview work, browser connection limits, or end-user device performance. It also uses bearer authentication rather than exercising browser cookie storage and frontend behavior. Validate browser and end-to-end capacity separately.
