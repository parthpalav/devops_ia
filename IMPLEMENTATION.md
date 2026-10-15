# DevOps Internal Assignment — Codex Implementation Specification

## Project Title

**Containerized Automated End-to-End Testing and CI Quality Validation of a Full-Stack Web Application**

### Primary Tool / Distinguishing Tool
**Playwright**

### Supporting DevOps Tools
- Docker
- Docker Compose
- GitHub Actions
- Git
- PostgreSQL
- Node.js / Express
- React / Vite / TypeScript

---

# 1. Purpose of This Document

This document is the **implementation specification** for the project. It is intended to be given directly to Codex so that the complete project can be implemented without having to infer the architecture, scope, expected behavior, demonstration flow, or definition of done.

The project is a **DevOps case study**, not merely a web-development project and not merely a Playwright tutorial.

The central idea is:

> Build a realistic full-stack application, containerize the entire application and its end-to-end test environment, automatically bring up all dependencies, execute Playwright tests in an isolated container, treat the test result as a quality gate, preserve diagnostic artifacts on failure, and run the exact same workflow locally and in GitHub Actions.

The web application exists primarily to provide a realistic system under test. The educational focus is on:

1. automated quality validation,
2. reproducible environments,
3. containerization,
4. service orchestration,
5. health-aware startup,
6. end-to-end testing,
7. deterministic fault injection,
8. CI quality gates,
9. failure diagnostics,
10. automation with minimal manual intervention.

---

# 2. Final Case Study Topic

## Topic

**Containerized Automated End-to-End Testing and CI Quality Validation of a Web Application Using Playwright and Docker**

## Short Description

The project demonstrates how a full-stack web application can be automatically validated using Playwright end-to-end tests running inside Docker. Docker Compose is used to create a reproducible multi-container test environment consisting of a frontend, backend, PostgreSQL database, and a dedicated Playwright test runner.

The system must automatically wait for its dependencies to become healthy before the test runner starts. Playwright then performs realistic user journeys through the application. The Playwright container's exit code acts as a **quality gate**: a successful test suite allows the pipeline to pass, while a failed test suite causes the pipeline to fail.

The same containerized test workflow is executed locally and in GitHub Actions.

A deterministic **fault-injection mode** must be included so that a presentation can demonstrate:

1. a healthy application passing all tests,
2. an intentionally introduced regression,
3. Playwright detecting the regression,
4. collection of screenshots, traces, video, and an HTML report,
5. restoration of healthy behavior,
6. the same test passing again.

This entire sequence must be executable through a single demonstration command/script.

---

# 3. Problem Statement

Modern applications consist of multiple services and dependencies. Manually testing every change is slow, inconsistent, and vulnerable to human error. Tests may also behave differently between developer machines because operating-system packages, browser versions, runtimes, environment variables, databases, and service startup timing can differ.

A DevOps-oriented testing system should therefore solve the following problems:

- How can the same test environment be reproduced on different machines?
- How can application dependencies start automatically in the correct order?
- How can the system verify that a service is actually ready rather than merely running?
- How can real browser workflows be tested without manual intervention?
- How can failed tests automatically stop a CI pipeline?
- How can engineers diagnose a browser test failure after it occurs?
- How can a controlled application failure be demonstrated reliably in a classroom?
- How can the local testing workflow and CI workflow remain as similar as possible?

This project must answer all of those questions.

---

# 4. Proposed Solution

Build a small but polished **Support Ticket / Issue Tracking application**.

The application will have:

- a React frontend,
- a Node.js / Express backend,
- a PostgreSQL database,
- token-based authentication,
- CRUD operations for support tickets,
- filtering and searching,
- a dashboard,
- a deterministic fault-injection switch,
- health endpoints,
- a Playwright end-to-end test suite.

Every major component will run as a container.

The primary runtime topology is:

```text
                         +----------------------+
                         |      Developer       |
                         +----------+-----------+
                                    |
                                    | one command / git push
                                    v
                         +----------------------+
                         |   Docker Compose     |
                         +----------+-----------+
                                    |
          +-------------------------+-------------------------+
          |                         |                         |
          v                         v                         v
+------------------+      +------------------+      +------------------+
|    PostgreSQL    |      | Express Backend  |      |  React Frontend  |
|    Container     |<---->|    Container     |<---->|    Container     |
+--------+---------+      +--------+---------+      +--------+---------+
         |                         |                         |
         |      health checks      |                         |
         +-------------------------+-------------------------+
                                    |
                                    v
                         +----------------------+
                         | Playwright Container |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | E2E Quality Gate     |
                         +----------+-----------+
                                    |
                       +------------+------------+
                       |                         |
                       v                         v
                 +-----------+            +-----------+
                 |   PASS    |            |   FAIL    |
                 +-----------+            +-----+-----+
                                                |
                                                v
                                  screenshots / video /
                                  traces / HTML report
```

GitHub Actions must not implement a separate test strategy. It must invoke the **same Docker Compose based test workflow** used locally.

---

# 5. Project Objectives

The finished project must demonstrate all of the following.

## 5.1 Reproducible Environment

A user with Docker installed should not need to manually install PostgreSQL, Playwright browsers, system browser libraries, the backend runtime, or the frontend runtime to execute the core demonstration.

## 5.2 Automated Service Orchestration

Docker Compose must:

1. start PostgreSQL,
2. wait for PostgreSQL to become healthy,
3. start the backend,
4. wait for the backend to become healthy,
5. start the frontend,
6. wait for the frontend to become healthy,
7. start the Playwright test runner only after the required services are ready.

Do not solve readiness using arbitrary `sleep 10` style delays.

Readiness must be based on actual health checks.

## 5.3 Automated End-to-End Validation

Playwright must test the application through the browser as a real user would.

## 5.4 Quality Gate

The Playwright test container's exit status must determine whether the automated run succeeds or fails.

A failed E2E test suite must produce a non-zero exit status.

## 5.5 Diagnostic Artifacts

On failure, Playwright must preserve useful artifacts including:

- screenshot,
- trace,
- video,
- HTML test report,
- machine-readable test result where practical.

## 5.6 Deterministic Failure Demonstration

A controlled fault must be injectable with an environment variable.

The fault must be:

- deterministic,
- reversible,
- clearly documented,
- safe,
- local to the demo,
- disabled by default.

## 5.7 Automated Recovery Demonstration

The demonstration automation must show that the exact same test that failed under fault mode passes after the fault is removed.

## 5.8 CI Integration

GitHub Actions must execute the Dockerized quality gate on repository changes.

---

# 6. Explicit Non-Goals

Do **not** add complexity that does not improve the case study.

The following are explicitly out of scope unless required by a technical dependency:

- Kubernetes
- Terraform
- Jenkins
- AWS/Azure/GCP deployment
- microservice decomposition
- Redis
- Kafka
- service mesh
- production-grade identity provider
- payment integration
- real email integration
- complex observability stacks
- Prometheus/Grafana
- Elasticsearch
- mobile application
- external SaaS dependencies required for the demo

The goal is not to build a production SaaS platform.

The goal is to build a realistic application that demonstrates a strong DevOps automated testing workflow.

---

# 7. Technology Decisions

Use these technologies unless an implementation constraint makes one impossible.

## 7.1 Frontend

- React
- TypeScript
- Vite
- React Router
- native Fetch API or a lightweight HTTP helper
- clean CSS or a lightweight styling solution

The UI should look polished enough for a presentation.

Do not spend excessive complexity on animations.

## 7.2 Backend

- Node.js
- TypeScript
- Express
- PostgreSQL driver using `pg`
- Zod for request validation
- `bcryptjs` for password verification
- `jsonwebtoken` for demo JWT authentication

Do not introduce an ORM unless there is a compelling implementation reason. SQL should remain easy to understand for an academic demonstration.

## 7.3 Database

- PostgreSQL
- Pin a stable major Docker image.
- Prefer `postgres:18-alpine` unless compatibility requires another stable major version.
- Use SQL initialization/migration files committed to the repository.
- Use a Docker named volume during normal development.
- Demo automation must be able to reset the database deterministically.

## 7.4 End-to-End Testing

- `@playwright/test`
- Use the official Microsoft Playwright Docker image.
- The Playwright package version in the repository and the Playwright Docker image version **must match exactly**.
- At the time this specification was written, official documentation shows `mcr.microsoft.com/playwright:v1.64.0-noble`.
- If Codex intentionally updates Playwright, update both the npm package version and Docker image tag together.

## 7.5 Containers

- Docker
- Docker Compose v2 syntax
- multi-stage Docker builds where useful
- health checks
- named networks only if the default Compose network is insufficient

## 7.6 CI

- GitHub Actions
- CI must call Docker Compose instead of duplicating the local setup with a separate host-installed test stack.

---

# 8. Application Domain

The sample application is a **Support Ticket Portal**.

Suggested product name:

**OpsDesk**

The name can be changed, but the domain must remain a support/issue tracking system because the tests below depend on ticket lifecycle behavior.

---

# 9. User Roles

Keep roles simple.

## 9.1 Demo User

Provide one seeded demonstration account.

Recommended credentials for local demonstration:

```text
Email: demo@example.com
Password: Demo123!
```

These credentials are intentionally non-secret demo credentials and must be documented in the README.

Do not use them as production credentials.

Only one role is required: authenticated user.

An administrator role is not required.

---

# 10. Functional Requirements

## 10.1 Login

The application must provide a login page with:

- email input,
- password input,
- login button,
- validation error region.

Correct credentials must authenticate the user.

Incorrect credentials must produce a visible error.

## 10.2 Protected Routes

Unauthenticated users attempting to visit protected application routes must be redirected to the login page.

## 10.3 Dashboard

After login, show a dashboard containing at least:

- total ticket count,
- open ticket count,
- in-progress ticket count,
- resolved ticket count,
- recent tickets.

## 10.4 Ticket List

Display tickets in a clear table or card layout.

Each ticket must include at minimum:

- ID,
- title,
- description,
- priority,
- status,
- created timestamp,
- updated timestamp.

## 10.5 Create Ticket

Authenticated user can create a ticket.

Fields:

- title — required,
- description — required,
- priority — LOW / MEDIUM / HIGH.

Initial status:

```text
OPEN
```

## 10.6 Edit Ticket

The user can edit:

- title,
- description,
- priority.

## 10.7 Change Ticket Status

Allowed statuses:

```text
OPEN
IN_PROGRESS
RESOLVED
```

## 10.8 Search

User can search tickets by title.

Search behavior must be deterministic and easy to test.

## 10.9 Filter

User can filter tickets by:

- status,
- priority.

## 10.10 Archive or Delete

Provide either:

- delete ticket, or
- archive ticket.

Choose one implementation and keep it consistent in tests and UI.

Recommended: **delete ticket** for simplicity.

## 10.11 Logout

Logout must:

- remove the auth token/session,
- redirect to the login screen.

---

# 11. Data Model

At minimum create these tables.

## 11.1 users

Suggested columns:

```text
id              UUID or serial primary key
email           unique, not null
password_hash   not null
created_at      timestamp
```

## 11.2 tickets

Suggested columns:

```text
id              UUID or serial primary key
title           varchar/text, not null
description     text, not null
priority        enum or constrained varchar: LOW | MEDIUM | HIGH
status          enum or constrained varchar: OPEN | IN_PROGRESS | RESOLVED
created_by      foreign key -> users.id
created_at      timestamp
updated_at      timestamp
```

The exact SQL representation may differ, but these concepts must exist.

---

# 12. Backend API Contract

Use an `/api` prefix.

## 12.1 Health

```http
GET /health
```

Response when healthy:

```json
{
  "status": "ok"
}
```

The endpoint should verify that the process is alive.

Prefer also verifying database connectivity so that "healthy" means the backend can actually reach PostgreSQL.

## 12.2 Login

```http
POST /api/auth/login
```

Request:

```json
{
  "email": "demo@example.com",
  "password": "Demo123!"
}
```

Response:

```json
{
  "token": "<jwt>",
  "user": {
    "id": "...",
    "email": "demo@example.com"
  }
}
```

## 12.3 Ticket APIs

```text
GET    /api/tickets
GET    /api/tickets/:id
POST   /api/tickets
PUT    /api/tickets/:id
DELETE /api/tickets/:id
```

Filters may use query parameters.

Example:

```http
GET /api/tickets?status=OPEN&priority=HIGH&search=database
```

## 12.4 Test Reset Endpoint

Provide a test-only endpoint:

```http
POST /api/test/reset
```

Requirements:

- available only when `ENABLE_TEST_ENDPOINTS=true`,
- inaccessible or returns 404 when disabled,
- clears test-created ticket state,
- recreates deterministic seed data,
- must not alter application source code,
- intended only for E2E isolation and demo reset.

Playwright may call this endpoint before tests or test groups.

This makes tests deterministic and independent.

---

# 13. Seed Data

Create deterministic seed data.

At minimum:

- one demo user,
- three or more tickets covering different statuses and priorities.

Example initial tickets:

```text
1. "Database connection timeout"
   priority: HIGH
   status: OPEN

2. "Update onboarding documentation"
   priority: LOW
   status: IN_PROGRESS

3. "Fix dashboard alignment"
   priority: MEDIUM
   status: RESOLVED
```

Tests must not depend on automatically generated ordering unless that ordering is explicitly defined.

---

# 14. Frontend Requirements for Reliable Automation

Playwright tests should prefer accessibility-oriented locators.

Therefore:

- form inputs must have labels,
- buttons must have meaningful accessible names,
- headings must use semantic heading elements,
- status/error messages should use appropriate ARIA roles where useful,
- avoid fragile CSS selector chains,
- use `data-testid` only where semantic locators are genuinely insufficient.

Example preferred locator:

```ts
page.getByRole('button', { name: 'Create ticket' })
```

Avoid:

```ts
page.locator('div:nth-child(3) > button.btn-primary')
```

The UI should be built for both humans and reliable automation.

---

# 15. Docker Architecture

Create at least these services:

```text
db
backend
frontend
tests
report-viewer
```

`report-viewer` may be profile-controlled or started only after tests.

## 15.1 db

Responsibilities:

- run PostgreSQL,
- persist normal development data,
- initialize schema and seed data,
- expose a health check using `pg_isready`.

Example concept:

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
  interval: 5s
  timeout: 5s
  retries: 10
  start_period: 10s
```

Use escaped Compose variables correctly.

## 15.2 backend

Responsibilities:

- connect to PostgreSQL,
- expose REST API,
- expose `/health`,
- support fault-injection environment variable,
- support test reset endpoint only when explicitly enabled.

Must depend on database health, not merely database container startup.

## 15.3 frontend

Responsibilities:

- build React application,
- serve compiled assets,
- point API requests to backend,
- expose a health check.

Prefer:

- build React in a Node build stage,
- serve production static files with Nginx in the final image.

## 15.4 tests

Responsibilities:

- use the official Playwright image,
- install repository npm dependencies if not baked into a custom test image,
- execute Playwright tests,
- output reports to a mounted artifact directory,
- exit `0` on success,
- exit non-zero on failure.

The tests service must wait until required application services are healthy.

## 15.5 report-viewer

Responsibilities:

- serve the generated Playwright HTML report over HTTP,
- require no Node installation on the host.

A lightweight Nginx container is acceptable.

Recommended URL:

```text
http://localhost:9323
```

---

# 16. Docker Compose Dependency Rules

Use long-form `depends_on`.

Conceptually:

```yaml
backend:
  depends_on:
    db:
      condition: service_healthy

frontend:
  depends_on:
    backend:
      condition: service_healthy

tests:
  depends_on:
    backend:
      condition: service_healthy
    frontend:
      condition: service_healthy
```

Do not rely solely on container startup order.

A running container is not necessarily a ready service.

---

# 17. Fault Injection

Fault injection is an essential presentation feature.

## 17.1 Environment Variable

Use:

```text
FAULT_INJECTION_MODE=none
```

Supported values:

```text
none
drop_ticket_write
```

Default:

```text
none
```

## 17.2 Fault Behavior

When:

```text
FAULT_INJECTION_MODE=drop_ticket_write
```

the backend's "create ticket" operation must simulate a regression.

Recommended implementation:

1. validate the request normally,
2. return an apparently successful response,
3. intentionally do not persist the ticket,
4. log a clear server-side message indicating that demo fault injection is active.

The Playwright test must then fail because the created ticket does not appear after the UI refresh/search.

This is preferable to simply returning a 500 response because it demonstrates the value of end-to-end validation: the UI/API can appear to accept an action while the expected user-visible outcome is incorrect.

## 17.3 Safety

Fault injection must:

- be disabled by default,
- be impossible to activate accidentally without the environment variable,
- be visibly labeled in backend logs,
- be documented as a demonstration-only feature.

Do not mutate source files during the demo.

Do not require live coding to introduce the fault.

---

# 18. Playwright Configuration

Create a dedicated Playwright configuration.

Recommended behavior:

```text
headless: true by default
workers in CI: 1
forbidOnly in CI: true
retries: 0 for deterministic demonstration
screenshot: only-on-failure
trace: retain-on-failure
video: retain-on-failure
HTML reporter enabled
list reporter enabled
JSON reporter enabled if useful for summary generation
```

Set a global timeout so a hung suite terminates itself cleanly and still has an opportunity to write reports.

Suggested:

```text
globalTimeout: 10 minutes
test timeout: 30 seconds
expect timeout: 5-10 seconds
```

Use explicit web base URL from environment:

```text
PLAYWRIGHT_BASE_URL=http://frontend
```

Inside Docker Compose, tests should access services through Compose service names rather than `localhost`.

---

# 19. Browser Strategy

## Required Quality Gate

Use **Chromium** for the default local and pull-request quality gate.

Reason:

- fast,
- reliable,
- visually familiar,
- enough for the core case study.

## Extended Regression

Also configure projects for:

- Chromium,
- Firefox,
- WebKit.

A scheduled or manually triggered CI workflow may run the complete cross-browser suite.

Do not make all three browsers mandatory for the fastest classroom demonstration unless performance is acceptable.

---

# 20. Required Playwright Test Cases

Implement approximately 10-12 meaningful tests.

The following tests are required unless an equivalent test provides the same coverage.

## Authentication

### E2E-01 Valid Login

Steps:

1. open login page,
2. enter valid demo credentials,
3. submit,
4. verify dashboard is visible.

Expected: pass.

### E2E-02 Invalid Login

Steps:

1. enter invalid password,
2. submit,
3. verify error message.

Expected: pass.

### E2E-03 Protected Route

Steps:

1. clear auth state,
2. navigate directly to tickets page,
3. verify redirect to login.

Expected: pass.

## Ticket Lifecycle

### E2E-04 Create Ticket

Steps:

1. login,
2. create unique ticket,
3. verify success UI,
4. search for the ticket,
5. verify it exists.

This is the test intentionally broken by `drop_ticket_write`.

### E2E-05 Edit Ticket

Steps:

1. create/find a ticket,
2. edit title or description,
3. save,
4. verify updated value is displayed.

### E2E-06 Change Status

Steps:

1. open a ticket,
2. change `OPEN` to `IN_PROGRESS`,
3. save,
4. verify status.

### E2E-07 Search Ticket

Steps:

1. create or use deterministic ticket,
2. search by title,
3. verify expected ticket appears,
4. verify irrelevant ticket does not appear if appropriate.

### E2E-08 Filter by Status

Apply a status filter and verify only matching results.

### E2E-09 Filter by Priority

Apply a priority filter and verify expected results.

### E2E-10 Delete Ticket

Delete a ticket and verify it no longer appears.

## Validation

### E2E-11 Required Field Validation

Attempt to create a ticket without a title or description.

Verify that the application blocks submission and provides a visible validation message.

## Session

### E2E-12 Logout

Login, logout, and verify the application returns to login and protected content is no longer accessible.

---

# 21. Test Isolation

Tests must not depend on another test having run first.

Use one or both of these techniques:

1. call `/api/test/reset` in `beforeEach` or before suitable test groups,
2. create uniquely named entities per test.

A recommended unique title pattern:

```text
PW-<timestamp>-<test-name>
```

Tests should remain deterministic.

Do not rely on unpredictable random data.

---

# 22. Test Artifacts

Artifacts must be written under a top-level host-visible directory:

```text
artifacts/
```

Recommended structure:

```text
artifacts/
├── latest/
│   ├── playwright-report/
│   ├── test-results/
│   └── results.json
├── pass/
├── failure/
└── recovery/
```

The full demo must preserve separate outputs for:

- healthy pass phase,
- expected failure phase,
- recovery phase.

Failure artifacts should include:

- screenshot,
- trace archive,
- video,
- HTML report.

---

# 23. Local Automation Commands

The project must support both Unix-like shells and PowerShell.

Do not assume that every user has `make`, Node.js, Bash, or PowerShell available across all operating systems.

Docker is the core prerequisite.

Provide:

```text
scripts/demo.sh
scripts/demo.ps1
```

Both scripts must implement equivalent behavior.

Also provide shorter wrappers if useful:

```text
demo.sh
demo.ps1
```

## 23.1 Pass Demo

Unix:

```bash
./scripts/demo.sh pass
```

PowerShell:

```powershell
./scripts/demo.ps1 pass
```

Expected behavior:

1. clean prior demo containers,
2. reset demo data/volume as needed,
3. build images,
4. start healthy application stack,
5. wait via Compose health dependencies,
6. run tests,
7. preserve artifacts,
8. stop/remove containers cleanly,
9. exit success only if tests passed.

## 23.2 Expected Failure Demo

Unix:

```bash
./scripts/demo.sh fail
```

PowerShell:

```powershell
./scripts/demo.ps1 fail
```

Expected behavior:

1. start stack with `FAULT_INJECTION_MODE=drop_ticket_write`,
2. execute the relevant E2E suite,
3. confirm that the ticket-creation E2E test fails,
4. preserve failure artifacts,
5. treat the expected detected regression as a **successful demonstration outcome**,
6. fail the demo script if Playwright unexpectedly reports all tests passing.

This distinction is important:

- the Playwright test process must fail,
- the outer demonstration script should recognize that this failure was expected.

## 23.3 Full Demo

Unix:

```bash
./scripts/demo.sh full
```

PowerShell:

```powershell
./scripts/demo.ps1 full
```

This is the primary classroom demonstration.

It must automatically perform:

```text
PHASE 1: BASELINE
healthy stack
-> tests run
-> tests pass

PHASE 2: REGRESSION
fault mode enabled
-> same environment recreated
-> tests run
-> regression detected
-> artifacts captured

PHASE 3: RECOVERY
fault mode disabled
-> environment recreated
-> tests run
-> tests pass again

PHASE 4: REPORT
-> preserve all phase artifacts
-> start report viewer
-> print report URL
-> optionally open report URL if a safe cross-platform method is available
```

The script must print clear phase headings.

Example:

```text
==================================================
PHASE 1/3 — BASELINE QUALITY GATE
==================================================

[OK] Database healthy
[OK] Backend healthy
[OK] Frontend healthy
[OK] Playwright suite passed

==================================================
PHASE 2/3 — CONTROLLED REGRESSION
==================================================

[OK] Fault injection enabled: drop_ticket_write
[EXPECTED FAILURE] E2E-04 Create Ticket
[OK] Regression detected by quality gate
[OK] Failure trace preserved

==================================================
PHASE 3/3 — RECOVERY
==================================================

[OK] Fault injection disabled
[OK] Playwright suite passed

DEMONSTRATION RESULT: SUCCESS
```

Do not use colors as the only method of conveying status.

---

# 24. Docker Compose Quality Gate Command

The implementation should use the behavior of:

```bash
docker compose up --build --abort-on-container-exit --exit-code-from tests tests
```

or an equivalent Compose command.

The critical requirement is:

> The overall Compose run must use the test service's exit code as the quality-gate result.

The exact Compose file names may alter the command.

---

# 25. Compose Files

Recommended structure:

```text
compose.yml
compose.demo.yml
compose.ci.yml
```

## compose.yml

Normal service definitions:

- db
- backend
- frontend
- tests
- report-viewer

## compose.demo.yml

Demo-specific overrides:

- `ENABLE_TEST_ENDPOINTS=true`
- fault mode selection
- artifact mounts
- deterministic demo settings

## compose.ci.yml

CI-specific overrides if needed:

- CI environment variables,
- no unnecessary published ports,
- artifact paths,
- resource constraints only if useful.

Avoid unnecessary duplication between files.

---

# 26. GitHub Actions

Create:

```text
.github/workflows/e2e-quality-gate.yml
```

## Trigger Requirements

Run on:

- push to `main`,
- pull request targeting `main`,
- manual `workflow_dispatch`.

Optionally add a scheduled extended regression workflow separately.

## CI Logic

The CI job must broadly do:

```text
checkout repository
        |
        v
docker compose build
        |
        v
docker compose starts database/backend/frontend
        |
        v
health checks become healthy
        |
        v
Playwright test container starts
        |
        v
tests execute
        |
        +---- PASS ----> workflow success
        |
        +---- FAIL ----> workflow failure
                         + upload artifacts
```

GitHub Actions must not manually reimplement application dependency installation if Docker already owns it.

This preserves **local/CI parity**.

## Artifact Upload

Upload Playwright artifacts whether tests pass or fail when practical.

Definitely upload on failure.

Include:

```text
artifacts/
```

Use a meaningful artifact name such as:

```text
playwright-e2e-report
```

Set a reasonable retention period.

---

# 27. Optional Scheduled Cross-Browser Regression

Create a second workflow only if the core workflow is stable:

```text
.github/workflows/nightly-cross-browser.yml
```

Run:

- Chromium,
- Firefox,
- WebKit.

This workflow may execute on:

- manual trigger,
- daily or weekly schedule.

Its purpose is to demonstrate that CI automation can execute deeper regression testing independently of a developer manually running tests.

Do not make this workflow a dependency for the core classroom demo.

---

# 28. Suggested Repository Structure

Use this as the target layout.

```text
devops-playwright-quality-gate/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── main.tsx
│   ├── public/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── db/
│   │   ├── config/
│   │   └── server.ts
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── database/
│   ├── init/
│   │   ├── 001_schema.sql
│   │   └── 002_seed.sql
│   └── README.md
│
├── e2e/
│   ├── tests/
│   │   ├── auth.spec.ts
│   │   ├── tickets.spec.ts
│   │   ├── validation.spec.ts
│   │   └── session.spec.ts
│   ├── helpers/
│   ├── fixtures/
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── playwright.config.ts
│
├── scripts/
│   ├── demo.sh
│   ├── demo.ps1
│   ├── clean.sh
│   └── clean.ps1
│
├── artifacts/
│   └── .gitkeep
│
├── .github/
│   └── workflows/
│       ├── e2e-quality-gate.yml
│       └── nightly-cross-browser.yml
│
├── compose.yml
├── compose.demo.yml
├── compose.ci.yml
├── .env.example
├── .gitignore
├── README.md
└── PROJECT_SPEC.md
```

Minor structural deviations are acceptable only if they improve clarity without changing the architecture.

---

# 29. Environment Variables

Create `.env.example`.

At minimum:

```env
POSTGRES_DB=opsdesk
POSTGRES_USER=opsdesk
POSTGRES_PASSWORD=opsdesk_dev_password

DATABASE_URL=postgresql://opsdesk:opsdesk_dev_password@db:5432/opsdesk

JWT_SECRET=demo-only-change-me
JWT_EXPIRES_IN=1h

DEMO_USER_EMAIL=demo@example.com
DEMO_USER_PASSWORD=Demo123!

ENABLE_TEST_ENDPOINTS=true
FAULT_INJECTION_MODE=none

PLAYWRIGHT_BASE_URL=http://frontend
CI=false
```

Do not commit a real secret.

All credentials are demo/development credentials only.

---

# 30. Security Boundaries

Although this is an academic demo, implement basic hygiene.

- passwords must not be stored in plaintext in the database,
- backend must validate request payloads,
- JWT secret comes from environment,
- test reset endpoint disabled unless explicitly enabled,
- CORS should be restrictive enough for the local frontend,
- SQL must use parameterized queries,
- do not expose database publicly unless required for debugging,
- never store real credentials in the repository.

Do not over-engineer security at the expense of the demonstration.

---

# 31. Health Checks

Every long-running application service must have meaningful readiness checks.

## Database

Use:

```text
pg_isready
```

## Backend

Use:

```text
GET /health
```

Backend health should preferably verify database access.

## Frontend

Use an HTTP GET to the served frontend.

The Playwright service must not begin until the frontend and backend are healthy.

---

# 32. Logging

Logs should be presentation-friendly.

Backend startup should show:

```text
[backend] connected to database
[backend] listening on port 3000
[backend] fault injection mode: none
```

Fault mode should clearly show:

```text
[backend] WARNING: DEMO FAULT INJECTION ACTIVE
[backend] mode: drop_ticket_write
```

Never print passwords or JWT secrets.

---

# 33. Report Viewer

After a test run, provide a simple method to view the HTML report without requiring Playwright on the host.

Recommended implementation:

- `report-viewer` Nginx container,
- mount the selected report directory,
- expose:

```text
http://localhost:9323
```

The full demo script should print:

```text
Playwright report: http://localhost:9323
```

If cross-platform auto-opening can be implemented safely, it may be attempted, but report generation must not depend on auto-opening.

---

# 34. Presentation Flow

The project should support the following classroom presentation with minimal manual work.

## Step 1 — Explain the problem

Explain that manual testing is inconsistent and local environments differ.

## Step 2 — Show architecture

Show:

```text
Docker Compose
  -> PostgreSQL
  -> Backend
  -> Frontend
  -> Playwright
  -> Quality Gate
```

## Step 3 — Run one command

Example:

```bash
./scripts/demo.sh full
```

or:

```powershell
./scripts/demo.ps1 full
```

## Step 4 — Baseline pass

Explain:

- Compose starts dependencies,
- health checks ensure readiness,
- Playwright runs browser workflows,
- all tests pass.

## Step 5 — Controlled regression

Explain:

- no source code is manually edited,
- a demo environment variable enables a simulated persistence regression,
- Playwright repeats the user journey,
- the UI action appears to succeed but the resulting ticket is missing,
- E2E validation detects the problem.

## Step 6 — Failure diagnostics

Show:

- failed test,
- screenshot,
- trace,
- video,
- HTML report.

## Step 7 — Recovery

Fault is disabled automatically.

The environment is recreated.

The same test passes.

## Step 8 — CI

Show GitHub Actions running the same containerized quality gate.

Explain:

> Docker provides a reproducible environment, Compose orchestrates dependencies, Playwright verifies the complete user workflow, and GitHub Actions invokes the same quality gate automatically when code changes.

---

# 35. Why This Is a DevOps Project

The presentation must emphasize the following.

Playwright by itself is a testing framework.

The DevOps case study is created by integrating Playwright into a reproducible and automated delivery-quality workflow.

## DevOps Concepts Demonstrated

### Continuous Integration

Tests automatically execute when code changes.

### Shift-Left Testing

Application behavior is validated before release rather than relying entirely on manual testing after deployment.

### Environment Consistency

Docker standardizes runtime and browser dependencies.

### Infrastructure Orchestration

Docker Compose defines service topology and startup dependencies.

### Health-Aware Automation

Tests execute only after dependencies are actually ready.

### Quality Gates

A non-zero test result automatically fails the pipeline.

### Repeatability

The same test stack runs locally and in CI.

### Failure Observability

Screenshots, videos, reports, and traces make failures diagnosable.

### Automated Regression Detection

A deliberately injected software regression is detected without a human manually checking the interface.

---

# 36. Expected Demo Narrative

A concise explanation can be:

> "The application is composed of a frontend, API, and PostgreSQL database. Docker packages each component into a reproducible environment, while Docker Compose orchestrates startup and health dependencies. Once the application is healthy, a separate Playwright container performs automated end-to-end user journeys. The Playwright exit code is used as a quality gate. If a user workflow fails, the automated pipeline fails and diagnostic artifacts are preserved. The same Docker Compose quality gate is invoked by GitHub Actions, so the local and CI test environments remain consistent."

During fault phase:

> "Fault injection simulates a regression where the application acknowledges ticket creation but fails to persist the ticket. A superficial API-only check could miss the complete user outcome. Playwright repeats the real browser workflow and detects that the created ticket is absent, causing the quality gate to fail."

During recovery:

> "The fault is disabled, the environment is recreated, and the same regression test passes again, proving that the quality gate can distinguish healthy and defective application behavior."

---

# 37. README Requirements

The repository README must include:

1. project title,
2. problem statement,
3. architecture diagram,
4. technologies,
5. prerequisites,
6. quick start,
7. demo credentials,
8. development start command,
9. test command,
10. full demo command,
11. fault-injection explanation,
12. report viewing instructions,
13. GitHub Actions explanation,
14. troubleshooting,
15. project structure,
16. assignment/presentation explanation.

A user should be able to clone the repository and understand how to run the demonstration without reading the source code.

---

# 38. Host Prerequisites

The core demonstration must require only:

- Docker Engine + Docker Compose v2, or Docker Desktop,
- Git for cloning the project,
- sufficient disk space for browser/container images.

Node.js should **not** be required on the host for the Dockerized demonstration.

A local non-Docker developer workflow may optionally use Node.js, but it is not the canonical demo path.

---

# 39. Determinism Requirements

Classroom demonstrations must be reliable.

Therefore:

- pin important image/package versions,
- reset state before demonstration phases,
- use health checks,
- use one Playwright worker for the core quality gate,
- avoid random third-party APIs,
- avoid external network dependencies after images/dependencies have been built where practical,
- use deterministic seed data,
- use deterministic fault injection,
- do not depend on manually changing code,
- do not depend on exact timing sleeps.

---

# 40. Failure Handling in Demo Script

The outer demo script must understand three outcomes.

## Baseline Phase

Expected Playwright result:

```text
PASS
```

If it fails, the full demo fails.

## Fault Phase

Expected Playwright result:

```text
FAIL
```

If it passes, the full demo fails because the controlled regression was not detected.

## Recovery Phase

Expected Playwright result:

```text
PASS
```

If it fails, the full demo fails.

Therefore the final full-demo success condition is:

```text
baseline_passed
AND regression_was_detected
AND recovery_passed
```

---

# 41. Cleanup Requirements

Provide an automated cleanup path.

Unix:

```bash
./scripts/clean.sh
```

PowerShell:

```powershell
./scripts/clean.ps1
```

Cleanup should:

- stop project containers,
- remove project containers,
- optionally remove demo volumes,
- preserve artifacts unless explicitly requested to delete them.

Do not use broad commands that delete unrelated Docker resources on the user's machine.

Avoid:

```bash
docker system prune -a
```

in automated scripts.

---

# 42. Developer Experience

Useful commands should be documented.

Examples may include:

```bash
docker compose up --build
docker compose down
docker compose logs -f backend
docker compose ps
```

Testing command should remain concise.

Do not require users to remember a long set of manual commands for the actual presentation.

---

# 43. CI/Local Parity

This is an important architecture requirement.

Avoid this situation:

```text
Local:
Docker Compose -> Playwright

CI:
npm install -> custom service startup -> different Playwright config
```

Prefer:

```text
Local:
Docker Compose -> Playwright

CI:
Docker Compose -> Playwright
```

CI can add artifact upload and metadata, but should not create an unrelated test architecture.

---

# 44. Suggested CI Quality Gate Flow

```text
Pull Request / Push
        |
        v
GitHub Actions Runner
        |
        v
Checkout
        |
        v
docker compose build
        |
        v
PostgreSQL starts
        |
        v
PostgreSQL healthy
        |
        v
Backend starts
        |
        v
Backend healthy
        |
        v
Frontend starts
        |
        v
Frontend healthy
        |
        v
Playwright container starts
        |
        v
E2E tests
        |
   +----+----+
   |         |
 PASS       FAIL
   |         |
   v         v
green CI   red CI
             |
             v
       upload artifacts
```

---

# 45. Acceptance Criteria

The project is not complete until every required item below is satisfied.

## Application

- [ ] User can log in with seeded credentials.
- [ ] Invalid login shows an error.
- [ ] Protected routes require authentication.
- [ ] Dashboard renders ticket metrics.
- [ ] User can create a ticket.
- [ ] User can edit a ticket.
- [ ] User can change status.
- [ ] User can search tickets.
- [ ] User can filter tickets.
- [ ] User can delete a ticket.
- [ ] User can log out.
- [ ] Data persists in PostgreSQL during normal operation.

## Containers

- [ ] Database runs in Docker.
- [ ] Backend runs in Docker.
- [ ] Frontend runs in Docker.
- [ ] Playwright runs in Docker.
- [ ] Playwright package/image versions match.
- [ ] Service health checks exist.
- [ ] Compose waits for health before tests.
- [ ] Test exit code controls Compose result.

## Automated Tests

- [ ] At least 10 meaningful Playwright E2E tests exist.
- [ ] Core suite uses Chromium.
- [ ] Tests are isolated/deterministic.
- [ ] Screenshots are retained on failure.
- [ ] Traces are retained on failure.
- [ ] Videos are retained on failure.
- [ ] HTML report is generated.
- [ ] Machine-readable result is available where practical.

## Fault Injection

- [ ] `FAULT_INJECTION_MODE=none` works.
- [ ] `FAULT_INJECTION_MODE=drop_ticket_write` works.
- [ ] Fault causes E2E-04 or equivalent ticket-persistence test to fail.
- [ ] Fault is disabled by default.
- [ ] Fault is clearly logged.
- [ ] Source code does not need to be edited during the demo.

## Demo Automation

- [ ] Pass mode exists.
- [ ] Fail mode exists.
- [ ] Full mode exists.
- [ ] Full mode performs pass -> expected fail -> recovery pass.
- [ ] Full mode validates expected exit codes.
- [ ] Full mode preserves phase artifacts.
- [ ] Full mode starts or provides access to report viewer.
- [ ] Bash script exists.
- [ ] PowerShell equivalent exists.

## GitHub Actions

- [ ] Runs on push to main.
- [ ] Runs on PR to main.
- [ ] Supports manual trigger.
- [ ] Executes Docker Compose quality gate.
- [ ] CI fails when Playwright quality gate fails.
- [ ] Artifacts are uploaded.
- [ ] Local and CI workflows use the same core Compose architecture.

## Documentation

- [ ] README explains setup.
- [ ] Architecture diagram included.
- [ ] Demo credentials documented.
- [ ] Commands documented.
- [ ] Fault injection documented.
- [ ] Troubleshooting documented.
- [ ] DevOps relevance explicitly explained.

---

# 46. Definition of Done

"Done" does not mean that the application merely runs.

The project is considered done only when a fresh reviewer can:

1. clone the repository,
2. copy or use documented demo environment configuration,
3. run the documented Docker command/script,
4. watch Compose build/start the application,
5. see health checks succeed,
6. see Playwright execute automatically,
7. see the baseline suite pass,
8. run the full automated demo,
9. see fault mode cause the expected E2E failure,
10. inspect a trace/screenshot/video/report,
11. see the recovery run pass,
12. push/open a PR and see GitHub Actions execute the same quality gate.

---

# 47. Codex Implementation Instructions

Codex should implement the project in milestones.

Do not attempt to add optional complexity before the core quality gate works.

## Milestone 1 — Repository Scaffold

Create:

- frontend,
- backend,
- database initialization,
- e2e,
- Compose files,
- scripts,
- README skeleton.

Commit/build must remain clean.

## Milestone 2 — Database + Backend

Implement:

- schema,
- seed data,
- authentication,
- ticket CRUD,
- filters,
- health endpoint,
- test reset endpoint.

Verify with direct API calls.

## Milestone 3 — Frontend

Implement:

- login,
- protected routing,
- dashboard,
- ticket list,
- create/edit/delete,
- status update,
- search/filter,
- logout.

Make UI clean and presentation-ready.

## Milestone 4 — Containerization

Containerize:

- frontend,
- backend,
- PostgreSQL.

Implement health checks.

Verify:

```text
docker compose up --build
```

brings up a working application with no manual dependency startup.

## Milestone 5 — Playwright Container

Add:

- official Playwright image,
- exact package/image version match,
- browser tests,
- report configuration,
- artifact persistence.

Make quality gate exit status work.

## Milestone 6 — Fault Injection

Implement:

```text
FAULT_INJECTION_MODE=drop_ticket_write
```

Confirm:

- healthy mode passes,
- fault mode fails the correct test,
- failure is deterministic.

## Milestone 7 — Demo Automation

Implement Bash and PowerShell scripts.

Confirm full mode:

```text
PASS -> EXPECTED FAIL -> PASS
```

with no source editing.

## Milestone 8 — GitHub Actions

Implement CI invoking Docker Compose.

Upload reports.

Verify a deliberately failing branch produces a red workflow.

## Milestone 9 — Report Viewer

Add containerized HTML report viewer.

Make artifact/report access simple.

## Milestone 10 — Documentation and Polish

Finish:

- README,
- diagrams,
- troubleshooting,
- project comments,
- demo narrative.

Run from a clean state before declaring completion.

---

# 48. Engineering Rules for Codex

Codex must follow these implementation rules.

1. Prefer clarity over clever abstractions.
2. Do not silently change the case-study architecture.
3. Do not add cloud services that make the demo dependent on Internet availability.
4. Do not require host Node.js for the canonical Docker demo.
5. Do not use arbitrary sleep commands as readiness mechanisms.
6. Do not make Playwright tests depend on one another.
7. Do not use fragile selectors when semantic locators are available.
8. Do not commit secrets.
9. Do not make fault injection active by default.
10. Do not hide a failed Playwright exit code.
11. Do not make CI use a completely different test environment.
12. Do not use `latest` tags for important runtime/test images when a stable version can be pinned.
13. Keep application code, test code, and demo automation logically separated.
14. Make scripts idempotent: rerunning them should not leave the project in an undefined state.
15. Preserve useful failure artifacts before cleaning containers.
16. Never delete unrelated Docker images, containers, networks, or volumes.
17. Document every command expected to be used in the presentation.

---

# 49. Reliability Considerations

## Problem: Database is running but not ready

Solution:

```text
healthcheck + depends_on: condition: service_healthy
```

## Problem: Frontend starts before backend

Solution:

Backend health dependency and frontend/runtime API retry handling where appropriate.

## Problem: Test begins before app is usable

Solution:

Test service depends on frontend/backend health.

Playwright may additionally use its own navigation assertions.

## Problem: Browser dependency differences between machines

Solution:

Official version-pinned Playwright Docker image.

## Problem: CI behaves differently from local

Solution:

Both invoke the same Compose stack.

## Problem: Test data from a previous run causes failures

Solution:

Deterministic reset endpoint and/or database volume reset for demo phases.

## Problem: Live demonstration failure is unpredictable

Solution:

No live code modification. Use deterministic fault-injection environment variable.

## Problem: Headed browser from Docker is awkward across operating systems

Solution:

The canonical Docker quality gate runs headlessly and records trace/video/screenshots. The HTML report provides a visual explanation after the automated run.

Do **not** make host GUI forwarding a dependency of the presentation.

A separate optional local headed mode may be added for development, but it is not required.

---

# 50. Why Headless Docker Testing Is the Canonical Demo

Running a visible Linux browser window from a container to a Windows/macOS/Linux host can introduce platform-specific GUI forwarding requirements.

That would weaken reliability.

Therefore the main demonstration should emphasize:

- automated test execution in Docker,
- readable live terminal test output,
- automatic success/failure status,
- recorded screenshots/video,
- Playwright Trace Viewer artifacts,
- HTML report.

This preserves demonstrability while keeping the environment portable.

An optional headed developer workflow can exist, but must not be required for assessment.

---

# 51. Possible Presentation Screens

Prepare the project so that the following screens are visually useful:

1. application login page,
2. dashboard,
3. tickets page,
4. terminal running `demo full`,
5. `docker compose ps` with healthy services,
6. Playwright HTML report,
7. failed test trace,
8. GitHub Actions successful workflow,
9. GitHub Actions failed quality gate example if available.

---

# 52. Recommended Visual Quality

The application should look professional enough that it does not resemble an unstyled tutorial.

Suggested UI characteristics:

- clean navigation sidebar/header,
- dashboard statistic cards,
- clear status badges,
- ticket priority badges,
- responsive ticket table/cards,
- clear empty/loading/error states,
- modal or dedicated form for ticket creation/editing,
- confirmation before deletion,
- toast or inline success/error feedback.

Do not let visual polish interfere with stable Playwright locators.

---

# 53. Suggested Status/Priority Semantics

Status:

```text
OPEN
IN_PROGRESS
RESOLVED
```

Priority:

```text
LOW
MEDIUM
HIGH
```

Keep these values consistent across:

- SQL constraints,
- TypeScript types,
- backend validation,
- UI labels,
- Playwright tests.

---

# 54. Suggested Environment Profiles

## Development

```text
FAULT_INJECTION_MODE=none
ENABLE_TEST_ENDPOINTS=true
```

## Demo Baseline

```text
FAULT_INJECTION_MODE=none
ENABLE_TEST_ENDPOINTS=true
```

## Demo Failure

```text
FAULT_INJECTION_MODE=drop_ticket_write
ENABLE_TEST_ENDPOINTS=true
```

## CI

```text
CI=true
FAULT_INJECTION_MODE=none
ENABLE_TEST_ENDPOINTS=true
```

Test-only endpoints should never be implied to be safe for production deployment.

---

# 55. Quality Gate Semantics

A quality gate is not simply "we ran tests."

The project must demonstrate:

```text
automated verification result
          |
          v
    decision point
      /       \
     /         \
continue      stop
```

In this project:

```text
Playwright exit code 0
        ->
CI success

Playwright non-zero exit code
        ->
CI failure
```

This relationship must remain visible in scripts and documentation.

Do not mask test failures with commands such as:

```bash
npx playwright test || true
```

except inside the explicit demo-failure wrapper where the non-zero code is captured, inspected, and verified as an expected outcome.

---

# 56. Example Demonstration Success Criteria

The full demo should produce a final summary similar to:

```text
==================================================
DEVOPS QUALITY GATE DEMONSTRATION SUMMARY
==================================================

Baseline validation:          PASS
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
==================================================
```

---

# 57. Troubleshooting Requirements

README should contain solutions for at least:

## Port already in use

Explain how to change mapped ports or stop project containers.

## Docker image build fails

Explain:

```text
docker compose build --no-cache
```

only when appropriate.

## Database volume contains stale state

Provide a project-scoped volume reset command.

## Backend unhealthy

Show:

```text
docker compose logs backend
docker compose logs db
```

## Frontend unhealthy

Show frontend logs.

## Playwright browser failure

Show tests logs and remind that Playwright package/image versions must match.

## Artifacts not writable

Document host-volume permission remediation without weakening all system permissions.

## Cleanup

Provide project-specific cleanup scripts.

---

# 58. Academic Talking Points

The student should be able to answer these questions.

## Why Playwright?

Because it performs end-to-end browser automation against real user workflows and produces rich debugging artifacts.

## Why Docker?

To make runtimes, browsers, system dependencies, and services reproducible.

## Why Docker Compose?

To define and orchestrate the multi-container environment and its dependency/health relationships.

## Why PostgreSQL?

To demonstrate that the system tests a genuine stateful full-stack application, not only static frontend behavior.

## Why GitHub Actions?

To trigger the same quality gate automatically when code changes, representing continuous integration.

## Why health checks?

Container "running" does not mean application "ready." Health checks prevent race conditions.

## Why fault injection?

To prove that the quality gate can detect a known application regression in a repeatable classroom demonstration.

## Why preserve traces/screenshots/video?

Automated tests are most useful when failures can be investigated after the run.

## Why use the same Compose setup locally and in CI?

To reduce environment drift and "works on my machine" discrepancies.

---

# 59. Scope Control

If time becomes limited, preserve features in this priority order:

## Must Keep

1. frontend/backend/database,
2. Dockerized services,
3. Playwright container,
4. health checks,
5. E2E tests,
6. quality-gate exit behavior,
7. deterministic fault injection,
8. pass/fail/recovery demo,
9. GitHub Actions,
10. HTML/failure artifacts.

## May Simplify

- number of dashboard charts,
- advanced styling,
- extra ticket fields,
- cross-browser scheduled workflow,
- automatic report browser opening.

## Do Not Sacrifice

- deterministic demo,
- test reliability,
- health-aware orchestration,
- Playwright/Docker version matching,
- CI/local parity.

---

# 60. Deliverables

The final repository must contain:

1. source code,
2. Dockerfiles,
3. Docker Compose configuration,
4. database schema/seed,
5. Playwright tests,
6. automated demo scripts,
7. GitHub Actions workflow,
8. generated-report support,
9. `.env.example`,
10. README,
11. architecture diagram,
12. this specification or an updated equivalent.

---

# 61. Exact Assignment Entry

## Case Study Topic

**Containerized Automated End-to-End Testing and CI Quality Validation of a Web Application Using Playwright and Docker**

## Tools Selected

**Playwright, Docker, Docker Compose, GitHub Actions**

## Practical Demonstration

**Containerize a full-stack web application and its Playwright end-to-end testing environment using Docker and Docker Compose. Automatically start the PostgreSQL database, backend, frontend, and test runner using health-aware service dependencies. Execute browser-based Playwright tests as a CI quality gate, generate HTML reports and diagnostic artifacts on failure, and demonstrate deterministic regression detection using controlled fault injection followed by an automated recovery test. Integrate the same containerized quality gate with GitHub Actions so that it runs automatically on code changes.**

---

# 62. Final Expected Project Story

The finished project should tell one coherent story:

> A software team has a full-stack support-ticket application. Instead of manually configuring a database, installing browsers, starting services in the correct order, and manually checking the UI after every change, the entire validation environment is defined as code using Docker and Docker Compose. Service health checks guarantee that testing starts only when dependencies are ready. Playwright then exercises the application through real browser workflows. Its exit status becomes an automated quality gate, and failures preserve diagnostic evidence. A controlled fault proves that the gate can detect an application regression. Once the fault is removed, the same test suite verifies recovery. GitHub Actions automatically executes this same containerized workflow on code changes, demonstrating a practical DevOps CI testing strategy.

If the implementation does not clearly communicate this story, simplify or revise it until it does.

---

# 63. Implementation Completion Instruction to Codex

**Implement the project described in this specification end-to-end. Work milestone by milestone. After each milestone, run the relevant build/tests and correct failures before proceeding. Do not mark the project complete based only on code generation. The final validation must be performed from a clean Docker state using the documented full demonstration command and the CI-compatible quality-gate command. Ensure the baseline passes, the controlled regression is detected, and the recovery phase passes.**

---

# 64. Official Technical References

Use official documentation as the authority when implementation details change.

## Playwright — Continuous Integration

https://playwright.dev/docs/ci

Key requirements supported by the documentation:

- Playwright can run in CI.
- Official Docker images are available.
- CI can generate an HTML report.
- Browser execution can run in containers.
- Playwright recommends stable/reproducible CI configuration.

## Playwright — Docker

https://playwright.dev/docs/docker

Important:

- pin the Playwright Docker image version,
- keep the Docker image version aligned with the Playwright package version,
- the image includes browsers and browser system dependencies.

## Docker Compose — Startup and Shutdown Order

https://docs.docker.com/compose/how-tos/startup-order/

Important:

- `depends_on` controls dependencies,
- `service_healthy` allows Compose to wait for a dependency health check,
- "running" and "ready" are different states.

## Docker Compose — `up`

https://docs.docker.com/reference/cli/docker/compose/up/

Important options used by this design:

```text
--build
--abort-on-container-exit
--exit-code-from
```

`--exit-code-from tests` allows the test container to act as the automated quality gate.

## GitHub Actions

https://docs.github.com/actions

Use GitHub Actions only as the remote CI automation layer. The core application/test environment remains defined by Docker Compose.

---

# End of Specification
