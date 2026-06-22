-- migrations/032_danza_fee_functions.sql
-- Tarifa de Danza por tramos de días + maillot, y fn_resolve_monthly_fee Danza-aware.

CREATE OR REPLACE FUNCTION secretaria.fn_resolve_danza_monthly(p_enrollment_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE AS $$
DECLARE v_days int; v_groups int; v_only_group uuid; v_amount numeric;
BEGIN
  SELECT count(*), count(DISTINCT group_id), (array_agg(DISTINCT group_id))[1]
    INTO v_days, v_groups, v_only_group
  FROM secretaria.danza_assignments WHERE enrollment_id=p_enrollment_id;
  IF v_days = 0 THEN RETURN NULL; END IF;
  -- override de grupo solo si TODOS los días son de un único grupo
  IF v_groups = 1 THEN
    SELECT amount INTO v_amount FROM secretaria.danza_fee_tiers
    WHERE group_id=v_only_group AND days=v_days;
    IF v_amount IS NOT NULL THEN RETURN v_amount; END IF;
  END IF;
  -- por defecto
  SELECT amount INTO v_amount FROM secretaria.danza_fee_tiers
  WHERE group_id IS NULL AND days=v_days;
  RETURN v_amount; -- NULL si no hay tramo para ese nº de días
END; $$;

CREATE OR REPLACE FUNCTION secretaria.fn_resolve_danza_maillot(p_enrollment_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE AS $$
DECLARE v_year uuid; v_amount numeric;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM secretaria.danza_assignments da JOIN secretaria.groups g ON g.id=da.group_id
    WHERE da.enrollment_id=p_enrollment_id AND g.bills_maillot=true
  ) THEN RETURN NULL; END IF;
  SELECT e.academic_year_id INTO v_year FROM secretaria.enrollments e WHERE e.id=p_enrollment_id;
  SELECT amount INTO v_amount FROM secretaria.fee_schedules fs
  JOIN secretaria.services s ON s.id=fs.service_id
  WHERE fs.academic_year_id=v_year AND fs.concept='maillot' AND fs.is_active AND s.code='DANZA'
  ORDER BY amount DESC LIMIT 1;
  RETURN v_amount;
END; $$;

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

  -- (resto: igual que antes) por grupo
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
