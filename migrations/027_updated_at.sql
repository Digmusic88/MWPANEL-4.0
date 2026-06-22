-- migrations/027_updated_at.sql
-- Control de version optimista: updated_at con bump automatico en UPDATE.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['students','families','guardians','enrollments','groups'] LOOP
    EXECUTE format('ALTER TABLE secretaria.%I ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION secretaria.fn_bump_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['students','families','guardians','enrollments','groups'] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_bump_updated_at ON secretaria.%I; '
      'CREATE TRIGGER trg_bump_updated_at BEFORE UPDATE ON secretaria.%I '
      'FOR EACH ROW EXECUTE FUNCTION secretaria.fn_bump_updated_at()', t, t);
  END LOOP;
END $$;
