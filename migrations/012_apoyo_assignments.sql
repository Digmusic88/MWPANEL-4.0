-- =====================================================================
-- Secretaría — Migración 012: asignación de alumnos de APOYO a franjas
-- (día × hora × sala). Un alumno puede tener varias franjas.
-- =====================================================================
SET search_path TO secretaria, public;

CREATE TABLE IF NOT EXISTS secretaria.apoyo_assignments (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id uuid NOT NULL REFERENCES secretaria.enrollments(id) ON DELETE CASCADE,
  weekday       smallint NOT NULL,      -- 1=Lunes ... 7=Domingo
  slot_time     varchar NOT NULL,       -- 'HH:MM'
  room          varchar,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_apoyo_enr ON secretaria.apoyo_assignments(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_apoyo_slot ON secretaria.apoyo_assignments(weekday, slot_time);
