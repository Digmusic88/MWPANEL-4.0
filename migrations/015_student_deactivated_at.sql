-- Fecha de baja del alumno (baja lógica). Se rellena al dar de baja un alumno
-- (DELETE /students/:id cuando tiene historial) y se limpia al reactivarlo.
ALTER TABLE secretaria.students ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;
