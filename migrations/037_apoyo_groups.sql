-- 037_apoyo_groups.sql — Apoyo con grupos flexibles (estilo Danza). Idempotente.
ALTER TABLE secretaria.apoyo_assignments
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES secretaria.groups(id) ON DELETE CASCADE;

-- Unicidad para el upsert ON CONFLICT del assign (enrollment + grupo + día + hora)
CREATE UNIQUE INDEX IF NOT EXISTS apoyo_assign_uniq
  ON secretaria.apoyo_assignments (enrollment_id, group_id, weekday, slot_time);
CREATE INDEX IF NOT EXISTS idx_apoyo_assign_group
  ON secretaria.apoyo_assignments (group_id);
-- Nota: hay 0 filas en apoyo_assignments -> nada que migrar.
