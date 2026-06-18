-- =====================================================================
-- Secretaría — Migración 002: tarifas totalmente flexibles
-- - fee_schedules puede apuntar a un GRUPO concreto (precio por grupo),
--   a un programa, o a un servicio. La más específica gana.
-- - 'label' permite tarifas especiales (p. ej. "Inglés 1 día/semana").
-- - enrollments.custom_fee permite override manual por alumno (caso concreto).
-- Aditivo y reversible.
-- =====================================================================
SET search_path TO secretaria, public;

-- Tarifas más específicas: por grupo + etiqueta + activable
ALTER TABLE secretaria.fee_schedules ADD COLUMN IF NOT EXISTS group_id uuid NULL REFERENCES secretaria.groups(id) ON DELETE CASCADE;
ALTER TABLE secretaria.fee_schedules ADD COLUMN IF NOT EXISTS label varchar NULL;
ALTER TABLE secretaria.fee_schedules ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_fees_group ON secretaria.fee_schedules(group_id);

-- Override manual por matrícula (tarifa especial / caso concreto)
ALTER TABLE secretaria.enrollments ADD COLUMN IF NOT EXISTS custom_fee numeric(8,2) NULL;
ALTER TABLE secretaria.enrollments ADD COLUMN IF NOT EXISTS custom_fee_reason varchar NULL;

-- Función de resolución de tarifa mensual para una matrícula.
-- Prioridad (de más específica a más general):
--   1) enrollment.custom_fee (override manual)
--   2) fee_schedule del GRUPO de la matrícula (mensualidad, activa)
--   3) fee_schedule del PROGRAMA del grupo (mensualidad, activa)
--   4) fee_schedule del SERVICIO (mensualidad, activa)
CREATE OR REPLACE FUNCTION secretaria.fn_resolve_monthly_fee(p_enrollment_id uuid)
RETURNS numeric AS $$
DECLARE
  v_amount numeric;
  v_year uuid; v_service uuid; v_group uuid; v_program uuid; v_custom numeric;
BEGIN
  SELECT e.academic_year_id, e.service_id, e.group_id, e.custom_fee,
         g.program_id
    INTO v_year, v_service, v_group, v_custom, v_program
  FROM secretaria.enrollments e
  LEFT JOIN secretaria.groups g ON g.id = e.group_id
  WHERE e.id = p_enrollment_id;

  IF v_custom IS NOT NULL THEN RETURN v_custom; END IF;

  -- por grupo
  IF v_group IS NOT NULL THEN
    SELECT amount INTO v_amount FROM secretaria.fee_schedules
    WHERE academic_year_id=v_year AND concept='mensualidad' AND is_active AND group_id=v_group
    ORDER BY amount DESC LIMIT 1;
    IF v_amount IS NOT NULL THEN RETURN v_amount; END IF;
  END IF;

  -- por programa
  IF v_program IS NOT NULL THEN
    SELECT amount INTO v_amount FROM secretaria.fee_schedules
    WHERE academic_year_id=v_year AND concept='mensualidad' AND is_active
      AND program_id=v_program AND group_id IS NULL
    ORDER BY amount DESC LIMIT 1;
    IF v_amount IS NOT NULL THEN RETURN v_amount; END IF;
  END IF;

  -- por servicio
  SELECT amount INTO v_amount FROM secretaria.fee_schedules
  WHERE academic_year_id=v_year AND concept='mensualidad' AND is_active
    AND service_id=v_service AND program_id IS NULL AND group_id IS NULL
  ORDER BY amount DESC LIMIT 1;

  RETURN v_amount; -- puede ser NULL si no hay tarifa configurada
END; $$ LANGUAGE plpgsql STABLE;

-- =====================================================================
-- SEED de tarifas de PRUEBA: 65€/mes por servicio (mensualidad) en el año activo
-- + ejemplo de tarifa especial "1 día/semana" más barata.
-- (Editables luego desde el panel de Tarifas de Secretaría.)
-- =====================================================================
INSERT INTO secretaria.fee_schedules(academic_year_id, service_id, program_id, group_id, concept, amount, label, siblings_discount_pct)
SELECT ay.id, s.id, NULL, NULL, 'mensualidad', 65.00, 'Tarifa general (prueba)', 10.00
FROM secretaria.academic_years ay, secretaria.services s
WHERE ay.is_active = true AND s.code IN ('INGLES','APOYO','DANZA')
ON CONFLICT DO NOTHING;

-- Tarifa especial de ejemplo: Inglés 1 día/semana = 40€
INSERT INTO secretaria.fee_schedules(academic_year_id, service_id, program_id, group_id, concept, amount, label, siblings_discount_pct)
SELECT ay.id, s.id, NULL, NULL, 'mensualidad', 40.00, 'Inglés 1 día/semana (prueba)', 10.00
FROM secretaria.academic_years ay, secretaria.services s
WHERE ay.is_active = true AND s.code = 'INGLES'
ON CONFLICT DO NOTHING;

-- Matrícula de Inglés (prueba) = 65€ único
INSERT INTO secretaria.fee_schedules(academic_year_id, service_id, program_id, group_id, concept, amount, label, siblings_discount_pct)
SELECT ay.id, s.id, NULL, NULL, 'matricula', 65.00, 'Matrícula (prueba)', 0
FROM secretaria.academic_years ay, secretaria.services s
WHERE ay.is_active = true AND s.code IN ('INGLES','APOYO','DANZA')
ON CONFLICT DO NOTHING;
