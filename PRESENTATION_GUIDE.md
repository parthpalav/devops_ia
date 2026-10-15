# OpsDesk DevOps Demonstration Guide

> **Purpose of this file.** This is a complete, self-contained operating and presentation manual for the OpsDesk
> repository. A reader who has never seen the project — a person or an AI assistant — should be able to read only
> this file and understand what the project does, how to run it, how to present it, and how to recover if anything
> goes wrong.

## How this guide was verified

Every command, URL, button name, and terminal message in this guide was checked against the real repository and a
real run. Anything that could not be checked is explicitly labelled **NOT VERIFIED**.

| Item | Value at verification time |
| --- | --- |
| Date | 15 October 2026 |
| Git branch / commit | `main` at `1d1557f` ("docker tested") |
| Machine | macOS, Docker Desktop, Docker Engine 29.7.2, Docker Compose v5.5.1 |
| Project folder | `/Users/parthspalav/Documents/College/Semester 7/DevOps/Theory IA/devops_ia` |
| Main demo result | `./scripts/demo.sh full` → `FINAL RESULT: DEMONSTRATION SUCCESSFUL`, exit code `0`, about 58–62 seconds |

What was actually run during verification: the full demo (several times, including from a fresh `git clone`), the
`pass`, `fail`, `ci` and `report` modes, the cleanup script, the development stack on port 8080, every click path in
the report viewer and the Playwright HTML report (in a real Chromium browser), the trace viewer's Network tab,
Ctrl-C and "terminal killed" interruptions, and the full demo with **no Internet access** (inside an isolated offline
Docker daemon, after one online warm-up run).

What was **NOT VERIFIED**:

- A real GitHub-hosted run of the GitHub Actions workflow (deliberately not triggered; the `gh` tool is not installed,
  so even the run history could not be read).
- The exact look of the terminal output in an interactive Terminal window (colours and the live build progress
  display). Verification captured the output as plain text. The text markers (`[OK]`, `[FAIL]` …) are identical.
- Clicks inside the Docker Desktop graphical application.
- The report in Safari/Firefox (verified in Chromium).
- Windows PowerShell 5.1 (`demo.ps1` was verified with PowerShell 7.5 on Linux).
- `OPEN_REPORT=1` automatic browser opening.

A note on the project folder path: it contains spaces (`Semester 7`, `Theory IA`), so it must always be wrapped in
quotes when used with `cd`.

---

# 1. What This Project Is

## In one sentence

OpsDesk is a small support-ticket web application **plus** a fully automated, containerized testing pipeline that
starts the whole application, tests it like a real user would in a real browser, and uses the test result as a
pass/fail **quality gate**.

## The two halves of the project

| Half | What it is | Why it exists |
| --- | --- | --- |
| **The application ("OpsDesk")** | A support-ticket portal. Users log in, see a dashboard, and create, edit, search, filter and delete tickets. | It is the **system under test** — something realistic to test. The application itself is not the main point. |
| **The DevOps pipeline** | Docker images, Docker Compose orchestration, health checks, a Playwright test container, a fault-injection switch, demo scripts, a report viewer, and a GitHub Actions workflow. | This is the **actual subject of the assignment**: automated, reproducible quality validation. |

## The assignment title

**Containerized Automated End-to-End Testing and CI Quality Validation of a Web Application Using Playwright and
Docker.**

The primary (distinguishing) tool is **Playwright**. The supporting tools are **Docker, Docker Compose, GitHub
Actions, Git, PostgreSQL, Node.js/Express, and React/Vite/TypeScript**.

## Key terms (defined once, used throughout)

| Term | Meaning in this project |
| --- | --- |
| **Container** | A lightweight, isolated box that runs one program with everything it needs (for example, PostgreSQL). |
| **Image** | The template a container is created from (for example `postgres:18-alpine`). |
| **Docker Compose** | A tool that starts several containers together from a description file (`compose.yml`). |
| **Service** | One named entry in a Compose file, for example `db`, `backend`, `frontend`, `tests`. |
| **Health check** | A command Docker runs repeatedly inside a container to ask "is this service actually ready?" |
| **E2E (end-to-end) test** | A test that drives the real application through a real browser, from login to final result. |
| **Playwright** | A browser-automation and testing framework from Microsoft. It controls Chromium, Firefox and WebKit. |
| **Headless browser** | A real browser running without a visible window. |
| **Exit code** | A number every program returns when it finishes. `0` means success. Anything else means failure. |
| **Quality gate** | An automatic decision point: the pipeline continues only if the tests pass (exit code `0`). |
| **Fault injection** | Deliberately switching on a known bug, using a setting, to prove the tests catch it. |
| **Regression** | A feature that used to work and is now broken. |
| **Artifact** | A file produced by a test run: screenshot, video, trace, HTML report, JSON results. |
| **CI (Continuous Integration)** | Automatically building and testing code every time it changes. Here: GitHub Actions. |

---

# 2. What I Am Demonstrating

## The core story

> A team has a full-stack web application. Instead of manually installing a database, installing browsers, starting
> services in the right order, and clicking through the UI after every change, the entire validation environment is
> defined as code. Docker packages every component. Docker Compose starts them in the correct order and waits until
> each one is genuinely healthy. Playwright then tests the application through a real browser. Its exit code becomes
> an automated quality gate. A deliberately injected bug proves that the gate catches real regressions, the failure
> evidence is saved, and once the bug is removed the same tests pass again. GitHub Actions runs the same
> containerized quality gate automatically on every code change.

## The demonstration in one picture

```text
HEALTHY APPLICATION ──► tests run ──► 12/12 PASS            (Phase 1: Baseline)
        │
        ▼
FAULT SWITCHED ON   ──► tests run ──► E2E-04 FAILS          (Phase 2: Controlled regression)
        │                              (this failure is EXPECTED and is the point)
        ▼
FAULT SWITCHED OFF  ──► tests run ──► 12/12 PASS            (Phase 3: Recovery)
        │
        ▼
REPORT VIEWER at http://localhost:9323                       (Phase 4: Evidence)
```

## What each phase proves

| Phase | What it proves |
| --- | --- |
| Phase 1 — Baseline | The whole environment can be created automatically from code, and the healthy application passes all 12 browser tests. |
| Phase 2 — Controlled regression | The quality gate is not a rubber stamp: when a real bug exists, the tests detect it and the gate turns red. |
| Evidence (artifacts) | When a test fails, engineers get a screenshot, video, step-by-step trace and HTML report to diagnose it. |
| Phase 3 — Recovery | The gate can tell healthy from broken: once the bug is removed, the exact same test passes again. |
| GitHub Actions (explained, not run live) | The same gate runs automatically on every push and pull request. |

## The single command that does everything

```bash
./scripts/demo.sh full
```

---

# 3. Architecture Explained From Zero

## The big picture

```text
                          ./scripts/demo.sh full
                                   │
                                   ▼
                          Docker Compose (project "opsdesk-demo")
                                   │
     ┌─────────────────────────────┼──────────────────────────────┐
     ▼                             ▼                              ▼
┌───────────┐  SQL :5432   ┌──────────────┐  HTTP :3000   ┌──────────────┐
│    db     │◄─────────────│   backend    │◄──────────────│   frontend   │
│PostgreSQL │              │Node + Express│   /api/...    │ Nginx + React│
└───────────┘              └──────────────┘               └──────────────┘
     ▲ healthy                    ▲ healthy                      ▲ healthy
     └──────────────┬─────────────┴──────────────────────────────┘
                    │ only when ALL are healthy
                    ▼
            ┌───────────────┐   http://frontend   (headless Chromium)
            │    tests      │ ─────────────────────────────────────►
            │  Playwright   │
            └──────┬────────┘
                   │ exit code 0 = PASS, 1 = FAIL  (the quality gate)
                   ▼
           ./artifacts/<phase>/  (HTML report, screenshot, video, trace, results.json, backend.log)
                   │
                   ▼
            ┌───────────────┐
            │ report-viewer │  http://localhost:9323
            │    Nginx      │
            └───────────────┘
```

## How a single user action travels through the system

When a user (or Playwright) clicks **Create ticket** in the browser:

1. The browser sends `POST /api/tickets` to the **frontend** container (Nginx).
2. Nginx sees the path starts with `/api/` and forwards (proxies) the request to `http://backend:3000`.
3. The **backend** (Express) checks the login token, validates the data, and runs an SQL `INSERT` against the
   **db** container (PostgreSQL).
4. The backend replies `201 Created` with the new ticket as JSON.
5. The React page shows the notification `Ticket #7 created`.

Because the browser only ever talks to the frontend's address, the frontend and backend share one address and no
special cross-origin (CORS) setup is needed inside Docker.

## The five containers

| Service name | Container name during the demo | Purpose | Software inside | Who talks to it | Health check | When it exists |
| --- | --- | --- | --- | --- | --- | --- |
| `db` | `opsdesk-demo-db-1` | Stores users and tickets | PostgreSQL 18 (`postgres:18-alpine`) | `backend` only | `pg_isready -h 127.0.0.1 -U opsdesk -d opsdesk` every 5 s (every 1 s while starting) | Only while a demo phase runs (about 15–25 seconds per phase) |
| `backend` | `opsdesk-demo-backend-1` | REST API: login, ticket CRUD, health, test reset, fault injection | Node.js 24 + Express + TypeScript (compiled) | `frontend` (via Nginx proxy) | `GET http://127.0.0.1:3000/health` — this endpoint also runs `SELECT 1` on the database | Only while a demo phase runs |
| `frontend` | `opsdesk-demo-frontend-1` | Serves the React web app and proxies `/api/` to the backend | Nginx 1.29 serving a compiled React/Vite build | `tests` (the Playwright browser) | `wget --spider http://127.0.0.1/index.html` | Only while a demo phase runs |
| `tests` | `opsdesk-demo-tests-1` | Runs the 12 Playwright tests in headless Chromium, writes artifacts | Official Microsoft image `mcr.microsoft.com/playwright:v1.64.0-noble` + `@playwright/test` 1.64.0 | Nobody; it talks to `frontend` | None (it is a short-lived job, not a server) | Only for the ~7–15 seconds of each test run, then it exits |
| `report-viewer` | `opsdesk-demo-report-viewer-1` | Serves the reports over HTTP so no Node.js/Playwright is needed on the laptop | Nginx 1.29 with a landing page, reading `./artifacts` read-only | Your web browser | `wget --spider http://127.0.0.1/` | Started at the end of the full demo; **stays running** afterwards |

## Service names as addresses (why `http://frontend` and not `localhost`)

Docker Compose creates a private network for each project (during the demo it is called `opsdesk-demo_default`).
On that network, **every service name is also a hostname**:

- the backend connects to the database at `db:5432`,
- Nginx forwards API calls to `backend:3000`,
- Playwright opens the website at `http://frontend`.

Inside a container, `localhost` means **that container itself**, not your laptop and not the other containers. If
the Playwright container opened `http://localhost`, it would be talking to itself and would find nothing. That is
why the setting `PLAYWRIGHT_BASE_URL=http://frontend` is used.

During the demo **no application port is published to your laptop** — the app is only reachable inside the private
Docker network. The only port opened on your laptop is **9323** (the report viewer). This is deliberate: it avoids
port conflicts during a presentation.

## Two separate ways to run the stack

| Mode | Compose files | Compose project name | Database storage | Ports on your laptop | Used for |
| --- | --- | --- | --- | --- | --- |
| **Demo / test** | `compose.yml` + `compose.demo.yml` | `opsdesk-demo` | `tmpfs` (in memory, wiped every phase) | only `9323` (report viewer) | `./scripts/demo.sh full/pass/fail/report` |
| **CI** | `compose.yml` + `compose.demo.yml` + `compose.ci.yml` | `opsdesk-ci` | `tmpfs` | none | GitHub Actions and `./scripts/demo.sh ci` |
| **Development (show the app)** | `compose.yml` only | `opsdesk` | named volume `opsdesk_db-data` (persists) | `8080` (app) and `3000` (API) | `docker compose up -d --build --wait`, then browse `http://localhost:8080` |

The demo stack and the development stack can run at the same time without interfering (verified).

---

# 4. Tools Used and Why They Exist

## Playwright (the primary tool)

**What it is.** Playwright is a framework that launches a real browser (Chromium, Firefox or WebKit) and controls it
from test code: it opens pages, types into fields, clicks buttons, and then **asserts** (checks) what is on the
screen.

**What it is doing in this project.** The `tests` container runs 12 test scenarios against the OpsDesk website, using
Chromium (the open-source browser that Google Chrome is built on).

### Explaining Playwright visually (even though you see no browser window)

| Concept | What it means here |
| --- | --- |
| **Chromium** | A real browser engine. Version shipped in the Playwright 1.64.0 image. It renders the real React page, runs the real JavaScript, and sends real HTTP requests. |
| **Browser automation** | Instead of a human moving a mouse, test code says "fill the Email field", "click Sign in". |
| **Page interactions** | `fill`, `click`, `selectOption`, `reload`, `goto` — the same things a person does. |
| **Locators** | How Playwright finds things on the page, preferably the way a human or screen reader would: `getByLabel('Email')`, `getByRole('button', { name: 'Sign in' })`, `getByRole('table', { name: 'Tickets' })`. This makes tests stable and readable. |
| **Assertions** | Checks such as `toBeVisible()`, `toHaveURL(/\/login$/)`, `toContainText('6')`. Playwright waits (up to 7 seconds in this project) for the condition to become true before declaring failure. |
| **Headless mode** | The browser runs without drawing a window on a screen. Everything else is identical: the page is fully rendered in memory. |
| **Why you see no browser window** | The browser runs **inside a Linux container** that has no screen. That is normal for CI servers, which never have screens. |
| **Screenshot** | A PNG image of the page at the moment a test failed (`screenshot: 'only-on-failure'`). |
| **Video** | A `.webm` recording of the whole failed test (`video: 'retain-on-failure'`). |
| **Trace** | A `trace.zip` file that records every action, a DOM snapshot before and after each action, console messages, and every network request. It can be replayed in the Playwright Trace Viewer (`trace: 'retain-on-failure'`). |
| **HTML report** | A web page listing every test, its result, timing, errors, and links to screenshot/video/trace. |

> **Important:** "No visible browser window" does **not** mean the test is fake or simulated. The screenshots, the
> video and the trace in the report are recordings of the real headless Chromium rendering the real application.
> They are the proof that a real browser did the work.

### Playwright settings used (`e2e/playwright.config.ts`)

| Setting | Value | Why |
| --- | --- | --- |
| Browser projects | `chromium` by default (`PW_BROWSERS` env var can add `firefox,webkit`) | Fast and reliable for the main gate |
| `workers` | `1` | Tests share one database, so they run one at a time |
| `retries` | `0` | A failure is reported as a failure, never hidden by a retry |
| `forbidOnly` | `true` in CI | Prevents a developer accidentally committing `test.only` |
| `timeout` | 30 s per test | A hung test stops |
| `expect` timeout | 7 s | How long an assertion waits before failing |
| `globalTimeout` | 10 minutes | A hung suite still ends and writes reports |
| Reporters | `list` (terminal), `html`, `json` | Human-readable live output, browsable report, machine-readable result |
| `baseURL` | `PLAYWRIGHT_BASE_URL` = `http://frontend` | Reach the app by Compose service name |

## Docker

**What problem it solves here.** Without Docker, a reviewer would need to install PostgreSQL 18, Node.js 24, Nginx,
Chromium plus all of Chromium's Linux system libraries, and the exact Playwright version. With Docker, the only
requirement on the laptop is Docker itself. Every component runs from a pinned, versioned image, so it behaves the
same on every machine.

Images built by this project (all tagged `:local`): `opsdesk-backend:local`, `opsdesk-frontend:local`,
`opsdesk-e2e:local`, `opsdesk-report-viewer:local`. Images pulled from registries: `postgres:18-alpine`,
`node:24-alpine` (build stage only), `nginx:1.29-alpine`, `mcr.microsoft.com/playwright:v1.64.0-noble` (about 3.5 GB).

The backend and frontend use **multi-stage builds**: a Node.js stage compiles the TypeScript/React code, and only the
compiled result goes into the small final image.

The `e2e/Dockerfile` contains a safety check: it fails the image build if the `@playwright/test` npm version does not
exactly equal the Playwright image version. Whenever that image layer is rebuilt (for example on the first build),
the build prints `Playwright package/image version match: 1.64.0`.

## Docker Compose

**What it does in this repository**, concretely:

| Compose concept | Where | What it does here |
| --- | --- | --- |
| Service definitions | `compose.yml` | Defines `db`, `backend`, `frontend`, `tests`, `report-viewer`. |
| Building images | `build:` entries | Builds `./backend`, `./frontend`, `./e2e`, `./report-viewer` from their Dockerfiles. |
| Network creation | automatic | Creates `opsdesk-demo_default` so services find each other by name. |
| Environment variables | `environment:` | Passes `DATABASE_URL`, `JWT_SECRET`, `ENABLE_TEST_ENDPOINTS`, `FAULT_INJECTION_MODE`, `PLAYWRIGHT_BASE_URL` … into containers. |
| Health checks | `healthcheck:` | Defines how Docker decides each service is "healthy". |
| `depends_on` + `condition: service_healthy` | `compose.yml` | `backend` waits for `db` to be healthy; `frontend` waits for `backend`; `tests` waits for `backend` **and** `frontend`. No `sleep` commands anywhere. |
| Temporary database | `compose.demo.yml` | Puts PostgreSQL's data on `tmpfs` (memory). Every phase starts from the committed schema and seed data. |
| Profiles | `compose.yml` | `tests` is in profile `test`, `report-viewer` in profile `report`, so `docker compose up` alone only starts the app. |
| Exit-code propagation | the gate command | `--exit-code-from tests` makes Compose return the Playwright container's exit code. |
| Cleanup | `down --volumes --remove-orphans` | Removes the project's containers, network and anonymous/tmpfs data. |

### The quality-gate command, word by word

The demo script runs (for each phase):

```bash
docker compose -f compose.yml -f compose.demo.yml up --abort-on-container-exit --exit-code-from tests tests
```

| Part | Meaning |
| --- | --- |
| `docker compose` | Use Docker Compose (the `docker compose` plugin; v5.5.1 on this laptop). |
| `-f compose.yml -f compose.demo.yml` | Combine the base file with the demo overlay (later files override earlier ones). |
| `up` | Create and start services. |
| `--abort-on-container-exit` | As soon as any container stops (the `tests` container stops when tests finish), stop the run. |
| `--exit-code-from tests` | Make this whole command exit with **the `tests` container's exit code**. |
| `tests` (the last word) | Start the `tests` service (Compose also starts its dependencies and waits for them to be healthy). |

## The quality gate explained

**Running tests** means: tests execute and print results. A human then reads the output and decides what to do.

**A quality gate** means: the test result is turned into a **machine decision** that automatically allows or blocks
the next step. Nobody has to read anything for the decision to happen.

```text
Playwright finishes
      │
      ├── all tests passed ──► exit code 0 ──► Compose exits 0 ──► script / CI step = SUCCESS (green)
      │
      └── any test failed ───► exit code 1 ──► Compose exits 1 ──► script / CI step = FAILURE (red)
```

- Every program returns an **exit code**. `0` = success. Non-zero (here `1`) = failure.
- Playwright returns `1` if any test fails.
- `--exit-code-from tests` passes that number through Docker Compose unchanged.
- In GitHub Actions, any step whose command exits non-zero marks the job **red** and stops the pipeline. The workflow
  step running this command has no `|| true`, so the failure is never hidden.

You can see an exit code yourself: right after any command finishes, type `echo $?`.

## PostgreSQL

A real relational database, so the tests check **real persistence** (data actually stored and read back), not just
screens. The schema is in `database/init/001_schema.sql`; the deterministic seed data is in
`database/init/002_seed.sql` as a function `reset_demo_data()` that empties the tickets table and inserts the same six
tickets every time. Passwords are stored as bcrypt hashes, never in plain text.

## Node.js / Express (backend)

The REST API in `backend/src/`. Uses `pg` (parameterized SQL — safe against SQL injection), `zod` (input validation),
`bcryptjs` (password checking) and `jsonwebtoken` (login tokens).

## React / Vite / TypeScript (frontend)

The user interface in `frontend/src/`, built by Vite into static files and served by Nginx. The UI uses proper labels
and roles (for example a button named "Sign in", a table named "Tickets"), which makes the Playwright locators simple
and stable.

## GitHub Actions

GitHub's built-in CI service. The file `.github/workflows/e2e-quality-gate.yml` tells GitHub to run the **same
Docker Compose quality gate** automatically on pushes and pull requests to `main`. Details are in section 18.

## Git

Version control. The pipeline is "defined as code": Dockerfiles, Compose files, tests and workflows are all committed,
so every run is reproducible from a commit.

---

# 5. Files and Folders I Should Know

## Repository map (only what matters)

```text
devops_ia/
├── compose.yml                 Base services, health checks, depends_on (the architecture)
├── compose.demo.yml            Demo overlay: tmpfs DB, no app ports, fault switch, per-phase artifacts
├── compose.ci.yml              CI overlay: CI=true, fault pinned to "none" unless manually requested
├── .env.example                Demo-only default settings (copying it to .env is optional)
├── scripts/
│   ├── demo.sh                 THE presentation script (pass | fail | full | ci | report)
│   ├── demo.ps1                Same script for Windows PowerShell
│   ├── clean.sh / clean.ps1    Project-only cleanup
├── demo.sh / demo.ps1          Shortcuts: ./demo.sh full == ./scripts/demo.sh full
├── backend/
│   ├── Dockerfile
│   └── src/
│       ├── routes/tickets.ts       Ticket API + THE FAULT INJECTION branch
│       ├── services/ticketService.ts  SQL, incl. createWithoutPersisting() used by the fault
│       ├── routes/health.ts        GET /health (also checks the database)
│       ├── routes/testSupport.ts   POST /api/test/reset (test-only)
│       ├── config/env.ts           Allowed FAULT_INJECTION_MODE values: none | drop_ticket_write
│       └── server.ts               Startup log lines, incl. the fault WARNING banner
├── frontend/                   React app + nginx.conf (/api proxy) + Dockerfile
├── database/init/              001_schema.sql, 002_seed.sql
├── e2e/
│   ├── Dockerfile              Playwright image + version-match check
│   ├── playwright.config.ts    Browser, workers, retries, reporters, artifacts
│   ├── fixtures/test.ts        Auto-reset of the database before every test
│   ├── helpers/                Login helper, seed ticket names, table helpers
│   ├── tests/auth.spec.ts      E2E-01, 02, 03
│   ├── tests/session.spec.ts   E2E-12
│   ├── tests/tickets.spec.ts   E2E-04 … E2E-10
│   ├── tests/validation.spec.ts E2E-11
│   └── scripts/summarize-results.mjs  Prints [PASS]/[FAIL] summary; checks "expected failure"
├── report-viewer/              Nginx + landing page for http://localhost:9323
├── .github/workflows/
│   ├── e2e-quality-gate.yml    The CI quality gate (push/PR to main, manual)
│   └── nightly-cross-browser.yml  Optional daily Chromium/Firefox/WebKit run
├── artifacts/                  Generated reports (not committed): pass/, failure/, recovery/, latest/
├── README.md                   Full project documentation
├── IMPLEMENTATION.md           The original specification
└── PRESENTATION_GUIDE.md       This file
```

## Presentation-worthy files

Open these in a code editor (for example VS Code) if the examiner wants to see code. Do not show line numbers from
memory; search for the quoted text instead (Cmd+F).

### `compose.yml`

- **Why show it:** it *is* the architecture, written as code.
- **What to point at:** the five services; each `healthcheck:` block; the `depends_on:` blocks containing
  `condition: service_healthy`; the `tests` service using `build: ./e2e`.
- **What to say:** "This file defines the whole environment. Notice there are no sleep commands: the backend waits for
  the database to be *healthy*, the frontend waits for the backend, and the tests wait for both."
- **Do not waste time on:** the `x-postgres-env` anchor, `start_interval`, `ipc: host`, `user:`.

### `compose.demo.yml`

- **Why show it:** shows how the same stack becomes a throw-away test environment.
- **What to point at:** `tmpfs: - /var/lib/postgresql` (fresh database each run), `ports: !reset []` (no ports),
  `FAULT_INJECTION_MODE: ${FAULT_INJECTION_MODE:-none}` (the fault switch, default `none`).
- **What to say:** "The demo overlay is the only place the fault switch reaches the backend, and its default is none."

### `backend/src/routes/tickets.ts`

- **Why show it:** this is the fault injection itself.
- **What to point at:** search for `drop_ticket_write`. The block calls `tickets.createWithoutPersisting(...)`, logs
  `DEMO FAULT drop_ticket_write: acknowledged ticket ... but did NOT save it`, and still answers `res.status(201)`.
- **What to say:** "When the switch is on, the API validates the request and returns 201 Created with a realistic
  ticket — but skips the database insert. No source code is edited during the demo; only an environment variable
  changes."
- **Do not waste time on:** Zod schemas, `parseId`, the update/delete routes.

### `e2e/tests/tickets.spec.ts`

- **Why show it:** the test that catches the bug.
- **What to point at:** the test `E2E-04 create ticket and find it again after reload` and its three `test.step`
  blocks: create via the dialog, `page.reload()` and search, then the assertion with the message
  `should be listed after reload - was it really saved?`.
- **What to say:** "The test does not trust the success message. It reloads the page — throwing away everything the
  browser remembers — and searches the database-backed list. That is what a real user would notice."

### `e2e/playwright.config.ts`

- **Why show it:** proves screenshots/video/trace are captured automatically.
- **What to point at:** `retries: 0`, `workers: 1`, `screenshot: 'only-on-failure'`, `trace: 'retain-on-failure'`,
  `video: 'retain-on-failure'`, the three reporters.

### `scripts/demo.sh`

- **Why show it:** shows the gate logic and the "expected failure" logic.
- **What to point at:** in `run_phase`, the line with `--abort-on-container-exit --exit-code-from tests tests` followed
  by `GATE_EXIT=$?`; in `phase_fail`, the check `if [[ $GATE_EXIT -eq 0 ]]` ("regression NOT detected"); in
  `mode_full`, the final condition `baseline == PASS && regression == DETECTED && recovery == PASS`.
- **Do not waste time on:** colour helpers, `usage`, `preflight`.

### `.github/workflows/e2e-quality-gate.yml`

- **Why show it:** proves CI uses the same Compose stack.
- **What to point at:** `on:` (push, pull_request, workflow_dispatch), `COMPOSE_FILE:
  compose.yml:compose.demo.yml:compose.ci.yml`, the step "Run E2E quality gate", the step "Upload Playwright
  artifacts" with `if: always()`.

---

# 6. What Happens When I Run the Demo

Command: `./scripts/demo.sh full` (run from the project folder). Times below are from a verified run on this laptop
with images already built (total ≈ 58 s).

```text
Full demo command                                          t = 0 s
        ↓  script checks Docker is installed and running, prints Docker/Compose versions
        ↓  removes any leftover demo containers from earlier runs
Docker builds/loads images                                 t ≈ 1–2 s (cached; first-ever run: several minutes)
        ↓  backend, frontend and Playwright images are (re)built from cache
PHASE 1/3 - BASELINE QUALITY GATE                          t ≈ 2 s
        ↓  FAULT_INJECTION_MODE=none, artifacts go to artifacts/pass/
PostgreSQL starts                                          container opsdesk-demo-db-1 Started
        ↓  init scripts create tables and insert 6 seed tickets into a fresh in-memory database
Database health check passes                               "Container opsdesk-demo-db-1 Healthy"  (~1.5 s)
        ↓  Compose now allows the backend to start (depends_on: db service_healthy)
Backend starts                                             logs "connected to database", "fault injection mode: none"
        ↓
Backend health check passes                                GET /health → {"status":"ok","database":"ok"}  (~1.5 s)
        ↓  Compose now allows the frontend to start
Frontend starts                                            Nginx serves the React build
        ↓
Frontend health check passes                               "Container opsdesk-demo-frontend-1 Healthy"
        ↓  script prints [OK] Database healthy / Backend healthy / Frontend healthy
        ↓  script confirms from the backend log that fault injection is OFF
Playwright container starts                                "Running 12 tests using 1 worker"
        ↓  before EVERY test, the database is reset to the 6 seed tickets
12 E2E tests execute                                       ✓ 1 … ✓ 12   "12 passed (6.8s)"
        ↓  tests container exits with code 0 → Compose exits 0
BASELINE PASS                                              "[OK] Playwright suite passed - quality gate is GREEN"
        ↓  backend log saved to artifacts/pass/backend.log, containers removed
PHASE 2/3 - CONTROLLED REGRESSION                          t ≈ 17 s
Environment recreated with fault injection                 FAULT_INJECTION_MODE=drop_ticket_write; brand-new DB
        ↓  backend prints "WARNING: DEMO FAULT INJECTION ACTIVE"
        ↓  same health-check chain as Phase 1; all three healthy
E2E-04 detects ticket persistence regression               test 5 waits ~8 s, then "✘ 5 … E2E-04 …"
        ↓  the other 11 tests still pass → proves the rest of the app and Docker are fine
EXPECTED FAILURE                                           "1 failed / 11 passed", exit code 1
        ↓  script checks: did it fail? was it exactly E2E-04? are the artifacts there?
Screenshot / video / trace / HTML report saved             artifacts/failure/...
        ↓  "[EXPECTED FAILURE] E2E-04 Create Ticket (Playwright exit code 1)"
        ↓  "[OK] Regression detected by quality gate"
PHASE 3/3 - RECOVERY                                       t ≈ 40 s
Fault removed                                              FAULT_INJECTION_MODE=none again
Environment recreated                                      fresh containers + fresh database
        ↓  health checks pass, "[OK] Fault injection disabled"
12 tests execute again                                     "12 passed"
RECOVERY PASS                                              "[OK] Playwright suite passed - quality gate is GREEN"
PHASE 4 - REPORT                                           t ≈ 56 s
Report viewer starts                                       "Playwright report: http://localhost:9323"
Final demonstration success                                "FINAL RESULT: DEMONSTRATION SUCCESSFUL"   t ≈ 58 s
                                                           script exit code 0
```

What changed at each arrow, in short: the script only ever changes **two environment variables** between phases —
`FAULT_INJECTION_MODE` (`none` → `drop_ticket_write` → `none`) and `ARTIFACT_PHASE` (`pass` → `failure` →
`recovery`, which decides the artifacts folder). Everything else (images, tests, Compose files) is identical across
the three phases. Each phase destroys and recreates all containers, so no state leaks between phases.

---

# 7. Before Presentation Day

Do all of this at least one day before.

## A. Make sure the project folder is correct and up to date

```bash
cd "/Users/parthspalav/Documents/College/Semester 7/DevOps/Theory IA/devops_ia"
git status
git log --oneline -3
```

Expected: `On branch main`, `nothing to commit, working tree clean` (or only `PRESENTATION_GUIDE.md` if you have not
committed it), and the commit `1d1557f docker tested` (or newer) at the top.

## B. Run the complete demo once while connected to the Internet

```bash
./scripts/demo.sh full
echo $?
```

Expected: `FINAL RESULT: DEMONSTRATION SUCCESSFUL`, then `0`.

Why: the first-ever run downloads base images (the Playwright image alone is about 3.5 GB) and npm packages.
After one successful run, everything is cached and **the demo works without Internet** (verified with an isolated
offline Docker daemon; the Dockerfiles deliberately have no `# syntax=` line because that line makes every build
contact Docker Hub).

## C. Confirm the images are cached

```bash
docker image ls --format '{{.Repository}}:{{.Tag}}' | grep -E 'opsdesk|playwright|postgres|node:24|nginx:1.29'
```

Expected (order may differ):

```text
opsdesk-e2e:local
opsdesk-frontend:local
opsdesk-backend:local
opsdesk-report-viewer:local
mcr.microsoft.com/playwright:v1.64.0-noble
postgres:18-alpine
node:24-alpine
nginx:1.29-alpine
```

## D. Practise the report clicks

Open `http://localhost:9323` and practise sections 14 and 15 of this guide until you can do them without reading.

## E. Check ports

```bash
lsof -nP -iTCP:9323 -sTCP:LISTEN
lsof -nP -iTCP:8080 -sTCP:LISTEN
```

- Port `9323` should be free or used by `com.docker` (that is the project's own report viewer — fine).
- Port `8080`: on this laptop a Java program (`/opt/homebrew/opt/openjdk@21/bin/java`) was found listening on
  `127.0.0.1:8080`. It does **not** affect the demo. It only matters if you show the live app (section 16): then
  always type `http://localhost:8080`, never `http://127.0.0.1:8080` (that address reaches the Java program, which
  answers `403`). Easiest: quit that Java program before presenting.

## F. Test cleanup and a restart

```bash
./scripts/clean.sh
./scripts/demo.sh full
```

Expected: cleanup prints `[OK] OpsDesk containers and networks removed` and `[..] Artifacts kept in ./artifacts`; the
demo succeeds again.

## G. Make a safety copy of good reports

After a successful run:

```bash
cp -R artifacts ~/Desktop/opsdesk-artifacts-backup
```

If the live demo ever fails, you can restore and show these (section 25, procedure E).

## H. Laptop

- Charger packed and plugged in (Docker is CPU-heavy; low-power mode slows it).
- Disable sleep/screen saver for the presentation.
- Increase the Terminal font size (Cmd + `+`) so the audience can read it.

---

# 8. Starting From a Completely Closed State

Use this when the laptop has just been switched on, or nothing is open.

## Step 8.1 — Start Docker Desktop

### What I do

Open **Docker Desktop** (Applications folder, or Spotlight: Cmd+Space, type `Docker`, Enter).

### What I should see

The whale icon appears in the macOS menu bar. Wait until Docker Desktop says it is running (the whale icon stops
animating). **NOT VERIFIED:** the exact Docker Desktop window wording.

### Check from Terminal

```bash
docker info --format '{{.ServerVersion}}'
```

Expected: a version number such as `29.7.2`. If you get an error mentioning "Cannot connect to the Docker daemon",
Docker is not running yet — wait and retry.

## Step 8.2 — Open Terminal in the project folder

```bash
cd "/Users/parthspalav/Documents/College/Semester 7/DevOps/Theory IA/devops_ia"
ls
```

Expected: you see `compose.yml`, `scripts`, `backend`, `frontend`, `e2e`, `README.md`, `PRESENTATION_GUIDE.md`.

## Step 8.3 — Make sure nothing from a previous attempt is left over

```bash
./scripts/clean.sh
```

Expected last lines:

```text
[OK] OpsDesk containers and networks removed
[..] Artifacts kept in ./artifacts (use --artifacts to delete them)
```

This touches only this project's containers (Compose projects `opsdesk`, `opsdesk-demo`, `opsdesk-ci`). It never
deletes images, other projects, or reports.

## Step 8.4 — Open the browser

Open Chrome (or your usual browser) with one empty tab, ready for `http://localhost:9323` later.

You are now ready for section 9.

---

# 9. Full Live Demonstration — Step by Step

## Step 1 — Explain the architecture before typing anything

### What I do

Show the architecture diagram from section 3 (or open `compose.yml`), and talk for about one minute.

### What I should say

> "OpsDesk is a support-ticket application with a React frontend, a Node.js API and a PostgreSQL database. Every
> component, including a dedicated Playwright test runner, runs in its own Docker container. Docker Compose starts
> them in order and only lets the tests begin once health checks confirm each service is genuinely ready. The test
> result then acts as an automatic quality gate."

### What NOT to do

Do not start the demo command yet — the first phase finishes in about 15 seconds, and you want the audience
listening when it starts.

## Step 2 — Start the full demonstration

### What I do

Click into the Terminal window (already in the project folder) and type the command.

### Command

```bash
./scripts/demo.sh full
```

### What I should see

```text
[..] Docker version 29.7.2, build a7dcaa6
[..] Docker Compose version v5.5.1
[..] Building images (backend, frontend, Playwright tests)...
 ... build progress lines ...
[OK] Images built
```

### What is happening internally

The script checks Docker is available, removes leftovers from previous runs, and builds the four project images.
Because everything is cached, the build takes about 1–2 seconds. (On the very first run on a new machine it takes
several minutes.)

### Why this matters

The environment is created from code in the repository — nobody installs anything by hand.

### What I should say

> "One command builds every image and runs the entire demonstration with no manual steps."

### What NOT to do

Do not press any key. Do not press Ctrl-C. Do not close the Terminal. From now on, **just watch** until
`FINAL RESULT`.

## Step 3 — Watch Phase 1 (see section 10 for full detail)

Wait for `PHASE 1/3 - BASELINE QUALITY GATE`, the three `[OK] … healthy` lines, the 12 green ticks, and
`[OK] Playwright suite passed - quality gate is GREEN`.

## Step 4 — Watch Phase 2 (see sections 11 and 12)

Wait for `PHASE 2/3 - CONTROLLED REGRESSION`, the fault warning, the ~8-second pause on test 5, the red `✘` on
E2E-04, and `[OK] Regression detected by quality gate`.

## Step 5 — Watch Phase 3 (see section 13)

Wait for `PHASE 3/3 - RECOVERY` and the 12 green ticks again.

## Step 6 — Read the final summary

### What I should see

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
Artifacts: artifacts/pass  artifacts/failure  artifacts/recovery
Duration: 58s
==================================================
```

### Optional proof of the script's exit code

```bash
echo $?
```

Expected: `0`.

### What I should say

> "The script's final verdict is based on three conditions: the baseline passed, the regression was detected, and
> recovery passed. All three are true, so the demonstration succeeded with exit code zero."

## Step 7 — Open the report (sections 14 and 15)

Switch to the browser and go to `http://localhost:9323`.

## Step 8 — Optional extras (time permitting)

- Show the live application (section 16).
- Show Docker containers (section 17).
- Show the GitHub Actions workflow file (section 18).

## Terminal-only sequence (chronological)

This is every terminal action in a full presentation, in order.

### Command

```bash
cd "/Users/parthspalav/Documents/College/Semester 7/DevOps/Theory IA/devops_ia"
```

- **Run this when:** first, before anything else.
- **Expected exit code:** `0`.
- **Important output:** none.
- **What it does:** moves the Terminal into the project folder (quotes needed because of spaces).

### Command

```bash
./scripts/clean.sh
```

- **Run this when:** 5 minutes before presenting (not in front of the audience unless needed).
- **Expected exit code:** `0`.
- **Important output:** `[OK] OpsDesk containers and networks removed`.
- **What it does:** runs `docker compose … down --remove-orphans` for the three OpsDesk Compose projects only.

### Command

```bash
./scripts/demo.sh full
```

- **Run this when:** the live demonstration starts.
- **Expected exit code:** `0`.
- **Important output:** `PHASE 1/3`, `quality gate is GREEN`, `PHASE 2/3`, `[EXPECTED FAILURE] E2E-04`,
  `Regression detected by quality gate`, `PHASE 3/3`, `FINAL RESULT: DEMONSTRATION SUCCESSFUL`,
  `Playwright report: http://localhost:9323`.
- **What it does:** baseline → controlled regression → recovery → report viewer, with all checks automated.

### Command

```bash
echo $?
```

- **Run this when:** immediately after the demo finishes (before any other command).
- **Expected output:** `0`.
- **What it does:** prints the exit code of the previous command — the machine-readable verdict.

### Command (optional, after the demo)

```bash
docker ps --filter name=opsdesk --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

- **Run this when:** you want to show what is still running.
- **Expected output after the demo:** only `opsdesk-demo-report-viewer-1   Up … (healthy)   0.0.0.0:9323->80/tcp …`.
- **What it does:** lists this project's containers. The app containers were removed on purpose at the end of each
  phase.

### Command (optional, to show the app)

```bash
docker compose up -d --build --wait
docker compose ps
```

- **Run this when:** you want to show the real application in the browser (section 16).
- **Expected exit code:** `0`.
- **Important output:** `Container opsdesk-db-1 Healthy`, `Container opsdesk-backend-1 Healthy`,
  `Container opsdesk-frontend-1 Healthy`; then a table with three services `Up … (healthy)` and ports `8080` and
  `3000`.
- **What it does:** starts the development stack (project `opsdesk`) with a persistent database volume.

### Command (optional, at the very end)

```bash
docker compose down
```

- **What it does:** stops the development stack started above (its data volume is kept).

---

# 10. Phase 1 — Baseline Quality Gate

## Step 10.1 — Health-aware startup

### What I do

Nothing. Watch the Terminal.

### What I should see

```text
==================================================
PHASE 1/3 - BASELINE QUALITY GATE
==================================================

[..] Removing any previous demo containers (fresh tmpfs database = deterministic seed data)
[..] Starting db -> backend -> frontend and waiting for their health checks...
 Network opsdesk-demo_default Created
 Container opsdesk-demo-db-1 Started
 Container opsdesk-demo-db-1 Waiting
 Container opsdesk-demo-db-1 Healthy
 Container opsdesk-demo-backend-1 Started
 Container opsdesk-demo-backend-1 Waiting
 Container opsdesk-demo-backend-1 Healthy
 Container opsdesk-demo-frontend-1 Started
 Container opsdesk-demo-frontend-1 Healthy
[OK] Database healthy
[OK] Backend healthy
[OK] Frontend healthy
[OK] Fault injection disabled (backend log: 'fault injection mode: none')
```

(Some "Creating/Created/Waiting" lines are omitted above; the order of Started → Healthy is what matters.)

### What is happening internally

- `db` starts; PostgreSQL runs `001_schema.sql` and `002_seed.sql`; Docker runs `pg_isready` until it succeeds.
- Only then does Compose start `backend` (because of `depends_on: db: condition: service_healthy`). The backend logs
  `connected to database` and `fault injection mode: none`. Docker calls `/health` until it answers 200.
- Only then does Compose start `frontend`. Docker checks that Nginx serves `index.html`.
- The script reads Docker's health status for each container and prints the `[OK] … healthy` lines, then reads the
  backend log to confirm the fault is off.

### Why this matters

"Running" is not the same as "ready". A database container can be running while it is still initialising. Health
checks replace guesswork like `sleep 10`, which is either too long (slow) or too short (random failures).

### What I should say

> "Notice the order: the backend did not start until the database was healthy, and the frontend did not start until
> the backend was healthy. Readiness is checked, not guessed — there are no sleep commands anywhere."

### What NOT to do

Do not interrupt; this part takes only about 5 seconds.

## Step 10.2 — Playwright runs the 12 tests

### What I should see

```text
[..] Running the Playwright quality gate (artifacts -> artifacts/pass)
Attaching to tests-1
tests-1  | Running 12 tests using 1 worker
tests-1  |   ✓   1 [chromium] › tests/auth.spec.ts:5:3 › Authentication › E2E-01 valid login shows the dashboard with ticket metrics (349ms)
tests-1  |   ✓   2 [chromium] › tests/auth.spec.ts:18:3 › Authentication › E2E-02 invalid password shows an error and stays on the login page (295ms)
tests-1  |   ✓   3 [chromium] › tests/auth.spec.ts:28:3 › Authentication › E2E-03 protected route redirects unauthenticated users to login (267ms)
tests-1  |   ✓   4 [chromium] › tests/session.spec.ts:5:3 › Session › E2E-12 logout clears the session and protects content again (432ms)
tests-1  |   ✓   5 [chromium] › tests/tickets.spec.ts:25:3 › Ticket lifecycle › E2E-04 create ticket and find it again after reload (790ms)
tests-1  |   ✓   6 [chromium] › tests/tickets.spec.ts:57:3 › Ticket lifecycle › E2E-05 edit ticket title and description (577ms)
tests-1  |   ✓   7 [chromium] › tests/tickets.spec.ts:79:3 › Ticket lifecycle › E2E-06 change ticket status from OPEN to IN_PROGRESS (563ms)
tests-1  |   ✓   8 [chromium] › tests/tickets.spec.ts:94:3 › Ticket lifecycle › E2E-07 search tickets by title (1.0s)
tests-1  |   ✓   9 [chromium] › tests/tickets.spec.ts:111:3 › Ticket lifecycle › E2E-08 filter tickets by status (375ms)
tests-1  |   ✓  10 [chromium] › tests/tickets.spec.ts:127:3 › Ticket lifecycle › E2E-09 filter tickets by priority (375ms)
tests-1  |   ✓  11 [chromium] › tests/tickets.spec.ts:144:3 › Ticket lifecycle › E2E-10 delete ticket after confirmation (802ms)
tests-1  |   ✓  12 [chromium] › tests/validation.spec.ts:6:3 › Validation › E2E-11 required fields block ticket creation (478ms)
tests-1  |   12 passed (6.8s)
tests-1 exited with code 0
[..] Playwright container exit code: 0
  [PASS] E2E-01 valid login shows the dashboard with ticket metrics (chromium)
  ... (one [PASS] line per test) ...
  Total: 12   Passed: 12   Failed: 0
[OK] Playwright suite passed - quality gate is GREEN
```

Note on order: Playwright runs test **files** alphabetically (`auth`, `session`, `tickets`, `validation`), so E2E-12
(logout) runs 4th and E2E-04 runs 5th. The numbers on the left (1–12) are run order, not test IDs.

### What is happening internally

- The `tests` container starts only after `backend` and `frontend` are healthy.
- Before **every** test, an automatic fixture (`e2e/fixtures/test.ts`) calls `POST /api/test/reset`, which restores
  the six seed tickets. Tests therefore never depend on each other.
- Chromium (headless) logs in through the real login form and performs each scenario.
- When all pass, Playwright exits `0`; Compose exits `0` because of `--exit-code-from tests`; the script stores that
  as the gate result.
- The `[PASS]` list is printed by `e2e/scripts/summarize-results.mjs`, run inside the Playwright image, reading
  `artifacts/pass/results.json` (so the laptop needs no Node.js).

### Why this matters

This is the quality gate in its "green" state: a real browser verified 12 user journeys, and the decision is a
number (`0`), not a human opinion.

### What I should say

> "Playwright has just driven a real Chromium browser through twelve user journeys — login, ticket creation, editing,
> search, filtering, deletion, validation and logout — in about seven seconds. The container exited with code zero,
> so the quality gate is green."

## The 12 tests explained

Seed data used by the tests (restored before every test):

| ID | Title | Priority | Status |
| --- | --- | --- | --- |
| #1 | Database connection timeout | HIGH | OPEN |
| #2 | Update onboarding documentation | LOW | IN_PROGRESS |
| #3 | Fix dashboard alignment | MEDIUM | RESOLVED |
| #4 | Password reset email not delivered | HIGH | IN_PROGRESS |
| #5 | Add CSV export for reports | LOW | OPEN |
| #6 | Intermittent 502 on login page | MEDIUM | OPEN |

Totals: 6 tickets = 3 OPEN, 2 IN_PROGRESS, 1 RESOLVED. Demo login: `demo@example.com` / `Demo123!`.

## E2E-01 — valid login shows the dashboard with ticket metrics

File: `e2e/tests/auth.spec.ts`

### What Playwright does

Opens `/login`, fills **Email** and **Password** with the demo credentials, clicks **Sign in**, waits for the
**Dashboard** heading, then checks the URL is `/`, the stat cards show **Total tickets 6**, **Open 3**,
**In progress 2**, **Resolved 1**, the **Recent tickets** heading is visible, and the sidebar shows
`Signed in as demo@example.com`.

### What a human would normally have to do manually

Open the site, log in, and count tickets by status to confirm the dashboard numbers are right.

### What success proves

Authentication works end to end (frontend → Nginx → backend → database password check → token), and the dashboard
correctly computes metrics from real database data.

### What failure would mean

Users cannot log in, or the dashboard shows wrong numbers.

## E2E-02 — invalid password shows an error and stays on the login page

File: `e2e/tests/auth.spec.ts`

### What Playwright does

Submits the demo email with the password `definitely-the-wrong-password`, then checks an alert shows exactly
`Invalid email or password`, the URL is still `/login`, the **Sign in** heading is still visible, and no login token
was stored in the browser (`localStorage` key `opsdesk.auth` is empty).

### What a human would normally have to do manually

Try a wrong password and confirm access is refused with a clear message.

### What success proves

Wrong credentials are rejected, the user gets visible feedback, and no session is created.

### What failure would mean

A security problem (wrong password accepted) or a usability problem (no error shown).

## E2E-03 — protected route redirects unauthenticated users to login

File: `e2e/tests/auth.spec.ts`

### What Playwright does

Clears cookies, goes directly to `/tickets` without logging in, checks it is redirected to `/login` and that no
**Tickets** heading is shown. Then it logs in and checks it is taken back to `/tickets` (the page originally asked
for).

### What a human would normally have to do manually

Paste a private URL into a fresh browser and confirm the content is blocked.

### What success proves

Private pages cannot be opened without logging in, and the redirect-back behaviour works.

### What failure would mean

Unauthenticated visitors can see ticket data.

## E2E-04 — create ticket and find it again after reload

File: `e2e/tests/tickets.spec.ts` — **this is the test deliberately broken by fault injection.**

### What Playwright does

Three named steps:

1. **Create a ticket through the "New ticket" dialog** — opens **Tickets**, clicks **New ticket**, fills **Title**
   with a unique name like `PW-1792073615682-create-ticket` (`PW-<timestamp>-create-ticket`), fills
   **Description**, selects **Priority** `HIGH`, clicks **Create ticket**, checks the dialog closes and a
   notification says `Ticket #<number> created`.
2. **Reload the page and search for the new ticket by title** — `page.reload()` throws away everything the browser
   remembers, then types the title into **Search tickets**.
3. **Verify the ticket was persisted** — expects the ticket row to be visible (message if not:
   `should be listed after reload - was it really saved?`), exactly 1 result, priority `HIGH`, status `OPEN`.

### What a human would normally have to do manually

Create a ticket, refresh the page, search for it, and confirm it is really there with the right values.

### What success proves

The whole write path works: browser → API → database **insert** → database **read** → browser.

### What failure would mean

Data loss: the system tells users their ticket was created, but it was never saved.

## E2E-05 — edit ticket title and description

File: `e2e/tests/tickets.spec.ts`

### What Playwright does

Opens ticket **Update onboarding documentation**, changes **Title** to
`Update onboarding documentation for the new VPN` and **Description** to
`Replace the legacy VPN instructions with the WireGuard setup guide.`, clicks **Save changes**, checks the
notification `Ticket #2 updated` and the new heading, **reloads** and checks the new values are still there, then
checks the tickets list shows the new title and not the old one.

### What a human would normally have to do manually

Edit a ticket, save, refresh, and confirm the change stuck.

### What success proves

Updates are saved in the database, not only in the page's memory.

### What failure would mean

Edits are lost, or the list shows stale data.

## E2E-06 — change ticket status from OPEN to IN_PROGRESS

File: `e2e/tests/tickets.spec.ts`

### What Playwright does

Opens **Database connection timeout**, checks the current-state badge says `OPEN`, chooses `IN_PROGRESS` in the
**Status** dropdown, clicks **Save changes**, checks `Ticket #1 updated` and the badge `IN_PROGRESS`, then checks the
tickets list row also shows `IN_PROGRESS`.

### What a human would normally have to do manually

Move a ticket through its workflow and confirm both the detail page and the list agree.

### What success proves

The ticket lifecycle (OPEN → IN_PROGRESS) works and is stored.

### What failure would mean

Teams cannot track progress; status changes are lost or inconsistent.

## E2E-07 — search tickets by title

File: `e2e/tests/tickets.spec.ts`

### What Playwright does

Types `database` into **Search tickets** and checks exactly 1 result (**Database connection timeout**) and that
**Update onboarding documentation** is not shown. Then searches `no-such-ticket-xyz` and checks the empty message
`No tickets match your filters.`. Then clicks **Clear filters** and checks all 6 tickets return.

### What a human would normally have to do manually

Try a matching search, a non-matching search, and clearing the search.

### What success proves

Search is case-insensitive, matches partial titles, excludes non-matches, and the empty state and reset work.

### What failure would mean

Users cannot find tickets, or search shows wrong results.

## E2E-08 — filter tickets by status

File: `e2e/tests/tickets.spec.ts`

### What Playwright does

Selects `RESOLVED` in **Filter by status** → expects exactly 1 ticket (**Fix dashboard alignment**). Selects
`IN_PROGRESS` → expects exactly 2 tickets, checks **every** row shows `IN_PROGRESS`, and that they are **Update
onboarding documentation** and **Password reset email not delivered**.

### What a human would normally have to do manually

Apply each filter and check every row matches.

### What success proves

Status filtering returns exactly the right set — no missing and no extra tickets.

### What failure would mean

Filtered views hide work or show the wrong tickets.

## E2E-09 — filter tickets by priority

File: `e2e/tests/tickets.spec.ts`

### What Playwright does

Selects `HIGH` in **Filter by priority** → expects 2 tickets, every row `HIGH` (**Database connection timeout**,
**Password reset email not delivered**). Then also selects status `OPEN` → expects exactly 1 ticket (**Database
connection timeout**), proving filters combine.

### What a human would normally have to do manually

Apply one filter, then a second, and confirm the intersection.

### What success proves

Priority filtering works and combines correctly with status filtering.

### What failure would mean

Urgent work cannot be isolated reliably.

## E2E-10 — delete ticket after confirmation

File: `e2e/tests/tickets.spec.ts`

### What Playwright does

Opens **Fix dashboard alignment**, clicks **Delete ticket**, checks the confirmation dialog **Delete ticket?**
appears, clicks **Delete**, checks it returns to `/tickets`, the notification `Ticket #3 deleted`, 5 tickets remain,
the row is gone, and searching for its title shows `No tickets match your filters.`.

### What a human would normally have to do manually

Delete a ticket through the confirmation dialog and confirm it is really gone.

### What success proves

Deletion works, is confirmed by the user first, and is permanent in the database.

### What failure would mean

Tickets cannot be removed, or "deleted" tickets reappear.

## E2E-11 — required fields block ticket creation

File: `e2e/tests/validation.spec.ts`

### What Playwright does

Opens **New ticket** and clicks **Create ticket** with an empty form → expects the messages `Title is required` and
`Description is required`, the Title field marked invalid, and the dialog still open. Then fills a title but only
spaces as the description → only `Description is required` remains. Clicks **Cancel** and checks there are still
exactly 6 tickets (nothing was created).

### What a human would normally have to do manually

Try to submit incomplete forms and confirm nothing gets saved.

### What success proves

Input validation works and bad data never reaches the database.

### What failure would mean

Empty or junk tickets could be created.

## E2E-12 — logout clears the session and protects content again

File: `e2e/tests/session.spec.ts`

### What Playwright does

Logs in and checks a token is stored, clicks **Log out**, checks it lands on `/login` and the token is removed, then
tries `/tickets` and `/` directly — both must redirect to `/login`, and no **Dashboard** heading may appear.

### What a human would normally have to do manually

Log out, then try the back button or pasting private URLs.

### What success proves

Logout really ends the session; protected content is inaccessible afterwards.

### What failure would mean

A shared computer could expose the previous user's data.

---

# 11. Phase 2 — Controlled Regression

## Step 11.1 — The environment is recreated with the fault switched on

### What I do

Nothing. Watch the Terminal.

### What I should see

```text
==================================================
PHASE 2/3 - CONTROLLED REGRESSION
==================================================

[..] Removing any previous demo containers (fresh tmpfs database = deterministic seed data)
[..] Starting db -> backend -> frontend and waiting for their health checks...
 ... same Started / Healthy lines as Phase 1 ...
[OK] Database healthy
[OK] Backend healthy
[OK] Frontend healthy
[OK] Fault injection enabled: drop_ticket_write (backend log: 'WARNING: DEMO FAULT INJECTION ACTIVE')
[..] Running the Playwright quality gate (artifacts -> artifacts/failure)
```

### What is happening internally

The script exported `FAULT_INJECTION_MODE=drop_ticket_write` and `ARTIFACT_PHASE=failure`, destroyed the old
containers and created fresh ones. `compose.demo.yml` passes the variable to the backend, which prints at startup:

```text
[backend] ==================================================
[backend] WARNING: DEMO FAULT INJECTION ACTIVE
[backend] mode: drop_ticket_write
[backend] New tickets will be acknowledged but NOT saved.
[backend] ==================================================
```

The script checks the backend log for `DEMO FAULT INJECTION ACTIVE` before running the tests, so the audience can
see the fault really is on.

### Why this matters

The bug is introduced by **configuration**, not by editing code live. It is deterministic (it happens every time),
reversible (switch it off), and off by default.

### What I should say

> "Now the script recreates the exact same environment, with one difference: an environment variable switches on a
> simulated regression in the backend. No source code is being edited. Notice that all three services are still
> healthy — the infrastructure is fine; the bug is in the application's behaviour."

## Step 11.2 — The tests run and E2E-04 fails

### What I should see

```text
tests-1  | Running 12 tests using 1 worker
tests-1  |   ✓   1 … E2E-01 …
tests-1  |   ✓   2 … E2E-02 …
tests-1  |   ✓   3 … E2E-03 …
tests-1  |   ✓   4 … E2E-12 …
                         ← about 8 seconds with no new output here
tests-1  |   ✘   5 [chromium] › tests/tickets.spec.ts:25:3 › Ticket lifecycle › E2E-04 create ticket and find it again after reload (7.9s)
tests-1  |   ✓   6 … E2E-05 …
   … ✓ 7 to ✓ 12 …
tests-1  |   1) [chromium] › tests/tickets.spec.ts:25:3 › Ticket lifecycle › E2E-04 create ticket and find it again after reload › Verify the ticket was persisted
tests-1  |     Error: Ticket "PW-1792073615682-create-ticket" should be listed after reload - was it really saved?
tests-1  |     expect(locator).toBeVisible() failed
tests-1  |     Expected: visible
tests-1  |     Timeout: 7000ms
tests-1  |     Error: element(s) not found
   … source code excerpt and attachment paths (screenshot, video, error-context, trace) …
tests-1  |   1 failed
tests-1  |     [chromium] › tests/tickets.spec.ts:25:3 › Ticket lifecycle › E2E-04 create ticket and find it again after reload
tests-1  |   11 passed (14.1s)
tests-1 exited with code 1
[..] Playwright container exit code: 1
  [PASS] E2E-01 …
  [PASS] E2E-02 …
  [PASS] E2E-03 …
  [PASS] E2E-12 …
  [FAIL] E2E-04 create ticket and find it again after reload (chromium)
         reason: Error: Ticket "PW-…-create-ticket" should be listed after reload - was it really saved?
         screenshot    artifacts/failure/test-results/tickets-Ticket-lifecycle-E-f37f6--find-it-again-after-reload-chromium/test-failed-1.png
         video         artifacts/failure/test-results/…/video.webm
         error-context artifacts/failure/test-results/…/error-context.md
         trace         artifacts/failure/test-results/…/trace.zip
  [PASS] E2E-05 … through E2E-11 …
  Total: 12   Passed: 11   Failed: 1
[EXPECTED FAILURE] E2E-04 Create Ticket (Playwright exit code 1)
[OK] Regression detected by quality gate
[OK] Failure trace, screenshot, video and HTML report preserved in artifacts/failure/
```

(The timestamp number in the ticket title changes on every run.)

### The 8-second pause

After test 4, the screen is quiet for about 8 seconds. This is Playwright waiting up to 7 seconds for the created
ticket to appear in the search results — it never appears. Fill this pause by talking:

> "Playwright is now waiting for the ticket it just created to appear after a reload. It is giving the application
> seven seconds. The ticket will never appear, because the backend never saved it."

### What NOT to do

Do not press anything during the pause. The red `✘` and the word `failed` are **expected**. Do not apologise; this
is the highlight of the demo.

---

# 12. Understanding the Expected Failure

## What `FAULT_INJECTION_MODE=drop_ticket_write` means

`FAULT_INJECTION_MODE` is an environment variable read by the backend at startup (`backend/src/config/env.ts`).
Only two values are allowed: `none` (default) and `drop_ticket_write`. Any other value makes the backend refuse to
start. `drop_ticket_write` means "drop (discard) ticket writes".

## Where it is applied

| Place | What happens |
| --- | --- |
| `scripts/demo.sh` | Phase 2 exports `FAULT_INJECTION_MODE=drop_ticket_write`; phases 1 and 3 export `none`. |
| `compose.demo.yml` | Forwards `FAULT_INJECTION_MODE: ${FAULT_INJECTION_MODE:-none}` to the backend. This is the **only** Compose file that forwards it; `compose.yml` alone never does (verified). |
| `compose.ci.yml` | In CI, forces `none` unless a manual GitHub run explicitly asks for the regression. |
| `backend/src/routes/tickets.ts` | The `POST /` handler checks the mode. |
| `backend/src/services/ticketService.ts` | `createWithoutPersisting()` builds a realistic reply without inserting. |

## What still succeeds and what deliberately does not happen

When the browser sends `POST /api/tickets` in fault mode, the backend:

1. **validates** the request normally (empty titles are still rejected),
2. takes the **next real ticket ID** from the database sequence (for example `7`),
3. **does NOT run the SQL `INSERT`** — nothing is written,
4. logs `[backend] DEMO FAULT drop_ticket_write: acknowledged ticket #7 "PW-…" but did NOT save it`,
5. replies **`201 Created`** with a complete, realistic ticket object.

The browser shows the green notification `Ticket #7 created`. Everything *looks* successful.

## Why the HTTP/API response can still look successful

`201 Created` is just what the server *claims*. A simple API check ("did the request return 201?") would pass. A
health check would also pass — the server is up and the database is reachable. This kind of bug (silent data loss) is
exactly what superficial checks miss.

## Why Playwright catches the actual problem

E2E-04 does not stop at the success message. It reloads the page (discarding all browser memory), searches by the
unique title, and asserts the row exists. The search goes all the way to the database, which has no such row. The
assertion `toBeVisible()` waits 7 seconds and fails with `element(s) not found`. Playwright checks the **outcome a
user cares about**, not the server's claim.

## Why only E2E-04 is expected to fail

The fault affects only *creating* tickets. Every other test uses the seed tickets (which are inserted by the database
reset function, not by `POST /api/tickets`) or does not create tickets at all. E2E-11 (validation) opens the create
dialog but never submits valid data, so it is unaffected. The summary script enforces this: if any test other than
E2E-04 fails, the script prints `[WARN] Additional failure not caused by the injected fault: …` and the phase does
not count as a correct detection.

## Why healthy containers prove it is an application regression

Before the tests, the script printed `[OK] Database healthy`, `[OK] Backend healthy`, `[OK] Frontend healthy`, and 11
of 12 tests passed — logins, edits, searches all worked. So Docker, the network, the database and the web server are
fine. A crashed container would be an *infrastructure* failure; this is a *behaviour* failure that only an
end-to-end test can see.

## Why Playwright's exit code is 1

Playwright exits `1` whenever at least one test fails. `docker compose … --exit-code-from tests` passes the `1`
through. In CI, this `1` would turn the pipeline red and block the change.

## Why the outer demo script still eventually exits 0 — and why that is correct

The **inner** gate (Playwright) and the **outer** demonstration script answer different questions:

| Program | Question it answers | Phase 2 answer |
| --- | --- | --- |
| Playwright / Compose (the quality gate) | "Is this version of the application good?" | No → exit `1` |
| `scripts/demo.sh full` (the demonstration) | "Did the quality gate behave correctly in all three situations?" | Yes → exit `0` |

In Phase 2 the script captures the `1` (`GATE_EXIT=$?`) instead of stopping, then checks three things:

1. The gate result is non-zero. (If it were `0`, the script prints `[FAIL] Playwright reported ALL tests passing - the
   injected regression was NOT detected.` and the demo fails.)
2. The failing test is exactly E2E-04 (checked by `summarize-results.mjs --expect-failure E2E-04`).
3. Trace, screenshot, video and HTML report exist in `artifacts/failure/`.

The final verdict is `baseline PASS AND regression DETECTED AND recovery PASS`. Only then does the script print
`FINAL RESULT: DEMONSTRATION SUCCESSFUL` and exit `0`. If any phase misbehaves it prints
`FINAL RESULT: DEMONSTRATION FAILED` and exits `1`.

## An analogy to remember

> **The restaurant waiter.** You order food. The waiter smiles, writes on the notepad, and says "Your order is
> placed!" (that is the `201 Created`). But the waiter never hands the order to the kitchen (that is the skipped
> database insert). If you only check whether the waiter said "placed", everything looks fine. Playwright is the
> customer who actually waits for the plate — and notices that no food ever arrives.

And for the exit codes:

> **The fire drill.** During a fire drill, the alarm going off is a *success* of the drill. Playwright's red result
> in Phase 2 is the alarm; the demo script is the drill inspector who confirms the alarm went off when it should.

---

# 13. Phase 3 — Recovery

## Step 13.1 — Fault removed, environment recreated, tests pass again

### What I do

Nothing. Watch the Terminal.

### What I should see

```text
==================================================
PHASE 3/3 - RECOVERY
==================================================

[..] Removing any previous demo containers (fresh tmpfs database = deterministic seed data)
[..] Starting db -> backend -> frontend and waiting for their health checks...
[OK] Database healthy
[OK] Backend healthy
[OK] Frontend healthy
[OK] Fault injection disabled (backend log: 'fault injection mode: none')
[..] Running the Playwright quality gate (artifacts -> artifacts/recovery)
tests-1  | Running 12 tests using 1 worker
   … ✓ 1 to ✓ 12, including ✓ 5 … E2E-04 create ticket and find it again after reload (786ms) …
tests-1  |   12 passed (6.7s)
tests-1 exited with code 0
[..] Playwright container exit code: 0
  Total: 12   Passed: 12   Failed: 0
[OK] Playwright suite passed - quality gate is GREEN
```

### What is happening internally

The script sets `FAULT_INJECTION_MODE=none` and `ARTIFACT_PHASE=recovery`, destroys the faulty containers, creates
fresh ones with a fresh database, and runs the identical 12 tests. E2E-04 now takes under a second (no waiting)
because the ticket is found immediately.

### Why this matters

A gate is only useful if it can distinguish good from bad. Phase 1 showed green-for-good, Phase 2 red-for-bad, and
Phase 3 shows that the **same test** returns to green as soon as the defect is gone — so the red was caused by the
defect, not by a flaky test.

### What I should say

> "The fault has been switched off and the environment rebuilt from scratch. The very same test that failed a moment
> ago now passes, and the gate is green again. That proves the gate reacts to the application's real behaviour."

---

# 14. Phase 4 — Playwright Report

## Step 14.1 — The report viewer starts automatically

### What I should see in the Terminal

```text
==================================================
PHASE 4 - REPORT
==================================================

[..] Starting the report viewer...
[OK] Report viewer running
Playwright report: http://localhost:9323
```

The report viewer is the `report-viewer` container (Nginx). It **keeps running after the demo ends**, so you can
take your time showing reports. It serves the folder `./artifacts` read-only.

## Step 14.2 — Open the report viewer

### What I do

Switch to the browser.

### Click

**Click:** Browser → address bar → type `http://localhost:9323` → press Enter.

### What I should see (verified)

A dark header **"OpsDesk — Playwright Quality Gate Reports"**, the line
**"Demo flow: Baseline PASS → Controlled regression FAIL (expected) → Recovery PASS"**, and four cards:

| Card | Badge | Text | Buttons / links |
| --- | --- | --- | --- |
| **Phase 1 — Baseline** | green `PASSED` | "Healthy stack. Expected: all tests PASS." · `12 passed · 0 failed · 12 total · <date/time>` | **Open HTML report**, **Files**, **Backend log** |
| **Phase 2 — Controlled regression** | red `FAILED (1)` | "FAULT_INJECTION_MODE=drop_ticket_write. Expected: E2E-04 FAILS." · `11 passed · 1 failed · 12 total` · **"✔ Regression detected, as expected."** · a bullet "E2E-04 create ticket and find it again after reload (chromium)" with links **screenshot**, **video**, **error-context**, **trace** | **Open HTML report**, **Files**, **Backend log** |
| **Phase 3 — Recovery** | green `PASSED` | "Fault removed. Expected: all tests PASS again." · `12 passed · 0 failed · 12 total` | **Open HTML report**, **Files**, **Backend log** |
| **Latest quality-gate run** | `PASSED` or "not generated" | Results of the last `./scripts/demo.sh ci` run, if any | **Open HTML report**, **Files** |

At the bottom: "Browse every file: /reports/".

### What I should say

> "This page summarises the three phases. Phase two is marked failed — and directly underneath, it confirms the
> regression was detected as expected, with links to the evidence Playwright captured automatically."

### Why `localhost` (and not a LAN IP)

The Playwright Trace Viewer uses a browser feature (a service worker) that browsers only allow on `localhost`,
`127.0.0.1`, or HTTPS sites. `http://localhost:9323` and `http://127.0.0.1:9323` both work. Opening the report from
another computer via the laptop's network IP would show a blank trace viewer.

## Step 14.3 — Open the Phase 2 HTML report

### Click

**Click:** in the **Phase 2 — Controlled regression** card → **Open HTML report**.

### What I should see (verified)

The standard Playwright HTML report for the failure phase. At the top, filter links: **All 12**, **Passed 11**,
**Failed 1**, **Flaky 0**, **Skipped 0**, **Speedboard**, a **Settings** button, and a **Search tests** box. Below:
`Project: chromium`, the date, `Total time: 14.1s` (approximately). Then collapsible groups per file
(**tickets.spec.ts**, **auth.spec.ts**, …). The first row in **tickets.spec.ts** is
**"Ticket lifecycle › E2E-04 create ticket and find it again after reload"** marked failed, `chromium 7.9s`, with
links **View video** and **View Trace**.

### What it proves

All 12 tests are accounted for; exactly one failed, and it is the persistence test.

### Optional click

**Click:** **Failed 1** — filters the list to only the failed test. Proves at a glance that nothing else broke.

---

# 15. Exploring Failure Evidence

Do these clicks in this order. Each one proves something specific.

## Click 1 — the E2E-04 test name

**Click:** In the Phase 2 HTML report → **"Ticket lifecycle › E2E-04 create ticket and find it again after reload"**.

**What I see (verified):** the test page with a **Run** tab containing collapsible sections:

- **Errors** — the full error: `Error: Ticket "PW-…-create-ticket" should be listed after reload - was it really
  saved?`, `expect(locator).toBeVisible() failed`, `Expected: visible`, `Timeout: 7000ms`,
  `Error: element(s) not found`, and the source lines 48–53 of `tickets.spec.ts` with an arrow at line 50. (There is
  also a **Copy prompt** button; ignore it.)
- **Test Steps** — **Before Hooks**, **Create a ticket through the "New ticket" dialog** (~181 ms), **Reload the
  page and search for the new ticket by title** (~338 ms), **Verify the ticket was persisted** (~7.0 s, failed),
  **After Hooks**, **Worker Cleanup**.
- **Screenshots** — a thumbnail.
- **Traces** — a thumbnail and a **trace** link.
- **Videos** — a **video** link / player.
- **Attachments** — **error-context**.

**What this proves:** Playwright was not merely checking whether the server was alive. The first two steps
(creating the ticket, reloading and searching) succeeded; only the final check — "is the ticket really there?" —
failed. The error message states precisely what was expected (the row visible) versus what happened (not found).

**What to say:**

> "Creating the ticket succeeded and the success message appeared. Only the last step failed: after a reload, the
> ticket could not be found. Expected: visible. Actual: element not found."

## Click 2 — the screenshot

**Click:** the thumbnail under **Screenshots**.

**What I see (verified):** the OpsDesk **Tickets** page. The **Search tickets** box contains the ticket title
(`PW-…-create-ticket`), the text **"Showing 0 tickets"**, and the empty message **"No tickets match your
filters."**.

**What this proves:** at the exact moment of failure, the user would have seen an empty result for the ticket they
just created. This is the human-visible symptom of the bug.

## Click 3 — the video

**Click:** the **video** link (under **Videos**), or **View video** on the report's list page.

**What I see:** a ~8-second recording (WebM format) of the headless browser: login, the tickets page, the dialog
being filled, the success notification, the reload, the search, and the empty result. **NOT VERIFIED:** playback in
Safari (WebM playback was verified to be served correctly as `video/webm`; Chrome plays WebM).

**What this proves:** a real browser performed real clicks and typing — the "headless" test is not fake.

## Click 4 — the trace

**Click:** **View Trace** (top of the test page), or the thumbnail under **Traces**.

**What I see (verified):** the Playwright Trace Viewer: a filmstrip timeline across the top (0–8 s); on the left an
**Actions** list (**Before Hooks**, **Create a ticket through the "…**, **Reload the page and search…**, **Verify the
ticket was persisted** in red, **After Hooks**, **Attach "error-context"**, **Worker Cleanup**); in the middle a
snapshot of the page with tabs **Action / Before / After**; at the bottom tabs **Locator, Call, Log, Errors (1),
Console, Network (14), Source, Attachments (3), Annotations**.

**What this proves:** the whole run is recorded and replayable step by step, like a flight recorder.

**Useful clicks inside the trace:**

- **Click** the red action **Verify the ticket was persisted** → the snapshot shows the empty search result.
- **Click** the action **Create a ticket through the "New ticket" dialog** (expand it with the arrow) → you can step
  through filling the form and clicking **Create ticket**; the **After** tab shows the success notification.

## Click 5 — the Network tab (the key evidence)

**Click:** bottom panel → **Network** tab. Then **click** the **Fetch** filter button (next to All, HTML, JS, CSS,
Font, Image, WS) to hide page assets.

**What I see (verified, in this order):**

| Name | Method | Status | Meaning |
| --- | --- | --- | --- |
| `reset` | POST | 200 | Test fixture resets the database to the 6 seed tickets |
| `login` | POST | 200 | Playwright logs in as the demo user |
| `tickets` | GET | 200 | Tickets page loads the list |
| `tickets` | GET | 200 | Another list request from the page |
| **`tickets`** | **POST** | **201** | **Create ticket — the server says "Created"** |
| `tickets` | GET | 200 | List refresh after creating |
| `tickets` | GET | 200 | After the page reload |
| `tickets?search=PW-…-create-ticket` | GET | 200 | The search for the new ticket — returns no ticket (the page shows "Showing 0 tickets") |

**Click:** the **POST** row with status **201** → details panel shows **URL** `http://frontend/api/tickets`,
**Method** `POST`, **Status Code** `201 Created`, plus request and response headers (verified).

**What this proves:** the API claimed success (`201 Created`), yet the very next search found nothing. This is the
heart of the demo: **a status-code check would pass, an end-to-end check fails.**

**What to say:**

> "Here is the network log recorded during the test. The create request returned 201 Created — the server claimed
> success. But the search right after the reload returned no ticket. An API-only check would have passed this bug.
> The end-to-end test caught it."

## Click 6 — the backend log (server-side confirmation)

**Click:** go back to `http://localhost:9323` → Phase 2 card → **Backend log**.

**What I see (verified):** a plain-text log including:

```text
[backend] WARNING: DEMO FAULT INJECTION ACTIVE
[backend] mode: drop_ticket_write
[backend] New tickets will be acknowledged but NOT saved.
...
[backend] DEMO FAULT drop_ticket_write: acknowledged ticket #7 "PW-…-create-ticket" but did NOT save it
[backend] POST /api/tickets 201 1ms
...
[backend] GET /api/tickets?search=PW-…-create-ticket 200 4ms
```

**What this proves:** the server-side log agrees with the browser evidence, and the fault was clearly labelled.

## Other links on the landing page (what they do)

| Link (Phase 2 card) | What happens when clicked (verified) |
| --- | --- |
| **screenshot** | Opens the PNG image in the browser. |
| **video** | Opens the WebM video in the browser. |
| **error-context** | Opens a text/Markdown file describing the page structure at failure time (mostly for developers/AI tools; not worth showing). |
| **trace** | **Downloads** `trace.zip` instead of opening it. Prefer **View Trace** inside the HTML report. |
| **Files** | A plain directory listing: `playwright-report/`, `test-results/`, `backend.log`, `results.json`. |
| **Backend log** | The backend's log for that phase as plain text. |

`results.json` is the machine-readable result (Playwright JSON reporter) used by the summary script and by the
landing page's counts.

---

# 16. Showing the Application Itself

The demo containers have **no browser-reachable ports**, and they are deleted after each phase. To show the real
application to the examiner, start the separate **development stack**.

## Step 16.1 — Start the development stack

### Command

```bash
docker compose up -d --build --wait
```

### What I should see (verified)

```text
 Container opsdesk-db-1 Healthy
 Container opsdesk-backend-1 Healthy
 Container opsdesk-frontend-1 Healthy
```

It takes about 5–6 seconds when images are cached. `-d` runs it in the background; `--wait` returns only when all
services are healthy.

### What is happening internally

Plain `docker compose` uses only `compose.yml` (project `opsdesk`): database data is stored in the named volume
`opsdesk_db-data` (it persists between restarts), the frontend is published on port **8080**, the API on **3000**.
Fault injection cannot be enabled in this mode.

## Step 16.2 — Open the application

**Click:** Browser → new tab → `http://localhost:8080`

> On this laptop, use `localhost`, **not** `127.0.0.1`. A Java program on this laptop listens on `127.0.0.1:8080`
> and would answer instead (verified: `http://127.0.0.1:8080` returned the Java program's `403`, while
> `http://localhost:8080` returned OpsDesk). Quitting that Java program removes the issue.

### Screens and buttons (verified labels)

| Screen | What you see | Buttons / fields |
| --- | --- | --- |
| **Login** (`/login`) | OpsDesk logo, heading **Sign in**, "Support ticket portal", a box "Demo account demo@example.com / Demo123!" | **Email**, **Password**, **Sign in** |
| **Dashboard** (`/`) | Heading **Dashboard**, cards **Total tickets 6**, **Open 3**, **In progress 2**, **Resolved 1**, list **Recent tickets** (5 most recent) | **View all tickets**; sidebar **Dashboard**, **Tickets**, "Signed in as demo@example.com", **Log out** |
| **Tickets** (`/tickets`) | Heading **Tickets**, "Showing 6 tickets", table columns ID, TITLE, DESCRIPTION, PRIORITY, STATUS, CREATED (UTC), UPDATED (UTC), coloured badges | **New ticket**, **Search tickets**, **Filter by status**, **Filter by priority**, **Clear filters** (appears when a filter is set) |
| **New ticket dialog** | Dialog titled **New ticket** | **Title**, **Description**, **Priority** (LOW/MEDIUM/HIGH), **Cancel**, **Create ticket** |
| **Ticket detail** (`/tickets/1`) | "← Back to tickets", "TICKET #1", title, priority and status badges, **Edit ticket** panel, ID/Created/Last updated | **Title**, **Description**, **Priority**, **Status** (OPEN/IN_PROGRESS/RESOLVED), **Save changes**, **Delete ticket** (opens dialog **Delete ticket?** with **Cancel** / **Delete**) |

### Suggested 60-second walkthrough

1. Log in with `demo@example.com` / `Demo123!`.
2. Point at the dashboard numbers ("these are what E2E-01 checks").
3. Click **Tickets**, type `database` in **Search tickets** ("E2E-07 does exactly this").
4. Click **New ticket**, click **Create ticket** with empty fields → `Title is required`, `Description is required`
   ("E2E-11"). Click **Cancel**.
5. Click **Log out** ("E2E-12").

### What I should say

> "This is the application under test. Everything I just clicked by hand, Playwright does automatically in a few
> seconds, on every change, in a container — that is the point of the project."

## Step 16.3 — Optional: show the backend health endpoint

**Click:** new tab → `http://localhost:3000/health`

**What I see (verified):** `{"status":"ok","database":"ok"}`

**What to say:** "This is the endpoint Docker's health check calls. It reports healthy only if the API can actually
query the database."

## Step 16.4 — Stop the development stack afterwards

```bash
docker compose down
```

Data you created stays in the `opsdesk_db-data` volume. To reset it to the six seed tickets:

```bash
curl -X POST http://localhost:3000/api/test/reset
```

(verified: returns `{"status":"reset","tickets":6}`; run it while the dev stack is up), or remove the volume with
`docker compose down -v`.

> The faulty version of the application cannot be opened in a browser with the provided commands — fault mode only
> exists inside the demo stack, which publishes no ports. To *show* the fault, use the video and trace from section 15.

---

# 17. Showing Docker During the Presentation

## Important: which command shows the demo containers

The demo runs as Compose project **`opsdesk-demo`**. Plain `docker compose ps` looks at project **`opsdesk`** (the
development stack) and therefore shows **nothing** during the demo (verified). Use one of these instead:

```bash
docker ps --filter name=opsdesk --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

or

```bash
docker compose -f compose.yml -f compose.demo.yml ps
```

## Option A — Watch containers live during the demo (second Terminal window)

Open a second Terminal window (Cmd+N), `cd` into the project folder, and run:

```bash
while true; do clear; docker ps --filter name=opsdesk --format 'table {{.Names}}\t{{.Status}}'; sleep 1; done
```

Stop it with Ctrl-C (Ctrl-C here is safe — it only stops this loop, not the demo).

What you will see during a test run (verified by sampling every 2 seconds during a real demo):

```text
NAMES                     STATUS
opsdesk-demo-tests-1      Up 1 second
opsdesk-demo-frontend-1   Up 5 seconds (healthy)
opsdesk-demo-backend-1    Up 7 seconds (healthy)
opsdesk-demo-db-1         Up 8 seconds (healthy)
```

Between phases the list briefly empties (containers are destroyed and recreated). **NOT VERIFIED:** the loop itself
was not run in an interactive Terminal; the `docker ps` command inside it was verified.

What to say:

> "You can see each phase creating its own fresh containers, each reporting healthy, with the test runner appearing
> only after the others are healthy — and everything being removed again afterwards."

## Option B — After the demo

```bash
docker ps --filter name=opsdesk --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Expected (verified): only `opsdesk-demo-report-viewer-1   Up … (healthy)   0.0.0.0:9323->80/tcp, [::]:9323->80/tcp`.

Explain: "The application and test containers were deliberately removed after each phase; only the report viewer
stays so we can inspect the evidence."

## Option C — Show healthy services with the development stack

```bash
docker compose up -d --build --wait
docker compose ps
```

Expected (verified):

```text
NAME                 IMAGE                    ...   SERVICE    ...   STATUS                   PORTS
opsdesk-backend-1    opsdesk-backend:local    ...   backend    ...   Up 3 seconds (healthy)   0.0.0.0:3000->3000/tcp, ...
opsdesk-db-1         postgres:18-alpine       ...   db         ...   Up 4 seconds (healthy)   5432/tcp
opsdesk-frontend-1   opsdesk-frontend:local   ...   frontend   ...   Up 1 second (healthy)    0.0.0.0:8080->80/tcp, ...
```

## Showing logs

| What | Command |
| --- | --- |
| Backend log of the dev stack | `docker compose logs backend` |
| Follow it live | `docker compose logs -f backend` (stop with Ctrl-C) |
| Database log of the dev stack | `docker compose logs db` |
| Backend log of a demo phase (saved by the script) | `cat artifacts/failure/backend.log` |
| Just the fault lines | `grep -E 'WARNING|DEMO FAULT' artifacts/failure/backend.log` |
| Report viewer log | `docker compose -f compose.yml -f compose.demo.yml logs report-viewer` |

Demo-phase containers are deleted after each phase, so `docker compose logs` cannot show them afterwards — that is
why the script saves `artifacts/<phase>/backend.log`.

## Showing images

```bash
docker image ls --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}' | grep -E 'opsdesk|playwright|postgres'
```

Point out `mcr.microsoft.com/playwright v1.64.0-noble` (the official, pinned Playwright image) and the four
`opsdesk-*:local` images built by the project.

## Docker Desktop GUI

You may also show the **Containers** view in Docker Desktop, where containers are grouped by Compose project
(`opsdesk-demo`, `opsdesk`). **NOT VERIFIED:** the exact Docker Desktop layout.

---

# 18. Showing the GitHub Actions Configuration

> We are explaining the configuration. We are NOT triggering a remote workflow during this guide.

## The main workflow: `.github/workflows/e2e-quality-gate.yml`

### When it runs

- on every **push to `main`**,
- on every **pull request targeting `main`**,
- **manually** (`workflow_dispatch`) from the GitHub **Actions** tab, with an optional checkbox input
  `simulate_regression` (default off).

### What it does, step by step

| # | Step name in the file | Command / action | Purpose |
| --- | --- | --- | --- |
| 1 | Checkout repository | `actions/checkout@v5` | Get the code onto a fresh Ubuntu 24.04 runner |
| 2 | Show Docker versions | `docker version`, `docker compose version` | Log the tool versions; print the fault mode |
| 3 | Run Playwright tests as the runner user | writes `HOST_UID`/`HOST_GID` | Artifacts are owned by the runner user so they can be uploaded |
| 4 | Build images | `docker compose --profile test build` | Build the same images as locally |
| 5 | **Run E2E quality gate** | `docker compose up --build --abort-on-container-exit --exit-code-from tests tests` | **The gate.** Same health-checked startup, same Playwright tests. A non-zero exit fails this step and the whole job. |
| 6 | Show service health and logs | only `if: failure()` | `docker compose ps -a` and logs of db/backend/frontend for diagnosis |
| 7 | Write job summary | `if: always()` | Runs the same `summarize-results.mjs` and posts the PASS/FAIL list on the GitHub run page |
| 8 | Upload Playwright artifacts | `actions/upload-artifact@v4`, `if: always()` | Uploads `artifacts/` as **`playwright-e2e-report`**, kept **14 days** |
| 9 | Tear down | `docker compose --profile test down --volumes --remove-orphans` | Clean up |

At the top of the file, `COMPOSE_FILE: compose.yml:compose.demo.yml:compose.ci.yml` makes every plain
`docker compose` command use the same three files. `CI_FAULT_INJECTION_MODE` is `drop_ticket_write` only when a
manual run ticks `simulate_regression`; push and PR runs always use `none`.

### How Docker and Playwright are involved

GitHub's runner does **not** install Node.js, PostgreSQL or browsers. It only uses Docker, which is preinstalled on
GitHub's Ubuntu runners. Everything else comes from the same images used locally. That is **local/CI parity**.

### What happens if tests pass

Step 5 exits `0` → the job is green ✔ → a pull request can be merged with confidence. Artifacts are still uploaded.

### What happens if tests fail

Step 5 exits `1` → the step and the job turn red ✘ → GitHub shows the pull request check as failed → step 6 prints
container logs → step 8 uploads the screenshot, video, trace and HTML report so the developer can diagnose it.

### Local equivalent (verified)

```bash
./scripts/demo.sh ci
```

This runs exactly the CI command with the same three Compose files. Verified result: `12 passed`, `[OK] Quality gate
PASSED (exit code 0)`, reports in `artifacts/latest/` (shown as the **Latest quality-gate run** card at
`http://localhost:9323`). During validation, the exact workflow step commands were also replayed locally: normal mode
exited `0`; `simulate_regression` mode exited `1` with E2E-04 failing.

## The optional workflow: `.github/workflows/nightly-cross-browser.yml`

Runs daily at 02:00 UTC (and manually) the same Compose gate three times in parallel: Chromium, Firefox, WebKit
(`PW_BROWSERS` per matrix entry). It is extended regression testing, not required for pull requests or for the
classroom demo.

## Showing it in the presentation

1. Open `.github/workflows/e2e-quality-gate.yml` in your editor and point at `on:`, `COMPOSE_FILE:`, the step
   "Run E2E quality gate", and "Upload Playwright artifacts".
2. Optionally open the repository's **Actions** tab on GitHub in the browser (just viewing; do not click
   **Run workflow** during the presentation). The repository remote is `https://github.com/parthpalav/devops_ia`.
   **NOT VERIFIED:** whether a run exists there and whether it is green — the commit `1d1557f` was pushed to `main`,
   which should have triggered the workflow, but the run status could not be checked from this machine.

### What I should say

> "GitHub Actions doesn't have its own separate test setup. It runs the very same Docker Compose command we just ran
> locally. If Playwright fails, the exit code fails the job, the pull request is blocked, and the screenshots, video
> and trace are uploaded as a downloadable artifact."

---

# 19. What I Should Say During Each Step

Short spoken explanations (1–4 sentences each). Say them in your own words; the facts are what matter.

| Moment | What I say |
| --- | --- |
| **Architecture** | "OpsDesk has three application parts — a React frontend served by Nginx, a Node.js Express API, and a PostgreSQL database — plus a fourth container that holds Playwright and a real Chromium browser. Docker Compose defines all of them as code and starts them in the right order." |
| **Starting the demo** | "I'm running one command. From here on, nothing is manual: the script builds the images, creates the environment, runs the tests, injects a fault, recovers, and publishes the reports." |
| **Health checks** | "Notice Playwright doesn't start immediately. The database must report healthy before the API starts, and the API must report healthy — meaning it can actually query the database — before the frontend starts. The test runner waits for both. No fixed sleep timers." |
| **Playwright (baseline)** | "Playwright is now driving a real Chromium browser through twelve user journeys: login, wrong password, protected pages, creating, editing, searching, filtering, deleting tickets, form validation and logout. It runs headless inside a container, which is exactly how CI servers run it." |
| **Quality gate** | "The test container exited with code zero, and Docker Compose passed that code straight through. Zero means the gate is green. Any failure would produce a non-zero code and stop the pipeline automatically." |
| **Fault injection** | "Now the script rebuilds the same environment with one environment variable changed. It switches on a simulated regression: the API will say a ticket was created, but it won't actually save it. No code is edited live." |
| **Expected failure** | "Here's the important moment. Eleven tests still pass, so the infrastructure is fine. Only E2E-04 fails: it created a ticket, saw a success message, reloaded the page, and the ticket wasn't there. The gate turned red with exit code one — that's the regression being caught." |
| **Failure artifacts** | "When a test fails, Playwright automatically keeps a screenshot, a video and a full trace. In the trace's network log you can see the create request returned 201 Created, yet the search afterwards found nothing. That's evidence an engineer can act on without reproducing anything." |
| **Recovery** | "The fault is switched off, the environment is recreated from scratch, and the exact same twelve tests pass again — including E2E-04. So the red result was caused by the defect, not by a flaky test." |
| **GitHub Actions** | "In CI, GitHub Actions runs the same Docker Compose command on every push and pull request to main. It installs nothing else. If Playwright fails, the job fails, and the screenshots, video and trace are uploaded as an artifact." |
| **Final conclusion** | "So Docker gives a reproducible environment, Compose orchestrates it with health-aware startup, Playwright verifies real user outcomes, and the exit code turns that into an automated quality gate that runs identically on my laptop and in CI." |

---

# 20. Complete Presentation Script

Target: **about 8–9 minutes**. Lines in quotes are what you say; lines marked **DO** are actions.

## Before you start (not seen by the audience)

Terminal is open in the project folder, `./scripts/clean.sh` has been run, the browser has an empty tab, and Docker
Desktop is running (checklist: section 29).

## Opening (0:00 – 0:45)

> "My case study is containerized end-to-end testing as a CI quality gate. The problem: modern applications have
> several services, and testing them manually after every change is slow and inconsistent. Environments also differ
> between machines — different databases, browser versions and startup timing. So the question is: how do we
> automatically prove that a change didn't break what users actually do?"

## Architecture (0:45 – 2:00)

**DO:** show the diagram from section 3 (or open `compose.yml`).

> "The system under test is OpsDesk, a support-ticket portal: React frontend on Nginx, an Express API, and
> PostgreSQL. Each runs in its own Docker container. A fifth container uses the official Playwright image with a real
> Chromium browser. Docker Compose defines all of this as code. Each service has a health check, and each one waits
> for the previous one to be healthy — the database, then the API, then the frontend, and only then the tests."

## Start the demo (2:00 – 2:15)

**DO:** click into the Terminal and type:

```bash
./scripts/demo.sh full
```

> "This single command runs the whole demonstration with no manual intervention. It has three phases: a healthy
> baseline, a deliberately injected regression, and recovery."

## Baseline (2:15 – 2:45) — happens fast; talk while it runs

**WATCH FOR:** `PHASE 1/3 - BASELINE QUALITY GATE`, `[OK] Database healthy`, `[OK] Backend healthy`,
`[OK] Frontend healthy`, the 12 `✓` lines, `[OK] Playwright suite passed - quality gate is GREEN`.

> "The containers came up in dependency order and reported healthy. Now Playwright is running twelve browser
> journeys… twelve passed, the container exited with code zero, so the quality gate is green."

## Controlled failure (2:45 – 3:30)

**WATCH FOR:** `PHASE 2/3 - CONTROLLED REGRESSION`, `[OK] Fault injection enabled: drop_ticket_write`, the pause
after test 4, `✘ 5 … E2E-04`, `[EXPECTED FAILURE] E2E-04 Create Ticket (Playwright exit code 1)`,
`[OK] Regression detected by quality gate`.

> "Now the same environment is recreated with one environment variable switched on: the backend will acknowledge new
> tickets but not save them. All services are still healthy. Playwright is now waiting for a ticket it just created…
> it never appears. E2E-04 fails, eleven others pass, and the gate is red with exit code one. That's exactly what we
> want: the regression was caught automatically."

## Recovery and summary (3:30 – 4:00)

**WATCH FOR:** `PHASE 3/3 - RECOVERY`, 12 `✓`, `FINAL RESULT: DEMONSTRATION SUCCESSFUL`.

> "The fault is removed, everything is rebuilt fresh, and all twelve tests pass again. The script's final verdict
> requires all three: baseline passed, regression detected, recovery passed — so the demonstration succeeds."

**Tip:** the run takes about one minute and will not wait for you. If you fall behind, let it finish, then scroll up
in the Terminal (or press Cmd+F and search `PHASE 2/3`) to point at the lines.

## Report (4:00 – 6:30)

**DO:** browser → `http://localhost:9323`.

> "The script also published the evidence. Each phase has a card; phase two is marked failed, and confirms the
> regression was detected as expected."

**DO:** Phase 2 card → **Open HTML report** → click **"Ticket lifecycle › E2E-04 create ticket and find it again
after reload"**.

> "The steps show creating the ticket and reloading both succeeded; only 'Verify the ticket was persisted' failed.
> Expected: visible. Actual: not found."

**DO:** click the screenshot thumbnail, then the browser Back button.

> "This screenshot is what a user would have seen: zero tickets for the one they just created."

**DO:** click **View Trace** → click the **Network** tab → click **Fetch** → click the **POST** row with status **201**.

> "This trace recorded every action and request. The create request returned 201 Created — the server claimed
> success. The search after the reload found nothing. A simple API status check would have passed this bug; the
> end-to-end test didn't."

## CI explanation (6:30 – 7:30)

**DO:** open `.github/workflows/e2e-quality-gate.yml` in the editor.

> "This workflow runs on every push and pull request to main. It doesn't install anything except what Docker
> provides — it runs the same Docker Compose quality-gate command. If Playwright fails, the exit code fails the job
> and the artifacts are uploaded for diagnosis. That's local and CI parity."

## Conclusion (7:30 – 8:30)

> "To summarise: Docker makes the environment reproducible, Compose orchestrates it with health-aware startup,
> Playwright validates real user outcomes in a real browser, and the exit code turns that into an automated quality
> gate. The controlled regression proves the gate catches real defects, the artifacts make failures diagnosable, and
> recovery proves it distinguishes good from bad. Thank you — I'm happy to take questions."

---

# 21. What Every Important Terminal Message Means

| Message | Printed by | Meaning | Good or bad? |
| --- | --- | --- | --- |
| `[..] Docker version …` / `[..] Docker Compose version …` | `demo.sh` preflight | Docker is installed and running | Good |
| `[..] Building images (backend, frontend, Playwright tests)...` | `demo.sh` | Building/updating the project images from cache | Normal |
| `Playwright package/image version match: 1.64.0` | `e2e/Dockerfile` (shown only when that layer actually rebuilds) | npm Playwright version equals the browser image version | Good |
| `[OK] Images built` | `demo.sh` | All images ready | Good |
| `PHASE 1/3 - BASELINE QUALITY GATE` | `demo.sh` | Healthy stack, expect PASS | — |
| `[..] Removing any previous demo containers (fresh tmpfs database = deterministic seed data)` | `demo.sh` | Old containers are deleted so every phase starts from identical data | Normal |
| `Container opsdesk-demo-db-1 Waiting` → `Healthy` | Docker Compose | Compose is waiting for the health check, then it passed | Good |
| `[OK] Database healthy` / `[OK] Backend healthy` / `[OK] Frontend healthy` | `demo.sh` (reads Docker health status) | Each service passed its health check | Good |
| `[OK] Fault injection disabled (backend log: 'fault injection mode: none')` | `demo.sh` | Backend confirmed the fault is off | Good (phases 1 and 3) |
| `[OK] Fault injection enabled: drop_ticket_write (backend log: 'WARNING: DEMO FAULT INJECTION ACTIVE')` | `demo.sh` | Backend confirmed the fault is on | Good (phase 2) |
| `[..] Running the Playwright quality gate (artifacts -> artifacts/<phase>)` | `demo.sh` | Tests start; results go to that folder | Normal |
| `tests-1  \| Running 12 tests using 1 worker` | Playwright | 12 tests, one at a time | Normal |
| `✓` | Playwright | Test passed | Good |
| `✘` | Playwright | Test failed | Expected only for E2E-04 in phase 2 |
| `12 passed (6.8s)` | Playwright | All passed | Good |
| `1 failed` / `11 passed` | Playwright | One failure | Expected in phase 2 only |
| `tests-1 exited with code 0` / `code 1` | Docker Compose | The test container's exit code | 0 = gate green, 1 = gate red |
| `Compose Stopping Aborting on container exit...` | Docker Compose | `--abort-on-container-exit` ending the run because tests finished | Normal |
| `[..] Playwright container exit code: N` | `demo.sh` | The captured gate result | — |
| `[PASS] …` / `[FAIL] …` list, `Total: 12 Passed: … Failed: …` | `summarize-results.mjs` | Readable summary from `results.json` | — |
| `reason: Error: Ticket "PW-…" should be listed after reload - was it really saved?` | summary | Why E2E-04 failed | Expected in phase 2 |
| `screenshot / video / error-context / trace  artifacts/failure/…` | summary | Where the evidence files are | Good |
| `[OK] Playwright suite passed - quality gate is GREEN` | `demo.sh` | Phase passed | Good |
| `[EXPECTED FAILURE] E2E-04 Create Ticket (Playwright exit code 1)` | `demo.sh` | The failure happened as designed | Good |
| `[OK] Regression detected by quality gate` | `demo.sh` | Only E2E-04 failed, as required | Good |
| `[OK] Failure trace, screenshot, video and HTML report preserved in artifacts/failure/` | `demo.sh` | All four evidence types exist | Good |
| `[OK] Report viewer running` / `Playwright report: http://localhost:9323` | `demo.sh` | Report website is up | Good |
| `FINAL RESULT: DEMONSTRATION SUCCESSFUL` | `demo.sh` | baseline PASS and regression DETECTED and recovery PASS; exit code 0 | Good |
| `FINAL RESULT: DEMONSTRATION FAILED` | `demo.sh` | At least one phase did not behave as expected; exit code 1 | Bad — see section 24 |
| `[FAIL] Playwright suite failed - quality gate is RED (exit code N)` | `demo.sh` | Baseline or recovery failed | Bad |
| `[FAIL] Playwright reported ALL tests passing - the injected regression was NOT detected.` | `demo.sh` | Fault did not cause a failure | Bad |
| `[FAIL] The suite failed, but not exactly as expected (see summary above).` | `demo.sh` | Phase 2 failed in the wrong way (e.g. another test failed) | Bad |
| `[WARN] Additional failure not caused by the injected fault: …` | summary | A test other than E2E-04 failed | Bad |
| `[FAIL] Application stack did not become healthy.` | `demo.sh` | A health check never passed; logs are printed below | Bad |
| `[FAIL] Image build failed.` | `demo.sh` | Docker build error (often no Internet on a first run) | Bad |
| `[FAIL] Docker daemon is not reachable. Start Docker Desktop / the Docker service and retry.` | `demo.sh` | Docker Desktop not running | Bad (message from script source; not triggered during verification) |
| `[WARN] Could not start the report viewer (is port 9323 in use?). Reports are still in ./artifacts/.` | `demo.sh` | Report website failed; the demo verdict is unaffected | Fixable |
| `[WARN] Interrupted - removing demo containers.` | `demo.sh` | Ctrl-C was pressed; the script cleaned up and exited with code 130 | Rerun |

---

# 22. What Every Important Click Does

GUI/browser actions only, in chronological order for the full presentation.

```text
CLICK 1
Application: Browser
Action: Open a new, empty tab
When: Before the presentation starts
Purpose: Ready to show the report later

CLICK 2
Application: Terminal
Action: Click inside the Terminal window (project folder already open)
When: When you say "I'm running one command"
Purpose: Focus the Terminal to type ./scripts/demo.sh full

CLICK 3
Application: Browser
Action: Address bar → type http://localhost:9323 → Enter
When: After "FINAL RESULT: DEMONSTRATION SUCCESSFUL"
Purpose: Open the report landing page (four phase cards)
Proves: The run's results were published automatically

CLICK 4
Application: Report landing page
Action: Phase 2 — Controlled regression card → "Open HTML report"
Purpose: Open the Playwright HTML report for the failure phase
Proves: 12 tests ran; 11 passed, 1 failed

CLICK 5 (optional)
Application: Playwright HTML report
Action: "Failed 1" (top filter bar)
Purpose: Show only failed tests
Proves: Exactly one test failed, nothing else broke

CLICK 6
Application: Playwright HTML report
Action: "Ticket lifecycle › E2E-04 create ticket and find it again after reload"
Purpose: Open the failed test's detail page (Errors, Test Steps, Screenshots, Traces, Videos, Attachments)
Proves: Steps 1–2 succeeded, step 3 "Verify the ticket was persisted" failed; expected visible, got not found

CLICK 7
Application: Test detail page
Action: Screenshot thumbnail (under "Screenshots") — tip: Cmd+click to open in a new tab
Purpose: Show the page at the moment of failure
Proves: The user would see "Showing 0 tickets" / "No tickets match your filters."
Then: Browser Back button (or close the new tab)

CLICK 8 (optional)
Application: Test detail page
Action: "video" (under "Videos")
Purpose: Play the recording of the headless browser
Proves: A real browser really performed the actions

CLICK 9
Application: Test detail page
Action: "View Trace" (top of page)
Purpose: Open the Playwright Trace Viewer
Proves: Every action, DOM snapshot and request was recorded

CLICK 10
Application: Trace Viewer
Action: Left "Actions" list → "Verify the ticket was persisted" (red)
Purpose: Jump to the failing step; snapshot shows the empty search result

CLICK 11
Application: Trace Viewer
Action: Bottom panel → "Network" tab, then the "Fetch" filter button
Purpose: Show only API calls (reset, login, tickets…)

CLICK 12
Application: Trace Viewer
Action: The row Name "tickets", Method "POST", Status "201"
Purpose: Show request details: URL http://frontend/api/tickets, Status Code 201 Created
Proves: The API claimed success although nothing was saved; the next row (tickets?search=PW-…) found nothing

CLICK 13
Application: Browser
Action: Address bar → http://localhost:9323 → Phase 2 card → "Backend log"
Purpose: Show the server-side log
Proves: "DEMO FAULT drop_ticket_write: acknowledged ticket #7 … but did NOT save it"

CLICK 14 (optional)
Application: Report landing page
Action: Phase 3 — Recovery card → "Open HTML report"
Purpose: Show 12 passed after recovery
Proves: The same E2E-04 test passes once the fault is removed

CLICK 15 (optional, needs `docker compose up -d --build --wait` first)
Application: Browser
Action: New tab → http://localhost:8080 (NOT 127.0.0.1 on this laptop) → log in demo@example.com / Demo123!
Purpose: Show the real application (Dashboard, Tickets, New ticket, Log out)

CLICK 16 (optional)
Application: Code editor
Action: Open .github/workflows/e2e-quality-gate.yml
Purpose: Show CI runs the same Docker Compose quality gate

CLICK 17 (optional, viewing only)
Application: Browser
Action: https://github.com/parthpalav/devops_ia → "Actions" tab
Purpose: Show workflow runs (NOT VERIFIED whether runs exist / are green). Never click "Run workflow" live.
```

---

# 23. Common Questions the Examiner May Ask

**1. Why is Playwright related to DevOps?**

Because I use it as an automated quality gate inside a reproducible, containerized pipeline, not as a manual testing
tool.

*Deeper answer:* Playwright alone is a testing framework. The DevOps part is the integration: the tests run in a
pinned Docker image, start automatically after health-checked dependencies, return an exit code that Compose and
GitHub Actions use as a pass/fail decision, and produce artifacts for diagnosis. That is continuous integration,
shift-left testing and automated regression detection.

**2. Why not Selenium?**

Playwright has automatic waiting, a built-in test runner and reporters, and a first-class trace viewer, and Microsoft
ships an official Docker image with matching browsers.

*Deeper answer:* With Selenium I would need a separate driver per browser, a test framework, a reporting library, and
more manual waits — more flakiness and setup. Playwright's `expect` assertions retry automatically until a timeout
(7 s here), and `trace: 'retain-on-failure'` gives step-by-step DOM snapshots and network logs, which is what makes the
failure diagnosable in this demo.

**3. Why Docker?**

So the whole environment — database, API, web server, browser and its system libraries — is identical on every
machine and only Docker needs to be installed.

*Deeper answer:* Images are version-pinned: `postgres:18-alpine`, `node:24-alpine`, `nginx:1.29-alpine`,
`mcr.microsoft.com/playwright:v1.64.0-noble`. That removes "works on my machine" problems, and the same images run in
CI.

**4. Why Docker Compose?**

To define the multi-container system and its startup dependencies in one file and run it with one command.

*Deeper answer:* `compose.yml` declares the services, networks, environment variables, health checks and
`depends_on: condition: service_healthy`. Overlays (`compose.demo.yml`, `compose.ci.yml`) adapt the same definition
for the demo and CI without duplicating it. `--exit-code-from tests` turns the run into a gate.

**5. Why use PostgreSQL?**

To prove we test a real stateful application — data is actually stored and read back — not just static screens.

*Deeper answer:* The regression we inject is a persistence bug. Detecting it requires a real database. The schema
and deterministic seed live in `database/init/`, and the seed is a SQL function `reset_demo_data()` used both at
startup and by the test reset endpoint.

**6. Why use health checks?**

Because a container being "running" doesn't mean the service inside is ready.

*Deeper answer:* PostgreSQL needs time to initialise; the API must be able to query the database. The db check is
`pg_isready` over TCP, the backend check calls `/health` which runs `SELECT 1`, and the frontend check fetches
`index.html`. Compose starts each service only after its dependency is healthy, and the test container only after
backend and frontend are healthy.

**7. Why not use `sleep 10`?**

A fixed delay is either too long (wastes time) or too short on a slower machine (random failures).

*Deeper answer:* Health checks adapt to the actual machine: on this laptop each service became healthy in about 1.5
seconds. On a slow CI runner it might take longer, and the pipeline simply waits. That is deterministic, not
timing-dependent.

**8. What is a quality gate?**

An automated decision point: the pipeline only continues if the tests pass.

*Deeper answer:* Here, the Playwright container's exit code is the decision. `docker compose up
--abort-on-container-exit --exit-code-from tests tests` returns that code. `0` lets the pipeline continue; non-zero
stops it. In GitHub Actions this marks the job red and blocks the pull request.

**9. What happens if a test fails?**

Playwright exits with code 1, Compose returns 1, the script or CI job fails, and screenshots, video, trace and an
HTML report are saved.

*Deeper answer:* Retries are deliberately 0 so failures are never hidden. In CI, a failure also triggers the "Show
service health and logs" step and the artifact upload.

**10. What is fault injection?**

Deliberately switching on a known bug through configuration, to prove the tests detect it.

*Deeper answer:* `FAULT_INJECTION_MODE=drop_ticket_write` is read by the backend at startup. It defaults to `none`,
only two values are accepted, it is only forwarded by `compose.demo.yml`, it prints a warning banner, and no source
code is changed. It makes the demo repeatable instead of relying on live coding.

**11. Why does POST return 201 during the fault?**

Because that's the realistic bug we simulate: the server says "created" but silently doesn't save.

*Deeper answer:* In `backend/src/routes/tickets.ts`, fault mode validates the input, calls
`createWithoutPersisting()` (which takes a real ID from the sequence but skips the INSERT), logs a warning, and
responds `201` with a realistic ticket. Silent data loss is a classic bug that status-code checks miss.

**12. Why does E2E testing detect the issue?**

Because it checks the user-visible outcome — after a reload, the ticket must be findable — not the server's claim.

*Deeper answer:* E2E-04 creates a uniquely named ticket, reloads the page to discard browser state, searches by title
(a real database query), and asserts the row is visible. The database has no row, so the assertion fails after 7
seconds.

**13. What is the difference between unit testing and E2E testing?**

Unit tests check small pieces of code in isolation; E2E tests check complete user journeys through the running
system.

*Deeper answer:* A unit test of the create route might only check that it returns 201 — which still happens in our
fault. An E2E test goes through the browser, Nginx, the API and the database, so it catches integration and behaviour
bugs. E2E tests are slower, so a real project uses both. This project focuses on E2E as the CI gate.

**14. What is headless testing?**

Running a real browser without displaying a window.

*Deeper answer:* The Chromium inside the Playwright container renders pages fully in memory; it just has no screen.
That's how CI servers work. The screenshots, video and trace are proof of what the headless browser actually saw.

**15. What is a Playwright trace?**

A recording of a test run that can be replayed step by step.

*Deeper answer:* `trace.zip` contains every action, DOM snapshots before and after each action, console output,
source location and the full network log. In our trace you can see `POST /api/tickets → 201` followed by the empty
search.

**16. What does exit code 1 mean?**

That the program failed — here, at least one Playwright test failed.

*Deeper answer:* Exit codes are the universal contract between programs and automation: `0` success, non-zero
failure. You can print the last one with `echo $?`.

**17. Why does the final demo script still return 0?**

Because the demo script checks whether the gate *behaved correctly*, and in phase 2 the correct behaviour is to fail.

*Deeper answer:* The script captures Playwright's exit code instead of stopping, then verifies the failure was exactly
E2E-04 and that artifacts exist. Its final rule is baseline PASS and regression DETECTED and recovery PASS. If the
fault had *not* caused a failure, the script would print `FINAL RESULT: DEMONSTRATION FAILED` and exit 1.

**18. What is CI?**

Continuous Integration: automatically building and testing every code change.

*Deeper answer:* It catches problems early ("shift-left"), before merging or release, instead of a person testing
manually afterwards.

**19. What does GitHub Actions add?**

Automation on every push and pull request, without anyone remembering to run the tests.

*Deeper answer:* `.github/workflows/e2e-quality-gate.yml` runs on push and PR to `main` and manually. It builds the
images, runs the same Compose gate, posts a summary, and always uploads `artifacts/` as `playwright-e2e-report` for
14 days. A failure makes the PR check red.

**20. What is local/CI parity?**

Running the same test setup locally and in CI.

*Deeper answer:* The workflow sets `COMPOSE_FILE=compose.yml:compose.demo.yml:compose.ci.yml` and runs plain
`docker compose` commands. It installs no Node.js, PostgreSQL or browsers. `./scripts/demo.sh ci` runs exactly the
same command locally, so a CI failure can be reproduced on a laptop.

**21. What does Docker solve here?**

Reproducibility and isolation: the same versions everywhere, nothing installed on the host, and a clean environment
every run.

*Deeper answer:* The demo database lives on tmpfs (in memory), so each phase starts from the identical committed seed
— no leftovers from previous runs.

**22. Could this scale to production?**

The pattern does — this exact gate could protect a production project's main branch. The demo itself is not a
production deployment.

*Deeper answer:* You would add parallel workers with separate databases, more browsers (the nightly workflow already
runs Chromium, Firefox and WebKit), unit and API tests before E2E, image publishing, and deployment stages after the
gate. The test-reset endpoint and fault injection are demo-only and disabled by default.

**23. Why only Chromium in the main demo?**

Speed and reliability for the main gate; cross-browser runs are in a separate scheduled workflow.

*Deeper answer:* `PW_BROWSERS` defaults to `chromium`. `.github/workflows/nightly-cross-browser.yml` runs the same
suite on Chromium, Firefox and WebKit daily at 02:00 UTC and on demand.

**24. Why are screenshots and videos useful?**

They show exactly what the user would have seen, so a failure can be understood without re-running it.

*Deeper answer:* In CI there is no screen to watch, so evidence is essential. They are kept only on failure (to save
space) and uploaded by GitHub Actions.

**25. What happens if the database fails?**

The backend health check fails, so the frontend and tests never start, and the run fails before testing — an
infrastructure failure, clearly different from a test failure.

*Deeper answer (from the code; not triggered during verification):* `/health` returns HTTP 503 if `SELECT 1` fails,
so the backend never becomes healthy. `docker compose up --wait` then fails and `demo.sh` prints
`[FAIL] Application stack did not become healthy.` with the container status and the last 50 log lines. In CI the
quality-gate step fails because a dependency did not become healthy.

**26. How are tests kept independent?**

Before every test, an automatic fixture resets the database to the six seed tickets.

*Deeper answer:* `e2e/fixtures/test.ts` calls `POST /api/test/reset`. Tickets created by tests use unique names
(`PW-<timestamp>-<name>`). During validation each test passed when run alone, and the whole suite passed when repeated
three times in a row (36/36).

**27. Isn't the reset endpoint a security risk?**

It only exists when `ENABLE_TEST_ENDPOINTS=true`; otherwise it returns 404 (verified).

*Deeper answer:* The backend defaults it to off. It is enabled in the dev/demo/CI Compose files only, and is
documented as never to be enabled in production.

**28. Could fault injection be switched on accidentally?**

No — it defaults to `none`, accepts only known values, and only the demo overlay passes it to the backend.

*Deeper answer:* Even with `FAULT_INJECTION_MODE=drop_ticket_write` set in the shell, plain `docker compose` and the
CI files ignore it (verified). In CI it can only be enabled through the manual `simulate_regression` option.

**29. Why must the Playwright npm version match the Docker image version?**

Each Playwright version expects specific browser builds; a mismatch can make browsers fail to launch.

*Deeper answer:* `e2e/Dockerfile` checks it during the build and stops with an error if `@playwright/test` is not
exactly `1.64.0`.

**30. Why one worker and no retries?**

One worker because all tests share one database; no retries so a real failure is never hidden by a lucky second
attempt.

**31. How does Playwright find elements on the page?**

Mostly by accessible roles and labels — like a user or screen reader — for example `getByRole('button', { name:
'Sign in' })` or `getByLabel('Search tickets')`.

*Deeper answer:* This avoids fragile CSS selectors, so visual changes don't break tests.

**32. How would you add a new test?**

Add a `test(...)` in a file under `e2e/tests/`, using the existing helpers (`loginAsDemoUser`, `openTicketsPage`); the
next run of the same command picks it up automatically, locally and in CI.

---

# 24. Troubleshooting During the Presentation

## Docker Desktop is not running

### Symptom

`[FAIL] Docker daemon is not reachable. Start Docker Desktop / the Docker service and retry.` (message from the
script source; not triggered during verification), or `docker` commands say they cannot connect.

### Likely cause

Docker Desktop was not started, or is still starting.

### Safe fix

Start Docker Desktop and wait until it is running.

### Exact command

```bash
docker info --format '{{.ServerVersion}}'
./scripts/demo.sh full
```

### Can I continue the presentation?

Yes, after 30–60 seconds. Explain the architecture while Docker starts.

## Port 9323 already in use

### Symptom

`[WARN] Could not start the report viewer (is port 9323 in use?). Reports are still in ./artifacts/.` The final
result can still be `DEMONSTRATION SUCCESSFUL` (the viewer is not part of the verdict).

### Likely cause

Another program is using port 9323.

### Safe fix

Start the viewer on another port (verified).

### Exact command

```bash
lsof -nP -iTCP:9323 -sTCP:LISTEN
REPORT_PORT=9324 ./scripts/demo.sh report
```

Then open `http://localhost:9324`.

### Can I continue the presentation?

Yes.

## Port 8080 conflict

### Symptom

`http://127.0.0.1:8080` shows something that is not OpsDesk (on this laptop: a Java program answering 403), or the dev
stack fails to start because the port is taken.

### Likely cause

Another program (here `/opt/homebrew/opt/openjdk@21/bin/java`) listens on port 8080. This affects only the optional
development stack, never the demo.

### Safe fix

Use `http://localhost:8080`, quit the other program, or use another port.

### Exact command

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN
FRONTEND_PORT=8081 docker compose up -d --build --wait
```

Then open `http://localhost:8081`.

### Can I continue the presentation?

Yes. The main demo is unaffected.

## Previous demo was interrupted

### Symptom

Old `opsdesk-demo-*` containers still exist (`docker ps --filter name=opsdesk`).

### Likely cause

A previous run was stopped or the Terminal was closed.

### Safe fix

Just rerun. The script removes leftover demo containers at the start of every phase (verified after a killed run).

### Exact command

```bash
./scripts/demo.sh full
```

### Can I continue the presentation?

Yes.

## Ctrl-C pressed accidentally

### Symptom

`[WARN] Interrupted - removing demo containers.` and the prompt returns (exit code 130).

### Likely cause

Ctrl-C in the demo Terminal.

### Safe fix

Rerun the full demo (about one minute). Cleanup already happened (verified).

### Exact command

```bash
./scripts/demo.sh full
```

### Can I continue the presentation?

Yes. Say: "The script cleaned up after the interruption — that's part of the design. Let me run it again."

## Containers already exist

### Symptom

You see `opsdesk-*` or `opsdesk-demo-*` containers before starting.

### Likely cause

An earlier run, or the dev stack, is still up.

### Safe fix

The demo handles its own leftovers automatically. To remove everything belonging to this project (only this
project's containers and networks; images, volumes and reports are kept):

### Exact command

```bash
./scripts/clean.sh
```

### Can I continue the presentation?

Yes.

## Unhealthy database

### Symptom

`[FAIL] Application stack did not become healthy.` with `db` not healthy in the printed status/logs.

### Likely cause

Docker is short on memory/disk, or Docker Desktop is in a bad state. (Not observed during verification.)

### Safe fix

Read the printed logs; clean up; restart Docker Desktop if needed; rerun.

### Exact command

```bash
./scripts/clean.sh
docker info --format '{{.ServerVersion}}'
./scripts/demo.sh full
```

### Can I continue the presentation?

Usually after one rerun. Otherwise use emergency procedure E (section 25).

## Unhealthy backend

### Symptom

`[FAIL] Application stack did not become healthy.` with `backend` not healthy.

### Likely cause

The database is not reachable, or invalid configuration (for example a misspelled `FAULT_INJECTION_MODE` makes the
backend refuse to start with `Invalid backend configuration`). Not observed during verification.

### Safe fix

Make sure no custom `.env` file or exported variables are interfering, then rerun.

### Exact command

```bash
ls -a | grep '^.env$'
env | grep -E 'FAULT_INJECTION_MODE|ENABLE_TEST_ENDPOINTS|POSTGRES_'
./scripts/clean.sh
./scripts/demo.sh full
```

If a `.env` file exists that you did not create on purpose, rename it (`mv .env .env.backup`). Unset a stray variable
with `unset FAULT_INJECTION_MODE`.

### Can I continue the presentation?

Usually yes after a rerun.

## Unhealthy frontend

### Symptom

`[FAIL] Application stack did not become healthy.` with `frontend` not healthy.

### Likely cause

Nginx cannot reach `backend` (so check the backend first), or a broken image build. Not observed during verification.

### Safe fix

Rebuild the frontend image without cache (needs Internet), then rerun.

### Exact command

```bash
docker compose -f compose.yml -f compose.demo.yml build --no-cache frontend
./scripts/demo.sh full
```

### Can I continue the presentation?

If Internet is available, yes (rebuild takes under a minute). Otherwise use procedure E.

## Tests unexpectedly fail in baseline

### Symptom

Phase 1 shows `✘` and `[FAIL] Playwright suite failed - quality gate is RED (exit code 1)`; the summary later shows
`Baseline validation: FAIL` and `FINAL RESULT: DEMONSTRATION FAILED`. (The script still runs the other phases.)

### Likely cause

Source files were modified, the machine is extremely overloaded, or images are stale.

### Safe fix

Check for local changes, look at the failed test in `artifacts/pass`, rerun once.

### Exact command

```bash
git status
./scripts/demo.sh report
./scripts/demo.sh full
```

Open `http://localhost:9323` → Phase 1 card → **Open HTML report** to see which test failed and why.

### Can I continue the presentation?

You can turn it into a teaching moment ("the gate correctly blocked this run — here is the evidence"), then rerun. If
it fails twice, use procedure E.

## Fault test unexpectedly passes

### Symptom

`[FAIL] Playwright reported ALL tests passing - the injected regression was NOT detected.` and
`Controlled regression: NOT DETECTED`. Possibly also `[FAIL] Backend did not report the fault-injection warning.`

### Likely cause

The backend image was built from modified code, or `compose.demo.yml` was edited.

### Safe fix

Check for local changes; rebuild the images without cache; rerun.

### Exact command

```bash
git status
docker compose -f compose.yml -f compose.demo.yml --profile test build --no-cache
./scripts/demo.sh full
```

### Can I continue the presentation?

Only after the rebuild (needs Internet). Otherwise use procedure E.

## Report doesn't open

### Symptom

`http://localhost:9323` shows "This site can't be reached", or the Trace Viewer is blank.

### Likely cause

The report viewer is not running (for example after `./scripts/clean.sh`), or you used a network IP instead of
`localhost`.

### Safe fix

Start the viewer and use `localhost`.

### Exact command

```bash
./scripts/demo.sh report
```

Then open `http://localhost:9323` (refresh with Cmd+Shift+R if needed).

### Can I continue the presentation?

Yes.

## Stale test artifacts

### Symptom

Report cards show an old date/time, or the **Latest quality-gate run** card shows old results.

### Likely cause

Each phase overwrites only its own folder (`artifacts/pass`, `artifacts/failure`, `artifacts/recovery`).
`artifacts/latest` is only written by `./scripts/demo.sh ci`.

### Safe fix

Check the timestamps on the cards. A fresh `./scripts/demo.sh full` refreshes the three phase cards. To remove only
the old "Latest" card, delete just that folder. `./scripts/clean.sh --artifacts` deletes **all** reports — never
use it right before showing reports.

### Exact command

```bash
rm -rf artifacts/latest
```

### Can I continue the presentation?

Yes.

## Stale Docker volume

### Symptom

The **development** app (port 8080) shows tickets created earlier or unexpected data.

### Likely cause

The dev database volume `opsdesk_db-data` persists between runs by design. (The demo never uses it — the demo
database is in memory and always fresh.)

### Safe fix

Reset the data, or remove the project's volume.

### Exact command

```bash
curl -X POST http://localhost:3000/api/test/reset
```

or

```bash
./scripts/clean.sh --volumes
```

(`--volumes` removes only this project's volumes.)

### Can I continue the presentation?

Yes.

## No Internet connection

### Symptom

No Wi-Fi in the room.

### Likely cause

Venue network.

### Safe fix

Nothing to do **if the demo was run successfully once beforehand on this laptop**: all images and build layers are
cached, and the demo was verified to run with no network access. If images were never built on this laptop, the
build fails (`[FAIL] Image build failed.`) and you must use procedure E.

### Exact command

```bash
./scripts/demo.sh full
```

### Can I continue the presentation?

Yes, if prepared as in section 7.

## Playwright image missing

### Symptom

The build tries to download `mcr.microsoft.com/playwright:v1.64.0-noble` (about 3.5 GB) or fails offline.

### Likely cause

Docker images were removed, or this is a different laptop.

### Safe fix

Download it in advance (needs Internet and several minutes).

### Exact command

```bash
docker image ls mcr.microsoft.com/playwright
docker pull mcr.microsoft.com/playwright:v1.64.0-noble
```

### Can I continue the presentation?

Not with live tests if offline; use procedure E.

## First build takes a long time

### Symptom

The first `./scripts/demo.sh full` on a machine spends minutes on downloads and `npm ci`.

### Likely cause

Normal first-time behaviour: base images and npm packages are downloaded.

### Safe fix

Always do the first run the day before (section 7). Later runs take about one minute in total.

### Exact command

```bash
./scripts/demo.sh full
```

### Can I continue the presentation?

Yes, but you'll need to keep talking. Avoid this by preparing.

## Terminal is closed during the demo

### Symptom

The Terminal window was closed mid-run.

### Likely cause

Accident.

### Safe fix

Open a new Terminal, go to the project, clean up, rerun. (After a killed run, leftover containers remain until the next
run or cleanup — verified.)

### Exact command

```bash
cd "/Users/parthspalav/Documents/College/Semester 7/DevOps/Theory IA/devops_ia"
./scripts/clean.sh
./scripts/demo.sh full
```

### Can I continue the presentation?

Yes.

## "Permission denied" when running the script

### Symptom

`zsh: permission denied: ./scripts/demo.sh`

### Likely cause

The file lost its executable flag (for example after copying the folder).

### Safe fix

Run it through Bash explicitly.

### Exact command

```bash
bash scripts/demo.sh full
```

### Can I continue the presentation?

Yes.

---

# 25. Emergency Recovery Procedures

## Procedure A — Clean restart of the demo (about 1 minute)

```bash
./scripts/clean.sh
./scripts/demo.sh full
```

## Procedure B — Docker Desktop is misbehaving

1. Click the whale icon in the macOS menu bar and choose **Restart** (or Quit Docker Desktop and open it again).
   **NOT VERIFIED:** exact menu wording.
2. Wait until it is running, then check:

```bash
docker info --format '{{.ServerVersion}}'
```

3. Run procedure A.

## Procedure C — Run the phases individually (if the full run keeps failing at one phase)

```bash
./scripts/demo.sh pass
./scripts/demo.sh fail
```

`pass` prints `[OK] Playwright suite passed - quality gate is GREEN` (exit 0, results in `artifacts/pass`). `fail`
prints `[EXPECTED FAILURE] E2E-04 …` and `[OK] Demonstration outcome: regression detected as expected` (exit 0,
results in `artifacts/failure`). Both verified. Running `pass` again afterwards demonstrates recovery (it writes to
`artifacts/pass`, not `artifacts/recovery`). Then:

```bash
./scripts/demo.sh report
```

## Procedure D — Only the report viewer is needed

```bash
./scripts/demo.sh report
```

Then open `http://localhost:9323`.

## Procedure E — Show previously saved results (no live run possible)

Requires the safety copy from section 7 G. Verified as a drill.

```bash
rm -rf artifacts/pass artifacts/failure artifacts/recovery
cp -R ~/Desktop/opsdesk-artifacts-backup/. artifacts/
./scripts/demo.sh report
```

Then open `http://localhost:9323` and present sections 14–15 from these real, earlier results. Be honest: "These are
the reports from my rehearsal run; the live run couldn't start because of <reason>."

## Procedure F — Docker is completely unavailable

Present from the code: `compose.yml` (architecture and health checks), `backend/src/routes/tickets.ts` (the fault),
`e2e/tests/tickets.spec.ts` (E2E-04), `.github/workflows/e2e-quality-gate.yml` (CI), plus screenshots you saved during
rehearsal. Explain what each phase would show using section 6.

---

# 26. Things I Must NOT Do During the Presentation

| Do NOT | Why |
| --- | --- |
| Run `docker system prune -a`, `docker volume prune`, `docker network prune` | **Forbidden.** They delete *all* Docker data on the laptop, including other projects and the cached images the offline demo needs. Use `./scripts/clean.sh` only. |
| Press Ctrl-C or close the Terminal while the demo runs | It stops the demo (it cleans up, but you lose a minute). |
| Run two `./scripts/demo.sh` commands at the same time | Both use the same Compose project `opsdesk-demo`; the second run removes the first run's containers (deduced from the script; not tested). |
| Run `./scripts/clean.sh --artifacts` or `--all` before showing reports | Deletes all reports. |
| Edit source code, Compose files or tests during the presentation | The whole point is that the fault is configuration-only; edits could also break the demo. |
| Panic or apologise when E2E-04 shows `✘` / "1 failed" | That failure is the expected, successful highlight. |
| Open `http://127.0.0.1:8080` on this laptop | Reaches a different (Java) program. Use `http://localhost:8080`. |
| Open the report through the laptop's network IP | The trace viewer only works on `localhost` / `127.0.0.1`. |
| Expect `docker compose ps` to show the demo containers | It shows the dev project. Use `docker ps --filter name=opsdesk`. |
| Run `git push`, or click **Run workflow** on GitHub live | Not part of the plan; a remote run takes minutes and its outcome isn't controlled. |
| Run the first-ever build in front of the audience | Downloads several GB; do it the day before. |
| Let the laptop sleep or run on low battery | Docker slows down or stops. |

---

# 27. Short Version of the Demo

Emergency **3–5 minute** version.

## 0:00 — Problem and architecture (45 s)

> "Testing multi-service applications by hand is slow and inconsistent. My project defines the whole environment —
> React frontend, Node API, PostgreSQL, and a Playwright browser container — as code with Docker Compose, with health
> checks so tests start only when everything is ready. The test exit code becomes an automatic quality gate."

## 0:45 — Run (1 min 15 s)

```bash
./scripts/demo.sh full
```

> "Phase one: everything healthy, twelve browser tests pass, exit code zero — green. Phase two: an environment
> variable makes the API claim tickets are saved without saving them. Eleven tests pass, but the ticket-creation test
> catches the missing ticket — exit code one — red. Phase three: fault removed, environment rebuilt, all twelve pass
> again."

## 2:00 — Evidence (1 min 30 s)

`http://localhost:9323` → Phase 2 → **Open HTML report** → **E2E-04** → screenshot → **View Trace** → **Network** →
**Fetch** → the **POST 201** row.

> "The server said 201 Created, but the ticket was never found. An API check would pass this; the end-to-end test
> didn't. The screenshot, video and trace were saved automatically."

## 3:30 — CI and conclusion (1 min)

> "GitHub Actions runs this exact Docker Compose gate on every push and pull request to main, and uploads these
> artifacts. Same environment locally and in CI — that's the DevOps value: reproducible, automated, diagnosable
> quality gates."

---

# 28. Full Version of the Demo

Extended **10–15 minute** version when time allows. Follow section 20's script and add the optional parts in this
order.

| Order | Part | Commands / clicks | Time |
| --- | --- | --- | --- |
| 1 | Opening + problem | — | 0:45 |
| 2 | Architecture, showing `compose.yml` health checks and `depends_on` | open `compose.yml` | 1:30 |
| 3 | Live application tour | `docker compose up -d --build --wait` → `http://localhost:8080` → log in → Dashboard → Tickets → search `database` → **New ticket** → empty **Create ticket** → **Cancel** → **Log out** | 2:00 |
| 4 | Healthy services | `docker compose ps` (dev stack) | 0:30 |
| 5 | Optional: second Terminal running the `docker ps` watch loop (section 17, option A) | Cmd+N, `cd …`, loop | 0:15 |
| 6 | Full demo | `./scripts/demo.sh full`, narrate phases 1–3 | 1:30 |
| 7 | Show the fault code | open `backend/src/routes/tickets.ts`, search `drop_ticket_write` | 1:00 |
| 8 | Show the test | open `e2e/tests/tickets.spec.ts`, E2E-04's three steps | 1:00 |
| 9 | Report and evidence | section 22, clicks 3–14 | 3:00 |
| 10 | CI workflow | open `.github/workflows/e2e-quality-gate.yml`; optionally view the GitHub Actions tab | 1:00 |
| 11 | Optional: CI command locally | `./scripts/demo.sh ci` (≈15 s, `[OK] Quality gate PASSED (exit code 0)`) | 0:30 |
| 12 | Conclusion | — | 0:45 |
| 13 | Tidy up after the presentation | `docker compose down` (dev stack), `./scripts/clean.sh` | — |

---

# 29. Final Pre-Presentation Checklist

## The day before

- [ ] `cd "/Users/parthspalav/Documents/College/Semester 7/DevOps/Theory IA/devops_ia"`
- [ ] `git status` shows a clean tree on `main`; `git log --oneline -3` shows `1d1557f` (or newer) on top.
- [ ] Docker Desktop running; `docker info --format '{{.ServerVersion}}'` prints a version.
- [ ] `./scripts/demo.sh full` → `FINAL RESULT: DEMONSTRATION SUCCESSFUL`; `echo $?` → `0`.
- [ ] Images cached (section 7 C command lists all eight images).
- [ ] Offline-safe: the demo succeeded once on this laptop (that is what caches everything). Optional: turn Wi-Fi off
      and run `./scripts/demo.sh full` again to see it yourself. (Verified in an isolated offline Docker daemon; not
      verified by switching off this laptop's Wi-Fi.)
- [ ] Report verified: `http://localhost:9323` shows Phase 1 PASSED, Phase 2 FAILED (1) with "✔ Regression detected,
      as expected.", Phase 3 PASSED; practise clicks 3–14 from section 22.
- [ ] Ports: `lsof -nP -iTCP:9323 -sTCP:LISTEN` (free or `com.docker`); decide about the Java program on 8080.
- [ ] Cleanup and restart tested: `./scripts/clean.sh` then `./scripts/demo.sh full` succeeds.
- [ ] Safety copy: `cp -R artifacts ~/Desktop/opsdesk-artifacts-backup`.
- [ ] Laptop charger packed; read sections 2, 12 and 23 again.

## 30 minutes before

```bash
cd "/Users/parthspalav/Documents/College/Semester 7/DevOps/Theory IA/devops_ia"
docker info --format '{{.ServerVersion}}'
git status
./scripts/clean.sh
./scripts/demo.sh full
echo $?
```

Expected: a version number; clean tree; `[OK] OpsDesk containers and networks removed`;
`FINAL RESULT: DEMONSTRATION SUCCESSFUL`; `0`. This warm-up run also refreshes the reports in case the live run fails.

Then:

```bash
./scripts/clean.sh
```

(stops the report viewer so the live run starts from a clean state; reports are kept).

- [ ] Plug in the charger; disable sleep; enable Do Not Disturb.
- [ ] Close heavy applications to free memory for Docker.

## 5 minutes before

Screens/windows that should be open:

```text
Docker Desktop running (whale icon in the menu bar)
Terminal window open in the project folder, large font, cleared (Cmd+K)
Browser with one empty tab (for http://localhost:9323)
Code editor with compose.yml, backend/src/routes/tickets.ts, e2e/tests/tickets.spec.ts,
    .github/workflows/e2e-quality-gate.yml already open in tabs (optional)
GitHub repository page optionally open (viewing only)
This guide open on a second screen or phone (section 20 / section 30)
No other opsdesk containers running: docker ps --filter name=opsdesk shows nothing
```

---

# 30. Cheat Sheet

## Main demo

```bash
cd "/Users/parthspalav/Documents/College/Semester 7/DevOps/Theory IA/devops_ia"
./scripts/demo.sh full
echo $?          # expect 0
```

## Report

`http://localhost:9323` → Phase 2 → **Open HTML report** → **E2E-04** → screenshot → **View Trace** → **Network** →
**Fetch** → **POST 201** row → back → **Backend log**

## Expected sequence

```text
12/12 PASS (gate GREEN, exit 0)
→ fault on: E2E-04 FAILS, 11 pass (gate RED, exit 1)
→ [EXPECTED FAILURE] … [OK] Regression detected by quality gate
→ fault off: 12/12 PASS (gate GREEN, exit 0)
→ FINAL RESULT: DEMONSTRATION SUCCESSFUL   (≈ 1 minute)
```

## Other commands

| Purpose | Command |
| --- | --- |
| Pass only | `./scripts/demo.sh pass` |
| Expected failure only | `./scripts/demo.sh fail` |
| CI gate locally | `./scripts/demo.sh ci` |
| Report viewer | `./scripts/demo.sh report` |
| Demo containers | `docker ps --filter name=opsdesk` |
| Show live app | `docker compose up -d --build --wait` → `http://localhost:8080` (demo@example.com / Demo123!) |
| Dev stack status / logs | `docker compose ps` / `docker compose logs backend` |
| Fault log lines | `grep -E 'WARNING|DEMO FAULT' artifacts/failure/backend.log` |

## Emergency cleanup

```bash
./scripts/clean.sh          # this project only; keeps images, volumes, reports
./scripts/demo.sh full
```

**Never:** `docker system prune -a`, Ctrl-C during the demo, `clean.sh --artifacts` before showing reports.

## Key concepts

| Term | One line |
| --- | --- |
| Playwright | Drives a real (headless) Chromium through 12 user journeys and records evidence |
| Docker | Every component runs from a pinned image — same everywhere, nothing installed on the host |
| Compose | Starts db → backend → frontend → tests in order, each waiting for the previous to be **healthy** |
| Quality gate | Playwright exit code → `--exit-code-from tests` → 0 = green, 1 = red |
| Fault injection | `FAULT_INJECTION_MODE=drop_ticket_write`: API says `201 Created` but never saves; only E2E-04 catches it |
| GitHub Actions | Runs the same Compose gate on push/PR to `main`, uploads `playwright-e2e-report` |

## Most important sentence

> "The API said the ticket was created, but the end-to-end test proved it was never saved — and because the test's
> exit code is the quality gate, that regression would have been blocked automatically, locally and in CI."
