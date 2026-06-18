-- =====================================================================
-- Secretaría — Migración 004: facturación mensual totalmente flexible
-- Cada programa define, mes a mes (sep→ago), un FACTOR de cobro:
--   0   = no se cobra ese mes
--   0.5 = medio mes
--   1   = mes completo (cualquier valor 0..1 es válido)
-- Sustituye a los flags fijos bills_july/bills_august (se migran al mapa).
-- Aditivo y reversible.
-- =====================================================================
SET search_path TO secretaria, public;

ALTER TABLE secretaria.programs ADD COLUMN IF NOT EXISTS month_billing jsonb;

-- Backfill: sep→jun completos; jul/ago según los flags actuales (preserva comportamiento)
UPDATE secretaria.programs SET month_billing = jsonb_build_object(
    '09',1,'10',1,'11',1,'12',1,'01',1,'02',1,'03',1,'04',1,'05',1,'06',1,
    '07', CASE WHEN bills_july   THEN 1 ELSE 0 END,
    '08', CASE WHEN bills_august THEN 1 ELSE 0 END)
WHERE month_billing IS NULL;

-- Factor de cobro de un mes (MM = '09'..'08') para un programa.
-- Si el programa no tiene mapa o no define ese mes: sep→jun = 1, jul/ago = 0.
CREATE OR REPLACE FUNCTION secretaria.fn_resolve_month_factor(p_program_id uuid, p_mm text)
RETURNS numeric AS $$
DECLARE mb jsonb;
BEGIN
  IF p_program_id IS NOT NULL THEN
    SELECT month_billing INTO mb FROM secretaria.programs WHERE id = p_program_id;
    IF mb IS NOT NULL AND mb ? p_mm THEN RETURN (mb->>p_mm)::numeric; END IF;
  END IF;
  RETURN CASE WHEN p_mm IN ('07','08') THEN 0 ELSE 1 END;
END; $$ LANGUAGE plpgsql STABLE;

-- Importe de la mensualidad de un mes para una matrícula = tarifa base × factor del mes.
CREATE OR REPLACE FUNCTION secretaria.fn_resolve_month_amount(p_enrollment_id uuid, p_mm text)
RETURNS numeric AS $$
DECLARE v_base numeric; v_program uuid;
BEGIN
  SELECT g.program_id INTO v_program
  FROM secretaria.enrollments e LEFT JOIN secretaria.groups g ON g.id = e.group_id
  WHERE e.id = p_enrollment_id;
  v_base := secretaria.fn_resolve_monthly_fee(p_enrollment_id);
  IF v_base IS NULL THEN RETURN NULL; END IF;
  RETURN ROUND(v_base * secretaria.fn_resolve_month_factor(v_program, p_mm), 2);
END; $$ LANGUAGE plpgsql STABLE;
