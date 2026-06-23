-- migrations/036_apoyo_fees.sql
-- Tarifa de Apoyo por etapa + nº de horas (tramos configurables). Solo afecta a APOYO.
SET search_path TO secretaria, public;

-- 1) Enum de etapa (idempotente)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                 WHERE t.typname='apoyo_level' AND n.nspname='secretaria') THEN
    CREATE TYPE secretaria.apoyo_level AS ENUM ('primaria','secundaria','bachillerato');
  END IF;
END $$;

-- 2) Etapa en la matrícula (solo se usa en Apoyo) y horas por franja
ALTER TABLE secretaria.enrollments       ADD COLUMN IF NOT EXISTS apoyo_level secretaria.apoyo_level NULL;
ALTER TABLE secretaria.apoyo_assignments ADD COLUMN IF NOT EXISTS hours numeric(4,2) NOT NULL DEFAULT 1;

-- 3) Tabla de tramos configurable
CREATE TABLE IF NOT EXISTS secretaria.apoyo_fee_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES secretaria.academic_years(id) ON DELETE CASCADE,
  etapa   secretaria.apoyo_level NOT NULL,
  concept secretaria.fee_concept NOT NULL,
  hours   numeric(4,2) NULL,            -- NULL = importe fijo por etapa (matricula/material)
  amount  numeric(8,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
-- Una sola fila por (año, etapa, concepto, horas) cuando horas NO es NULL
CREATE UNIQUE INDEX IF NOT EXISTS apoyo_fee_tiers_hours_uniq
  ON secretaria.apoyo_fee_tiers (academic_year_id, etapa, concept, hours)
  WHERE hours IS NOT NULL;
-- Una sola fila "fija" por (año, etapa, concepto) cuando horas IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS apoyo_fee_tiers_flat_uniq
  ON secretaria.apoyo_fee_tiers (academic_year_id, etapa, concept)
  WHERE hours IS NULL;

-- 4) Resolución de importe Apoyo por concepto
CREATE OR REPLACE FUNCTION secretaria.fn_resolve_apoyo_fee(p_enrollment_id uuid, p_concept text)
RETURNS numeric LANGUAGE plpgsql STABLE AS $$
DECLARE v_year uuid; v_level secretaria.apoyo_level; v_hours numeric; v_amount numeric;
BEGIN
  SELECT e.academic_year_id, e.apoyo_level INTO v_year, v_level
  FROM secretaria.enrollments e WHERE e.id = p_enrollment_id;
  IF v_level IS NULL THEN RETURN NULL; END IF;  -- sin etapa → "revisar"

  IF p_concept = 'mensualidad' THEN
    SELECT COALESCE(SUM(hours),0) INTO v_hours
    FROM secretaria.apoyo_assignments WHERE enrollment_id = p_enrollment_id;
    SELECT amount INTO v_amount FROM secretaria.apoyo_fee_tiers
    WHERE academic_year_id=v_year AND etapa=v_level AND concept='mensualidad'
      AND is_active AND hours IS NOT NULL AND hours <= v_hours
    ORDER BY hours DESC LIMIT 1;
    RETURN v_amount;   -- NULL si no hay tramo aplicable
  ELSE
    SELECT amount INTO v_amount FROM secretaria.apoyo_fee_tiers
    WHERE academic_year_id=v_year AND etapa=v_level
      AND concept=p_concept::secretaria.fee_concept AND is_active AND hours IS NULL
    LIMIT 1;
    RETURN v_amount;
  END IF;
END; $$;

-- 5) Rama APOYO en la mensualidad (custom_fee y Danza intactos)
CREATE OR REPLACE FUNCTION secretaria.fn_resolve_monthly_fee(p_enrollment_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_amount numeric;
  v_year uuid; v_service uuid; v_group uuid; v_program uuid; v_custom numeric; v_service_code varchar;
BEGIN
  SELECT e.academic_year_id, e.service_id, e.group_id, e.custom_fee, g.program_id, s.code
    INTO v_year, v_service, v_group, v_custom, v_program, v_service_code
  FROM secretaria.enrollments e
  LEFT JOIN secretaria.groups g ON g.id = e.group_id
  JOIN secretaria.services s ON s.id = e.service_id
  WHERE e.id = p_enrollment_id;

  IF v_custom IS NOT NULL THEN RETURN v_custom; END IF;
  IF v_service_code = 'DANZA' THEN RETURN secretaria.fn_resolve_danza_monthly(p_enrollment_id); END IF;
  IF v_service_code = 'APOYO' THEN RETURN secretaria.fn_resolve_apoyo_fee(p_enrollment_id,'mensualidad'); END IF;

  IF v_group IS NOT NULL THEN
    SELECT amount INTO v_amount FROM secretaria.fee_schedules
    WHERE academic_year_id=v_year AND concept='mensualidad' AND is_active AND group_id=v_group
    ORDER BY amount DESC LIMIT 1;
    IF v_amount IS NOT NULL THEN RETURN v_amount; END IF;
  END IF;
  IF v_program IS NOT NULL THEN
    SELECT amount INTO v_amount FROM secretaria.fee_schedules
    WHERE academic_year_id=v_year AND concept='mensualidad' AND is_active AND program_id=v_program AND group_id IS NULL
    ORDER BY amount DESC LIMIT 1;
    IF v_amount IS NOT NULL THEN RETURN v_amount; END IF;
  END IF;
  SELECT amount INTO v_amount FROM secretaria.fee_schedules
  WHERE academic_year_id=v_year AND concept='mensualidad' AND is_active AND service_id=v_service AND program_id IS NULL AND group_id IS NULL
  ORDER BY amount DESC LIMIT 1;
  RETURN v_amount;
END; $$;

-- 6) Rama APOYO en matrícula/material
CREATE OR REPLACE FUNCTION secretaria.fn_resolve_concept_fee(p_enrollment_id uuid, p_concept text)
RETURNS numeric AS $$
DECLARE v_amount numeric; v_year uuid; v_service uuid; v_group uuid; v_program uuid; v_service_code varchar;
BEGIN
  SELECT e.academic_year_id, e.service_id, e.group_id, g.program_id, s.code
    INTO v_year, v_service, v_group, v_program, v_service_code
  FROM secretaria.enrollments e
  LEFT JOIN secretaria.groups g ON g.id=e.group_id
  JOIN secretaria.services s ON s.id=e.service_id
  WHERE e.id=p_enrollment_id;

  IF v_service_code = 'APOYO' THEN
    RETURN secretaria.fn_resolve_apoyo_fee(p_enrollment_id, p_concept);
  END IF;

  IF v_group IS NOT NULL THEN
    SELECT amount INTO v_amount FROM secretaria.fee_schedules
    WHERE academic_year_id=v_year AND concept=p_concept::secretaria.fee_concept AND is_active AND group_id=v_group
    ORDER BY amount DESC LIMIT 1;
    IF v_amount IS NOT NULL THEN RETURN v_amount; END IF;
  END IF;
  IF v_program IS NOT NULL THEN
    SELECT amount INTO v_amount FROM secretaria.fee_schedules
    WHERE academic_year_id=v_year AND concept=p_concept::secretaria.fee_concept AND is_active AND program_id=v_program AND group_id IS NULL
    ORDER BY amount DESC LIMIT 1;
    IF v_amount IS NOT NULL THEN RETURN v_amount; END IF;
  END IF;
  SELECT amount INTO v_amount FROM secretaria.fee_schedules
  WHERE academic_year_id=v_year AND concept=p_concept::secretaria.fee_concept AND is_active AND service_id=v_service AND program_id IS NULL AND group_id IS NULL
  ORDER BY amount DESC LIMIT 1;
  RETURN v_amount;
END; $$ LANGUAGE plpgsql STABLE;

-- 7) Siembra: precios actuales en el tramo de 2 horas, año activo
INSERT INTO secretaria.apoyo_fee_tiers (academic_year_id, etapa, concept, hours, amount)
SELECT ay.id, v.etapa::secretaria.apoyo_level, 'mensualidad'::secretaria.fee_concept, 2, v.amount
FROM secretaria.academic_years ay
CROSS JOIN (VALUES ('primaria',68.00),('secundaria',75.00),('bachillerato',95.00)) AS v(etapa, amount)
WHERE ay.is_active
ON CONFLICT DO NOTHING;
