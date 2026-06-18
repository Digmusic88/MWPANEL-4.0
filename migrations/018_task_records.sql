-- =====================================================================
-- Secretaría — Migración 018: registro de tareas por caritas (verde/naranja/roja)
-- =====================================================================
SET search_path TO secretaria, public;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='task_level') THEN
    CREATE TYPE secretaria.task_level AS ENUM ('verde','naranja','roja');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS secretaria.task_records (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id uuid NOT NULL REFERENCES secretaria.enrollments(id) ON DELETE CASCADE,
  date          date NOT NULL,
  level         secretaria.task_level NOT NULL DEFAULT 'verde',
  notes         text,
  recorded_by   uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, date)
);
CREATE INDEX IF NOT EXISTS idx_taskrec_date ON secretaria.task_records(date);

-- Auditoría para el historial (revertible)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='secretaria' AND event_object_table='task_records' AND trigger_name='trg_audit_task_records') THEN
    CREATE TRIGGER trg_audit_task_records AFTER INSERT OR UPDATE OR DELETE ON secretaria.task_records FOR EACH ROW EXECUTE FUNCTION secretaria.fn_audit();
  END IF;
END $$;
