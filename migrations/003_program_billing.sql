-- =====================================================================
-- Secretaría — Migración 003: configuración de facturación por programa
-- Cada programa decide qué conceptos cobra: matrícula, material, julio, agosto.
-- La mensualidad de septiembre→junio se cobra siempre.
-- =====================================================================
SET search_path TO secretaria, public;

ALTER TABLE secretaria.programs ADD COLUMN IF NOT EXISTS bills_matricula boolean NOT NULL DEFAULT true;
ALTER TABLE secretaria.programs ADD COLUMN IF NOT EXISTS bills_material  boolean NOT NULL DEFAULT false;
ALTER TABLE secretaria.programs ADD COLUMN IF NOT EXISTS bills_july      boolean NOT NULL DEFAULT false;
ALTER TABLE secretaria.programs ADD COLUMN IF NOT EXISTS bills_august    boolean NOT NULL DEFAULT false;

-- Resuelve el importe de un concepto NO mensual (matrícula/material) para una matrícula,
-- con la misma prioridad: grupo → programa → servicio. Devuelve NULL si no hay tarifa.
CREATE OR REPLACE FUNCTION secretaria.fn_resolve_concept_fee(p_enrollment_id uuid, p_concept text)
RETURNS numeric AS $$
DECLARE v_amount numeric; v_year uuid; v_service uuid; v_group uuid; v_program uuid;
BEGIN
  SELECT e.academic_year_id, e.service_id, e.group_id, g.program_id
    INTO v_year, v_service, v_group, v_program
  FROM secretaria.enrollments e LEFT JOIN secretaria.groups g ON g.id=e.group_id
  WHERE e.id=p_enrollment_id;

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
