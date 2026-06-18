-- Secretaría — Migración 009: enlace alumno ↔ usuario de Cambridge Mocks
SET search_path TO secretaria, public;
ALTER TABLE secretaria.students ADD COLUMN IF NOT EXISTS mock_user_id integer;
CREATE INDEX IF NOT EXISTS idx_students_mock ON secretaria.students(mock_user_id);
