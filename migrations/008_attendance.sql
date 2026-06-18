-- =====================================================================
-- Secretaría — Migración 008: asistencia (por matrícula y día)
-- =====================================================================
SET search_path TO secretaria, public;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='attendance_status') THEN
    CREATE TYPE secretaria.attendance_status AS ENUM ('presente','ausente','justificada','retraso');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS secretaria.attendance (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id uuid NOT NULL REFERENCES secretaria.enrollments(id) ON DELETE CASCADE,
  date          date NOT NULL,
  status        secretaria.attendance_status NOT NULL DEFAULT 'presente',
  notes         text,
  recorded_by   uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON secretaria.attendance(date);
