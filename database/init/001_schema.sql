-- OpsDesk schema.
-- Executed automatically by the official postgres image on first start (empty data directory).

CREATE TABLE IF NOT EXISTS users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tickets (
    id          SERIAL       PRIMARY KEY,
    title       VARCHAR(200) NOT NULL CHECK (length(btrim(title)) > 0),
    description TEXT         NOT NULL CHECK (length(btrim(description)) > 0),
    -- Constrained varchars keep the allowed values visible and easy to explain.
    priority    VARCHAR(10)  NOT NULL DEFAULT 'MEDIUM'
                CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    status      VARCHAR(20)  NOT NULL DEFAULT 'OPEN'
                CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
    created_by  UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tickets_status_idx   ON tickets (status);
CREATE INDEX IF NOT EXISTS tickets_priority_idx ON tickets (priority);
