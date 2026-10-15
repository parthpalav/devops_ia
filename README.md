# OpsDesk — Containerized Automated End-to-End Testing & CI Quality Gate

**Containerized Automated End-to-End Testing and CI Quality Validation of a Full-Stack Web Application using Playwright and Docker.**

| | |
| --- | --- |
| **Primary tool** | Playwright (end-to-end browser testing) |
| **Supporting DevOps tools** | Docker, Docker Compose, GitHub Actions, Git |
| **System under test** | OpsDesk: a support-ticket portal (React + Vite + TypeScript, Node.js/Express, PostgreSQL) |
| **One-command demo** | `./scripts/demo.sh full` (Bash) or `./scripts/demo.ps1 full` (PowerShell) |

The application is containerized together with its whole end-to-end test environment. Docker Compose
starts the services in health-checked order. Playwright then runs real browser journeys in its own container.
**The Playwright container's exit code is the quality gate**, both locally and in GitHub Actions.

---

## Contents

1. [Problem statement](#1-problem-statement)
2. [Architecture](#2-architecture)
3. [Technologies](#3-technologies)
4. [Prerequisites](#4-prerequisites)
5. [Quick start](#5-quick-start)
6. [Demo credentials](#6-demo-credentials)
7. [Development: start the application](#7-development-start-the-application)
8. [Running the tests (quality gate)](#8-running-the-tests-quality-gate)
9. [The full demonstration](#9-the-full-demonstration)
10. [Fault injection](#10-fault-injection)
11. [Viewing reports, screenshots, videos and traces](#11-viewing-reports-screenshots-videos-and-traces)
12. [GitHub Actions](#12-github-actions)
13. [Troubleshooting](#13-troubleshooting)
14. [Project structure](#14-project-structure)
15. [Assignment / presentation guide](#15-assignment--presentation-guide)
16. [Design decisions and deviations from the specification](#16-design-decisions-and-deviations-from-the-specification)

---

## 1. Problem statement

Modern applications consist of several services: a UI, an API and a database. Testing every change by hand is slow
and inconsistent. Tests also behave differently between machines, because operating-system packages, browser versions,
runtimes, environment variables and service start-up timing all differ.

This project answers these questions with a reproducible, automated workflow:

| Question | Answer in this project |
| --- | --- |
| How can the same test environment be reproduced on any machine? | Every component (DB, API, UI, **browsers**) runs from version-pinned Docker images. |
| How do dependencies start in the right order? | Docker Compose `depends_on` with `condition: service_healthy`. |
| How do we know a service is *ready*, not merely *running*? | Real health checks: `pg_isready`, `GET /health` (which queries PostgreSQL), and an HTTP GET of the frontend. |
| How are real user workflows tested without manual effort? | 12 Playwright tests drive a real Chromium browser through login, CRUD, search, filters and logout. |
| How does a failed test stop the pipeline? | `docker compose up --exit-code-from tests` returns the Playwright exit code, so a non-zero code fails the script or CI job. |
| How can engineers diagnose a failed browser test? | Screenshot, video, Playwright trace, HTML report and `results.json` are kept for every failure. |
| How can a failure be demonstrated reliably in class? | A deterministic, env-var-controlled fault (`FAULT_INJECTION_MODE=drop_ticket_write`). No live code edits. |
| How do local and CI testing stay the same? | GitHub Actions runs the **same Compose files and command** as the local scripts. |

## 2. Architecture

```text
                         +----------------------+
                         |      Developer       |
                         +----------+-----------+
                                    |
                                    | ./scripts/demo.sh full   /   git push
                                    v
                         +----------------------+
                         |   Docker Compose     |   compose.yml (+ compose.demo.yml, + compose.ci.yml)
                         +----------+-----------+
                                    |
          +-------------------------+-------------------------+
          |                         |                         |
          v                         v                         v
+------------------+      +------------------+      +------------------+
|    PostgreSQL    |      | Express Backend  |      |  React Frontend  |
|  postgres:18     |<-----|  node:24 / :3000 |<-----|  nginx:1.29 / :80|
|  (pg_isready)    |      |  (GET /health)   |      |  (/api -> backend)|
+--------+---------+      +--------+---------+      +--------+---------+
         |  healthy                |  healthy                |  healthy
         +-------------------------+-------------------------+
                                    |
                                    v
                         +----------------------+
                         | Playwright Container |   mcr.microsoft.com/playwright:v1.64.0-noble
                         |  12 E2E tests        |   PLAYWRIGHT_BASE_URL=http://frontend
                         +----------+-----------+
                                    |  exit code
                                    v
                         +----------------------+
                         |  E2E Quality Gate    |
                         +----------+-----------+
                       +------------+------------+
                       v                         v
                 +-----------+            +-----------+
                 | PASS (0)  |            | FAIL (≠0) |
                 +-----------+            +-----+-----+
                                                v
                                  screenshots / video / trace /
                                  HTML report / results.json
                                                v
                                  report-viewer (nginx) :9323
```

The same flow as a Mermaid diagram (GitHub renders this):

```mermaid
flowchart LR
  dev[Developer / git push] --> compose[Docker Compose]
  compose --> db[(PostgreSQL)]
  db -- service_healthy --> api[Express API]
  api -- service_healthy --> web[Nginx + React]
  api -- service_healthy --> pw[Playwright container]
  web -- service_healthy --> pw
  pw -- exit 0 --> pass[PASS: pipeline continues]
  pw -- exit non-zero --> fail[FAIL: pipeline stops]
  fail --> art[Screenshots, video, trace, HTML report]
  art --> viewer[report-viewer :9323]
```

**Start-up order is enforced by health, not by timing.** Compose starts `backend` only after the `db` health check
passes. It starts `frontend` only after `backend` is healthy, and `tests` only after both are healthy. There are no
`sleep` commands anywhere.

### Compose files

| File | Purpose |
| --- | --- |
| `compose.yml` | Base topology: `db`, `backend`, `frontend`, `tests` (profile `test`), `report-viewer` (profile `report`). Named DB volume for development. |
| `compose.demo.yml` | Demo overlay. Separate project (`opsdesk-demo`), PostgreSQL on **tmpfs** (every run starts from the seed), no published app ports, per-phase artifact folders. It is the **only** file that forwards `FAULT_INJECTION_MODE`. |
| `compose.ci.yml` | CI overlay on top of the demo overlay (`opsdesk-ci` project, `CI=true`, fault mode pinned to `none`). |

## 3. Technologies

| Layer | Technology (pinned) |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, React Router 7, plain CSS; served by `nginx:1.29-alpine` |
| Backend | Node.js 24 (`node:24-alpine`), Express 5, TypeScript, `pg` (raw parameterized SQL, no ORM), Zod, bcryptjs, jsonwebtoken |
| Database | PostgreSQL 18 (`postgres:18-alpine`), SQL init scripts in `database/init/` |
| E2E testing | `@playwright/test` **1.64.0** in `mcr.microsoft.com/playwright:v1.64.0-noble` (versions must match; the image build checks it) |
| Orchestration | Docker Compose v2 (health checks, `depends_on: condition: service_healthy`, profiles, overlays) |
| CI | GitHub Actions calling Docker Compose |

## 4. Prerequisites

The core demonstration needs only:

- **Docker Desktop** (Windows/macOS) or **Docker Engine + Docker Compose v2** (Linux). Compose 2.24.4 or later is required for the `!reset`/`!override` tags.
- **Git**, to clone the repository.
- About **6 GB of free disk space** for images. The Playwright image with its browsers is about 3.5 GB.
- A shell: **Bash** (macOS/Linux/WSL/Git Bash) or **PowerShell** (Windows PowerShell 5.1 or PowerShell 7+).

You do **not** need Node.js, PostgreSQL, Playwright or any browser installed on the host.

## 5. Quick start

```bash
git clone <repository-url> opsdesk && cd opsdesk

# Optional: customise ports/credentials (compose.yml already contains the same defaults)
cp .env.example .env

# The whole classroom demonstration: PASS -> expected FAIL -> recovery PASS -> report viewer
./scripts/demo.sh full              # macOS / Linux / WSL / Git Bash
./scripts/demo.ps1 full             # Windows PowerShell / PowerShell 7
```

The first run downloads base images and builds the app, which takes a few minutes. Later runs take about 1 minute.
When it finishes, open **<http://localhost:9323>**.

## 6. Demo credentials

```text
Email:    demo@example.com
Password: Demo123!
```

These are **intentionally non-secret demonstration credentials**. They are seeded by `database/init/002_seed.sql`,
where only a bcrypt hash is stored. Do not use them, or `JWT_SECRET=demo-only-change-me`, anywhere real.

## 7. Development: start the application

```bash
docker compose up --build            # db -> backend -> frontend, in health-check order
```

| URL | What |
| --- | --- |
| <http://localhost:8080> | OpsDesk UI (log in with the demo credentials) |
| <http://localhost:3000/health> | Backend health (`{"status":"ok","database":"ok"}`) |

Useful commands:

```bash
docker compose ps                    # services and their health status
docker compose logs -f backend       # follow backend logs
docker compose down                  # stop (database volume is kept, so data persists)
docker compose down -v               # stop and reset the development database
```

Data persists in the `opsdesk_db-data` volume between `docker compose down`/`up` cycles.

<details>
<summary>Optional: run without Docker (Node.js 22+ and a local PostgreSQL required)</summary>

```bash
# backend (needs DATABASE_URL pointing at a database initialised with database/init/*.sql)
cd backend && npm ci
DATABASE_URL=postgresql://opsdesk:opsdesk_dev_password@localhost:5432/opsdesk \
JWT_SECRET=demo-only-change-me ENABLE_TEST_ENDPOINTS=true npm run dev

# frontend (Vite proxies /api to http://localhost:3000)
cd frontend && npm ci && npm run dev          # http://localhost:5173

# tests against the dev server (needs `npx playwright install` once)
cd e2e && npm ci && PLAYWRIGHT_BASE_URL=http://localhost:5173 npx playwright test
```

This path is optional. The Docker workflow is the canonical one.
</details>

## 8. Running the tests (quality gate)

The quality gate is a single Compose command. Compose returns the exit code of the `tests` container:

```bash
docker compose up --build --abort-on-container-exit --exit-code-from tests tests
echo $?        # 0 = all tests passed, non-zero = quality gate failed
```

This runs against the development stack. The `tests` service resets the seed data before every test.
`--abort-on-container-exit` stops the stack when the tests finish.

To run the **isolated CI configuration locally** (identical to GitHub Actions):

```bash
./scripts/demo.sh ci                 # or: ./scripts/demo.ps1 ci
# equivalent to:
docker compose -f compose.yml -f compose.demo.yml -f compose.ci.yml \
  up --build --abort-on-container-exit --exit-code-from tests tests
```

Results land in `artifacts/latest/`.

Single demo phases:

```bash
./scripts/demo.sh pass               # healthy stack, suite must pass        -> artifacts/pass/
./scripts/demo.sh fail               # fault injected, E2E-04 must fail      -> artifacts/failure/
```

Cross-browser (Chromium + Firefox + WebKit) run:

```bash
PW_BROWSERS=chromium,firefox,webkit ./scripts/demo.sh ci
```

### Test catalogue

| ID | File | What it proves |
| --- | --- | --- |
| E2E-01 | `auth.spec.ts` | Valid login shows the dashboard with correct ticket metrics (6 / 3 / 2 / 1) |
| E2E-02 | `auth.spec.ts` | Invalid password shows "Invalid email or password"; no session is stored |
| E2E-03 | `auth.spec.ts` | `/tickets` without a session redirects to login, and you return there after signing in |
| **E2E-04** | `tickets.spec.ts` | **Create ticket → success toast → reload → search → ticket is listed** (the fault-injection target) |
| E2E-05 | `tickets.spec.ts` | Edit title and description; change survives reload and appears in the list |
| E2E-06 | `tickets.spec.ts` | Change status `OPEN` → `IN_PROGRESS` |
| E2E-07 | `tickets.spec.ts` | Case-insensitive title search shows matches only; empty state for no match |
| E2E-08 | `tickets.spec.ts` | Status filter shows only matching tickets |
| E2E-09 | `tickets.spec.ts` | Priority filter (and combined priority + status filter) |
| E2E-10 | `tickets.spec.ts` | Delete with confirmation dialog; ticket is gone |
| E2E-11 | `validation.spec.ts` | Empty or whitespace title/description is blocked with visible messages; nothing is created |
| E2E-12 | `session.spec.ts` | Logout clears the token, returns to login, and protected URLs redirect again |

**Isolation and determinism.**
- An automatic fixture (`e2e/fixtures/test.ts`) calls `POST /api/test/reset` before every test, which restores the six seed tickets.
- Tests never depend on each other.
- Tests run with one worker and no retries.
- Created tickets use unique `PW-<timestamp>-<name>` titles.
- Locators are accessibility-based: `getByRole`, `getByLabel`. There are no CSS chains and no `data-testid`.

**Playwright configuration** (`e2e/playwright.config.ts`):
- Headless, with `workers: 1` and `retries: 0`. `forbidOnly` is on in CI.
- `screenshot: only-on-failure`, `trace: retain-on-failure`, `video: retain-on-failure`.
- Reporters: list, HTML and JSON.
- Timeouts: global 10 min, per test 30 s, `expect` 7 s.

## 9. The full demonstration

```bash
./scripts/demo.sh full               # or ./scripts/demo.ps1 full   (OPEN_REPORT=1 also opens the browser)
```

The script runs these phases. All output uses text markers such as `[OK]` and `[FAIL]`; colour is only an extra.

| Phase | What happens | Expected | Artifacts |
| --- | --- | --- | --- |
| 1 – Baseline | Fresh stack with `FAULT_INJECTION_MODE=none`. Health checks pass, then Playwright runs. | **PASS** (exit 0) | `artifacts/pass/` |
| 2 – Regression | Stack recreated with `FAULT_INJECTION_MODE=drop_ticket_write`. The backend logs a warning, then Playwright runs. | **FAIL**, on E2E-04 only | `artifacts/failure/` |
| 3 – Recovery | Stack recreated with the fault removed. Playwright runs the same suite. | **PASS** (exit 0) | `artifacts/recovery/` |
| 4 – Report | `report-viewer` starts and the URL is printed. | — | <http://localhost:9323> |

**Success rule:** `baseline_passed AND regression_was_detected AND recovery_passed`.

- In phase 2 the Playwright process **does** exit non-zero. The outer script captures that code and checks that E2E-04 is the failing test. It then treats the detected regression as the expected outcome.
- If phase 2 unexpectedly passes, the regression was **not** detected and the demo fails with exit code 1.
- Phase 2 must also leave failure artifacts behind: a trace, a screenshot, a video and the HTML report.

Example ending:

```text
==================================================
DEVOPS QUALITY GATE DEMONSTRATION SUMMARY
==================================================

Baseline validation:         PASS
Controlled regression:       DETECTED
Failure artifacts:           GENERATED
Recovery validation:         PASS

Dockerized environment:      YES
Health-aware orchestration:  YES
Playwright quality gate:     YES
Automated recovery demo:     YES

FINAL RESULT: DEMONSTRATION SUCCESSFUL

Report:
http://localhost:9323
```

Every phase starts from fresh containers and a fresh tmpfs database. The script is idempotent: run it as often as
you like. It also saves the backend log of each phase (`artifacts/<phase>/backend.log`).

## 10. Fault injection

| Variable | Values | Default |
| --- | --- | --- |
| `FAULT_INJECTION_MODE` | `none`, `drop_ticket_write` | `none` |

When the mode is `drop_ticket_write`, `POST /api/tickets`:

1. validates the request normally,
2. responds `201 Created` with a realistic ticket, including a real ID taken from the sequence,
3. **does not insert the row**, and
4. logs `[backend] DEMO FAULT drop_ticket_write: acknowledged ticket #7 "…" but did NOT save it`.

The UI shows "Ticket #7 created", so the action *appears* to succeed. An API-status-only check would pass.
E2E-04 reloads the page and searches for the ticket. It is missing, so the quality gate fails. This is the value of
end-to-end validation: it checks the **user-visible outcome**, not just a response code.

At start-up the backend logs:

```text
[backend] WARNING: DEMO FAULT INJECTION ACTIVE
[backend] mode: drop_ticket_write
```

**Safety.**
- The fault is disabled by default: the backend defaults to `none` and rejects unknown values at start-up.
- Base `compose.yml` does not forward the variable at all. Only `compose.demo.yml` does.
- In CI it is pinned to `none`. The only exception is a manual `simulate_regression` run (see §12).
- No source file is edited during the demo.
- This is a **demonstration-only** feature.

The test-only endpoint `POST /api/test/reset` exists only when `ENABLE_TEST_ENDPOINTS=true`. Otherwise it returns 404.
Never enable either feature in a production deployment.

## 11. Viewing reports, screenshots, videos and traces

```bash
./scripts/demo.sh report             # or ./scripts/demo.ps1 report  (the full demo starts it automatically)
```

Open **<http://localhost:9323>**. The landing page shows each phase (pass / failure / recovery / latest) with its
result. It links straight to the failed test's **screenshot, video and trace**, to the **Playwright HTML report**,
and to the backend log. Everything under `./artifacts` can also be browsed at <http://localhost:9323/reports/>.

To replay a failure step by step:
1. Open the failure report.
2. Click the failed **E2E-04** test.
3. Click **Trace**.

The trace viewer shows each action with before/after DOM snapshots, console output and the network log, including
the `POST /api/tickets → 201` that returned success without saving the ticket.

> Use `http://localhost:9323` (or `127.0.0.1`). The trace viewer uses a service worker, which browsers only allow on
> `localhost` or HTTPS origins. If you open the report from another machine, download `trace.zip` instead and drop it
> on <https://trace.playwright.dev>. That site processes the file locally in your browser.

Artifact layout:

```text
artifacts/
├── latest/      plain `docker compose ... tests` and CI-mode runs
├── pass/        phase 1
├── failure/     phase 2   (test-results/<test>/test-failed-1.png, video.webm, trace.zip, error-context.md)
└── recovery/    phase 3
    each with: playwright-report/ (HTML), test-results/, results.json, backend.log (demo phases)
```

## 12. GitHub Actions

`.github/workflows/e2e-quality-gate.yml` runs on **push to `main`**, **pull requests targeting `main`**, and
**manual `workflow_dispatch`**.

```text
checkout -> docker compose build -> docker compose up --build --abort-on-container-exit --exit-code-from tests tests
         -> (db healthy -> backend healthy -> frontend healthy -> Playwright) -> exit code
         -> PASS: green job   |   FAIL: red job + service logs
         -> always: job summary + upload "playwright-e2e-report" artifact (14 days) -> docker compose down
```

- **Local/CI parity.** The workflow sets `COMPOSE_FILE=compose.yml:compose.demo.yml:compose.ci.yml` and runs plain `docker compose` commands. It does **not** install Node.js, PostgreSQL or browsers on the runner. `./scripts/demo.sh ci` runs exactly the same thing locally.
- **Quality gate.** The test step has no `|| true`. A non-zero Playwright exit code fails the step, and therefore the workflow.
- **Artifacts.** `artifacts/` is uploaded as `playwright-e2e-report` whether the run passes or fails.
- **Showing a red pipeline on demand.** Go to *Actions → E2E Quality Gate → Run workflow* and tick **simulate_regression**. That run alone uses `drop_ticket_write`, so the workflow fails on E2E-04 and uploads the failure trace. Push and PR runs always use `none`. Alternatively, push a branch that breaks the behaviour, for example a test expectation, and open a PR.

`.github/workflows/nightly-cross-browser.yml` runs the same Compose stack daily at 02:00 UTC, and on demand, as a
Chromium/Firefox/WebKit matrix. It is not required for pull requests or for the classroom demo.

## 13. Troubleshooting

| Symptom | Fix |
| --- | --- |
| **Port already in use** (`8080`, `3000`, `9323`) | Set `FRONTEND_PORT`, `BACKEND_PORT` or `REPORT_PORT` in `.env`, or stop the other process. Stop this project's containers with `./scripts/clean.sh`. The demo/CI stacks publish no app ports, only the report viewer (`9323`). |
| **Docker image build fails** | Read the first error in the build output. For a network hiccup, rerun. Only if a cached layer is corrupt: `docker compose --profile test build --no-cache`. |
| **`ERROR: @playwright/test is 'Version x' but the image is v1.64.0`** | The npm package and image drifted apart. Update `e2e/package.json` (+ `package-lock.json`) and `PLAYWRIGHT_VERSION` in `e2e/Dockerfile` **together**. |
| **Stale data in the development database** | `docker compose down -v` (or `./scripts/clean.sh --volumes`). This removes only the project volume `opsdesk_db-data`; the init scripts run again on the next start. Demo/CI runs never use this volume. |
| **Backend unhealthy** | `docker compose logs backend` and `docker compose logs db`. The backend reports invalid configuration (e.g. a bad `FAULT_INJECTION_MODE`) and database connection errors at start-up. `docker compose ps` shows the health state. |
| **Frontend unhealthy** | `docker compose logs frontend`. Nginx fails if it cannot resolve the `backend` service, so check the backend first. |
| **Playwright / browser failure** | `docker compose logs tests`, or the `tests-1` lines in the script output. Check that package and image versions match (see above). Open `artifacts/<phase>/playwright-report` for details. |
| **Reset endpoint returns 404 in tests** | The backend needs `ENABLE_TEST_ENDPOINTS=true`. It is set by `compose.yml` (dev) and `compose.demo.yml`. |
| **Artifacts not writable / owned by root** (Linux) | The scripts run the test container as your user (`HOST_UID`/`HOST_GID`). For files left by an earlier root run, use `sudo chown -R "$(id -u):$(id -g)" artifacts`. Do not `chmod 777`. |
| **Trace viewer shows a blank page** | Open the report via `http://localhost:9323`, not via a LAN IP (see §11). |
| **Windows: "running scripts is disabled"** | `powershell -ExecutionPolicy Bypass -File .\scripts\demo.ps1 full` (affects that one invocation only). |
| **Cleanup** | `./scripts/clean.sh` removes containers and networks, keeping volumes and artifacts. `--volumes` also resets the dev DB, `--artifacts` deletes reports, `--all` does both. PowerShell: `./scripts/clean.ps1 [-Volumes] [-Artifacts] [-All]`. Only the `opsdesk`, `opsdesk-demo` and `opsdesk-ci` projects are touched. There is never a `docker system prune`. |

## 14. Project structure

```text
.
├── backend/                     Express + TypeScript API
│   ├── src/
│   │   ├── config/env.ts          env validation (Zod), fault-mode & test-endpoint flags
│   │   ├── db/pool.ts             pg pool + bounded start-up retry
│   │   ├── middleware/            JWT auth, error handler, request logger
│   │   ├── routes/                health, auth, tickets (+ fault injection), test reset
│   │   ├── services/              AuthService (bcrypt/JWT), TicketService (parameterized SQL)
│   │   ├── app.ts                 Express app wiring
│   │   └── server.ts              start-up logs, graceful shutdown
│   └── Dockerfile                 multi-stage: tsc build -> slim runtime (non-root)
├── frontend/                    React + Vite + TypeScript SPA
│   ├── src/{components,pages,hooks,services,types}/
│   ├── nginx.conf                 SPA fallback + /api reverse proxy
│   └── Dockerfile                 multi-stage: vite build -> nginx
├── database/
│   ├── init/001_schema.sql        users, tickets (CHECK-constrained priority/status)
│   ├── init/002_seed.sql          reset_demo_data(): single source of seed truth
│   └── README.md
├── e2e/                         Playwright quality gate
│   ├── tests/                     auth, tickets, validation, session specs (E2E-01..12)
│   ├── fixtures/test.ts           auto reset-before-each fixture
│   ├── helpers/                   login + ticket-table helpers (role-based locators)
│   ├── scripts/summarize-results.mjs   results.json -> PASS/FAIL summary, expected-failure check
│   ├── playwright.config.ts
│   └── Dockerfile                 official Playwright image + version-match guard
├── report-viewer/               nginx landing page + /reports/ browser for ./artifacts
├── scripts/
│   ├── demo.sh / demo.ps1         pass | fail | full | ci | report
│   └── clean.sh / clean.ps1       project-scoped cleanup
├── artifacts/                   generated reports (git-ignored, .gitkeep only)
├── .github/workflows/
│   ├── e2e-quality-gate.yml       push/PR/manual quality gate
│   └── nightly-cross-browser.yml  scheduled Chromium/Firefox/WebKit matrix
├── compose.yml  compose.demo.yml  compose.ci.yml
├── demo.sh  demo.ps1            shortcuts to scripts/demo.*
├── .env.example
├── IMPLEMENTATION.md            the project specification
└── README.md
```

API summary (all `/api/tickets*` routes require `Authorization: Bearer <jwt>`):

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | `{"status":"ok","database":"ok"}`, or 503 if PostgreSQL is unreachable |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, user }`; 401 on bad credentials |
| GET | `/api/tickets?status=&priority=&search=` | Newest first; `search` is a case-insensitive title match |
| GET | `/api/tickets/:id` | 404 if missing |
| POST | `/api/tickets` | `{ title, description, priority }` → 201; status starts as `OPEN` |
| PUT | `/api/tickets/:id` | Any of `title`, `description`, `priority`, `status` |
| DELETE | `/api/tickets/:id` | 204 |
| POST | `/api/test/reset` | **Test only**, when `ENABLE_TEST_ENDPOINTS=true`; restores the seed |

## 15. Assignment / presentation guide

**Case study topic:** Containerized Automated End-to-End Testing and CI Quality Validation of a Web Application Using
Playwright and Docker.
**Tools:** Playwright, Docker, Docker Compose, GitHub Actions.

### Suggested 10-minute flow

1. **Problem (1 min).** Manual testing is slow and inconsistent. "Works on my machine" happens because environments differ.
2. **Architecture (1 min).** Show the diagram in §2: Compose → PostgreSQL → Backend → Frontend → Playwright → Quality gate.
3. **One command (live).** Run `./scripts/demo.sh full` (or `./scripts/demo.ps1 full`).
4. **Baseline.** Compose starts the dependencies, and the `[OK] … healthy` lines come from the real health checks. Playwright drives Chromium, all 12 tests pass, and the exit code is 0.
5. **Controlled regression.** No code is edited. An environment variable enables a simulated persistence bug. The UI still says "Ticket created", but after a reload the ticket is missing. Playwright catches it, E2E-04 fails, and the exit code is non-zero.
6. **Diagnostics.** At <http://localhost:9323>, show the failed test, its screenshot (empty search result), its video, and the trace with the network tab showing `POST /api/tickets 201`.
7. **Recovery.** The fault is disabled automatically and the environment is recreated. The same test passes again.
8. **CI.** Open `.github/workflows/e2e-quality-gate.yml`: it uses the same Compose files and command. Show a green run, and a red run started with *simulate_regression*.
9. **Optional screens.** The login page, dashboard and tickets page (`docker compose up --build`, then <http://localhost:8080>), and `docker compose ps` with `(healthy)` services.

### Narrative

> "The application is composed of a frontend, API, and PostgreSQL database. Docker packages each component into a
> reproducible environment, while Docker Compose orchestrates startup and health dependencies. Once the application
> is healthy, a separate Playwright container performs automated end-to-end user journeys. The Playwright exit code
> is used as a quality gate. If a user workflow fails, the automated pipeline fails and diagnostic artifacts are
> preserved. The same Docker Compose quality gate is invoked by GitHub Actions, so the local and CI test environments
> remain consistent."

*Fault phase:* "Fault injection simulates a regression where the application acknowledges ticket creation but fails to
persist the ticket. A superficial API-only check could miss it. Playwright repeats the real browser workflow and
detects that the created ticket is absent, causing the quality gate to fail."

*Recovery:* "The fault is disabled, the environment is recreated, and the same regression test passes again. This proves
that the quality gate can tell healthy behaviour from defective behaviour."

### Why this is a DevOps project (not just a Playwright tutorial)

| DevOps concept | Where it is demonstrated |
| --- | --- |
| Continuous Integration | GitHub Actions runs the gate on every push/PR to `main` |
| Shift-left testing | Full user journeys are validated before merge, not after deployment |
| Environment consistency | Version-pinned images for DB, runtime and **browsers**; the package/image version guard |
| Infrastructure as code / orchestration | `compose*.yml` define topology, dependencies, health, profiles and overlays |
| Health-aware automation | `service_healthy` dependencies; `/health` checks the database too |
| Quality gates | Exit code 0 lets the pipeline continue; non-zero stops it (`--exit-code-from tests`) |
| Repeatability | Same Compose stack locally and in CI; tmpfs DB plus per-test reset |
| Failure observability | Screenshots, video, traces, HTML/JSON reports, backend logs, job summary |
| Automated regression detection | The injected regression is caught with no human checking the UI |

### Talking points (Q&A)

- **Why Playwright?** Real browser automation of user workflows, auto-waiting assertions, accessibility locators, and rich failure artifacts (trace viewer).
- **Why Docker?** Runtimes, browsers, system libraries and services become reproducible.
- **Why Compose?** One declarative definition of the multi-container environment, including dependency and health relationships.
- **Why PostgreSQL?** It shows that a real stateful full-stack system is tested, not just static pages.
- **Why GitHub Actions?** The same gate runs automatically on every code change.
- **Why health checks?** A *running* container is not a *ready* service. Health checks prevent start-up race conditions.
- **Why fault injection?** It proves, repeatably, that the gate detects a known regression.
- **Why keep traces, screenshots and video?** A failure in CI is only useful if it can be diagnosed afterwards.
- **Why the same Compose setup locally and in CI?** It removes environment drift.

## 16. Design decisions and deviations from the specification

The architecture follows `IMPLEMENTATION.md`. These choices refine or extend it. None changes the case-study architecture.

| # | Decision | Reason |
| --- | --- | --- |
| 1 | **CI = base + demo + CI overlays** (`compose.yml` + `compose.demo.yml` + `compose.ci.yml`) | Maximum local/CI parity. CI runs exactly the isolated demo stack and only adds `CI=true`. `./scripts/demo.sh ci` reproduces it locally. |
| 2 | Demo/CI PostgreSQL uses **tmpfs** and its own Compose project instead of resetting the named volume | Every run starts from the committed seed, with no risk of deleting the developer's database volume. |
| 3 | The demo scripts run the gate as two Compose calls: `up -d --wait db backend frontend`, then `up --abort-on-container-exit --exit-code-from tests tests` | The first call lets the script print verified `[OK] Database/Backend/Frontend healthy` lines from Docker's health status before the tests start. The gate result is still the `tests` exit code, and the same health-gated `depends_on` applies. CI uses the single-command form from the spec. |
| 4 | `pg_isready -h 127.0.0.1 …` instead of a plain `pg_isready` | Forces a TCP check, so the temporary socket-only server that runs the init scripts is never reported as healthy. |
| 5 | `workers: 1` always, not only in CI | Each test resets the shared database, so parallel workers would interfere. |
| 6 | Playwright pinned to **1.64.0**, the version named in the spec, although npm has 1.64.1 | Keeps the npm package and `mcr.microsoft.com/playwright:v1.64.0-noble` identical. The image build fails if they ever differ. |
| 7 | Manual `simulate_regression` input on the CI workflow | Spec Milestone 8 asks to show a red workflow. This makes it reproducible without a broken branch. Push/PR runs can never enable it. |
| 8 | Demo phases write directly to `artifacts/pass/failure/recovery`; `artifacts/latest` holds plain Compose/CI runs | Phase artifacts are never overwritten by a later phase. |
| 9 | `report-viewer` is a small custom nginx image (landing page + `/reports/` autoindex) | One URL gives access to every phase's report and direct links to the failure evidence. |
| 10 | Dashboard metrics are computed in the browser from `GET /api/tickets` | Keeps the API to the contract in the spec. The data set is small. |
| 11 | Seed logic lives in a SQL function `reset_demo_data()` | One definition of the seed, used both by the init script and by `POST /api/test/reset`. |
| 12 | The spec's suggested `PROJECT_SPEC.md` is `IMPLEMENTATION.md` | The specification was supplied under that name and is kept unchanged. |
