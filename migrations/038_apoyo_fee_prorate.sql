-- 038_apoyo_fee_prorate.sql — Apoyo: si las horas no coinciden con un tramo, prorratear.
-- Antes: se cogía el tramo más alto que no superara las horas (techo plano: 3,5h pagaba lo mismo que 3h).
-- Ahora: se escala ese tramo aplicable a las horas reales -> amount * horas / horas_tramo.
--   Ej. secundaria 3,5h con tramo 3h=105€ -> 105 * 3,5/3 = 122,50€.
--   Coincidencia exacta con un tramo -> precio del tramo (sin cambios).
--   Por debajo del tramo más pequeño -> se prorratea usando ese tramo como referencia.
-- Idempotente (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION secretaria.fn_resolve_apoyo_fee(p_enrollment_id uuid, p_concept text)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE v_year uuid; v_level secretaria.apoyo_level; v_hours numeric;
        v_tier_hours numeric; v_tier_amount numeric;
BEGIN
  SELECT e.academic_year_id, e.apoyo_level INTO v_year, v_level
  FROM secretaria.enrollments e WHERE e.id = p_enrollment_id;
  IF v_level IS NULL THEN RETURN NULL; END IF;  -- sin etapa → "revisar"

  IF p_concept = 'mensualidad' THEN
    SELECT COALESCE(SUM(hours),0) INTO v_hours
    FROM secretaria.apoyo_assignments WHERE enrollment_id = p_enrollment_id;
    IF v_hours <= 0 THEN RETURN NULL; END IF;  -- sin horas → "revisar"

    -- Tramo aplicable: el de mayor nº de horas que no supere las del alumno
    SELECT hours, amount INTO v_tier_hours, v_tier_amount
    FROM secretaria.apoyo_fee_tiers
    WHERE academic_year_id=v_year AND etapa=v_level AND concept='mensualidad'
      AND is_active AND hours IS NOT NULL AND hours <= v_hours
    ORDER BY hours DESC LIMIT 1;

    -- Si está por debajo del tramo más pequeño, usar ese como referencia para la proporción
    IF v_tier_hours IS NULL THEN
      SELECT hours, amount INTO v_tier_hours, v_tier_amount
      FROM secretaria.apoyo_fee_tiers
      WHERE academic_year_id=v_year AND etapa=v_level AND concept='mensualidad'
        AND is_active AND hours IS NOT NULL
      ORDER BY hours ASC LIMIT 1;
    END IF;

    IF v_tier_hours IS NULL OR v_tier_hours = 0 THEN RETURN NULL; END IF;  -- no hay tramos → "revisar"

    -- Coincidencia exacta → precio del tramo; si no, proporción escalando el tramo aplicable
    IF v_hours = v_tier_hours THEN
      RETURN v_tier_amount;
    END IF;
    RETURN ROUND(v_tier_amount * v_hours / v_tier_hours, 2);
  ELSE
    SELECT amount INTO v_tier_amount FROM secretaria.apoyo_fee_tiers
    WHERE academic_year_id=v_year AND etapa=v_level
      AND concept=p_concept::secretaria.fee_concept AND is_active AND hours IS NULL
    LIMIT 1;
    RETURN v_tier_amount;
  END IF;
END; $function$;
