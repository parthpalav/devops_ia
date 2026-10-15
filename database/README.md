# Database

PostgreSQL 18 (`postgres:18-alpine`). The files in `init/` are mounted into
`/docker-entrypoint-initdb.d` and executed in name order **only when the data directory is empty**.

| File | Purpose |
| --- | --- |
| `001_schema.sql` | `users` and `tickets` tables. Priority/status are constrained to `LOW/MEDIUM/HIGH` and `OPEN/IN_PROGRESS/RESOLVED`. |
| `002_seed.sql` | Defines `reset_demo_data()` (the single source of seed truth) and calls it once. |

## Seed data

- Demo user: `demo@example.com` / `Demo123!` (bcrypt hash stored, never plaintext; demo-only credentials)
- Six tickets with fixed timestamps:

| # | Title | Priority | Status |
| --- | --- | --- | --- |
| 1 | Database connection timeout | HIGH | OPEN |
| 2 | Update onboarding documentation | LOW | IN_PROGRESS |
| 3 | Fix dashboard alignment | MEDIUM | RESOLVED |
| 4 | Password reset email not delivered | HIGH | IN_PROGRESS |
| 5 | Add CSV export for reports | LOW | OPEN |
| 6 | Intermittent 502 on login page | MEDIUM | OPEN |

Dashboard totals for the seed: 6 total, 3 open, 2 in progress, 1 resolved.

## Resetting

- **During tests:** the backend exposes `POST /api/test/reset` (only when `ENABLE_TEST_ENDPOINTS=true`), which runs `SELECT reset_demo_data()`.
- **Demo/CI stacks:** use tmpfs storage, so every run starts from the seed automatically.
- **Development volume:** `docker compose down -v` removes the project-scoped `opsdesk_db-data` volume; the next `docker compose up` re-runs the init scripts.
