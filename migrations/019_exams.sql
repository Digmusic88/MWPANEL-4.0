-- =====================================================================
-- Secretaría — Migración 019: convocatorias de examen + confirmación de asistencia
-- =====================================================================
SET search_path TO secretaria, public;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='exam_attend') THEN
    CREATE TYPE secretaria.exam_attend AS ENUM ('sin_confirmar','asiste','no_asiste');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS secretaria.exam_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar NOT NULL,
  level varchar NOT NULL,            -- KEY / PET / FCE / CAE
  exam_date date,
  academic_year_id uuid REFERENCES secretaria.academic_years(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS secretaria.exam_candidates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL REFERENCES secretaria.exam_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES secretaria.students(id) ON DELETE CASCADE,
  group_id uuid REFERENCES secretaria.groups(id) ON DELETE SET NULL,
  status secretaria.exam_attend NOT NULL DEFAULT 'sin_confirmar',
  added_manually boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_examcand_session ON secretaria.exam_candidates(session_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='secretaria' AND event_object_table='exam_candidates' AND trigger_name='trg_audit_exam_candidates') THEN
    CREATE TRIGGER trg_audit_exam_candidates AFTER INSERT OR UPDATE OR DELETE ON secretaria.exam_candidates FOR EACH ROW EXECUTE FUNCTION secretaria.fn_audit();
  END IF;
END $$;
