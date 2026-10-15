-- OpsDesk deterministic seed data.
--
-- The seed lives in a function so there is exactly ONE definition of "known good state":
--   * this file calls it once when the database is first initialised, and
--   * the backend's test-only endpoint POST /api/test/reset calls it before every E2E test.
--
-- Demo credentials (non-secret, demonstration only):  demo@example.com / Demo123!
-- The password is stored as a bcrypt hash (cost 10), never in plaintext.

CREATE OR REPLACE FUNCTION reset_demo_data() RETURNS integer
LANGUAGE plpgsql
AS $fn$
DECLARE
    demo_user_id  UUID;
    seeded_count  INTEGER;
BEGIN
    -- Remove every ticket (including ones created by tests) and restart IDs at 1.
    TRUNCATE TABLE tickets RESTART IDENTITY;

    INSERT INTO users (email, password_hash)
    VALUES ('demo@example.com', '$2b$10$dbY3eOKfpbRBTSspoMAtre3mkP8cc.j3iNodaP.3939RX8wSItANe')
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    RETURNING id INTO demo_user_id;

    -- Fixed timestamps keep ordering and the UI deterministic.
    INSERT INTO tickets (title, description, priority, status, created_by, created_at, updated_at) VALUES
        ('Database connection timeout',
         'API requests intermittently fail with "connection timeout" when the primary database is under load.',
         'HIGH', 'OPEN', demo_user_id, '2026-01-05 09:15:00+00', '2026-01-05 09:15:00+00'),
        ('Update onboarding documentation',
         'The new-hire onboarding guide still references the old VPN client and needs a refresh.',
         'LOW', 'IN_PROGRESS', demo_user_id, '2026-01-06 10:30:00+00', '2026-01-08 14:00:00+00'),
        ('Fix dashboard alignment',
         'Statistic cards on the dashboard overlap on narrow laptop screens.',
         'MEDIUM', 'RESOLVED', demo_user_id, '2026-01-07 11:45:00+00', '2026-01-09 16:20:00+00'),
        ('Password reset email not delivered',
         'Several customers report that password reset emails never arrive.',
         'HIGH', 'IN_PROGRESS', demo_user_id, '2026-01-08 08:05:00+00', '2026-01-10 09:00:00+00'),
        ('Add CSV export for reports',
         'Finance would like to export the monthly ticket report as CSV.',
         'LOW', 'OPEN', demo_user_id, '2026-01-09 13:10:00+00', '2026-01-09 13:10:00+00'),
        ('Intermittent 502 on login page',
         'The load balancer occasionally returns 502 Bad Gateway on the login page during deployments.',
         'MEDIUM', 'OPEN', demo_user_id, '2026-01-10 15:40:00+00', '2026-01-10 15:40:00+00');

    SELECT count(*) INTO seeded_count FROM tickets;
    RETURN seeded_count;
END;
$fn$;

SELECT reset_demo_data();
