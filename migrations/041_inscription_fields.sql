-- =====================================================================
-- Secretaría — Migración 041: campos propios para datos de la inscripción
-- El importador PDF (y el alta manual) volcaban a texto libre (student.notes /
-- family.notes) datos que sí son estructurados: lugar de nacimiento, email y
-- teléfono del alumno, profesión de cada tutor, hermanos, y un perfil blando
-- de intereses. Se les da columna propia para no enterrarlos en "notas".
-- Aditiva e idempotente (no toca datos existentes).
-- =====================================================================
SET search_path TO secretaria, public;

-- Alumno: identidad/contacto + perfil blando
ALTER TABLE secretaria.students  ADD COLUMN IF NOT EXISTS birth_place varchar(255);  -- lugar de nacimiento
ALTER TABLE secretaria.students  ADD COLUMN IF NOT EXISTS email       varchar(255);  -- email del alumno
ALTER TABLE secretaria.students  ADD COLUMN IF NOT EXISTS phone       varchar(64);   -- teléfono del alumno
ALTER TABLE secretaria.students  ADD COLUMN IF NOT EXISTS interests   text;          -- asignatura favorita/menos, deporte, música-danza, otros

-- Tutor: profesión (una por tutor; antes iba en notas de familia)
ALTER TABLE secretaria.guardians ADD COLUMN IF NOT EXISTS profession  varchar(255);

-- Familia: hermanos/as (antes en notas de familia)
ALTER TABLE secretaria.families  ADD COLUMN IF NOT EXISTS siblings    text;
