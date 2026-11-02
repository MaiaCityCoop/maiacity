-- play's place in the production Postgres (play/SPEC.md §2), run once as the database's owner:
--   docker compose exec -T db psql -U maiacity -d maiacity -v pw="'<password>'" < play/deploy/setup.sql
-- A role of its own that owns the schema play and nothing else; for the one-time import it may read the legacy
-- founders and passkeys (play/api/import/run.ts --founders), revoked again by play/deploy/after-import.sql.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'play') THEN
    CREATE ROLE play LOGIN;
  END IF;
END $$;
ALTER ROLE play PASSWORD :pw;
CREATE SCHEMA IF NOT EXISTS play AUTHORIZATION play;
REVOKE ALL ON SCHEMA public FROM play;
GRANT USAGE ON SCHEMA public TO play;
GRANT SELECT ON public.founders, public.passkeys TO play;
