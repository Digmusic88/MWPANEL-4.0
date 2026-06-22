-- scripts/danza-consolidate.sql  (one-off, idempotente por nombres; SOLO curso activo)
-- Fusiona los grupos "X 1 día"/"X 2 días" en un grupo único por base, re-apuntando
-- matrículas y franjas, y siembra el override de tiers de Negro A. No toca 2025-2026.
DO $$
DECLARE
  v_year uuid; v_neg_canon uuid; v_neg_dup uuid; v_resto_canon uuid; v_resto_dup uuid;
BEGIN
  SELECT id INTO v_year FROM secretaria.academic_years WHERE is_active LIMIT 1;

  -- NEGRO A: canónico = "Grupo Negro A 1 día"
  SELECT id INTO v_neg_canon FROM secretaria.groups WHERE academic_year_id=v_year AND name='Grupo Negro A 1 día';
  SELECT id INTO v_neg_dup   FROM secretaria.groups WHERE academic_year_id=v_year AND name='Grupo Negro A 2 días';
  IF v_neg_canon IS NOT NULL AND v_neg_dup IS NOT NULL THEN
    UPDATE secretaria.enrollments    SET group_id=v_neg_canon WHERE group_id=v_neg_dup;
    UPDATE secretaria.schedule_slots SET group_id=v_neg_canon WHERE group_id=v_neg_dup;
    DELETE FROM secretaria.groups WHERE id=v_neg_dup;
  END IF;
  IF v_neg_canon IS NOT NULL THEN
    UPDATE secretaria.groups SET name='Grupo Negro A' WHERE id=v_neg_canon;
    INSERT INTO secretaria.danza_fee_tiers(group_id, days, amount)
    SELECT v_neg_canon, v.days, v.amount FROM (VALUES (1,35.00),(2,55.00)) AS v(days,amount)
    WHERE NOT EXISTS (SELECT 1 FROM secretaria.danza_fee_tiers WHERE group_id=v_neg_canon AND days=v.days);
  END IF;

  -- MORADO / Resto: canónico = "Morado 1 día"
  SELECT id INTO v_resto_canon FROM secretaria.groups WHERE academic_year_id=v_year AND name='Morado 1 día';
  SELECT id INTO v_resto_dup   FROM secretaria.groups WHERE academic_year_id=v_year AND name='Morado 2 días';
  IF v_resto_canon IS NOT NULL AND v_resto_dup IS NOT NULL THEN
    UPDATE secretaria.enrollments    SET group_id=v_resto_canon WHERE group_id=v_resto_dup;
    UPDATE secretaria.schedule_slots SET group_id=v_resto_canon WHERE group_id=v_resto_dup;
    DELETE FROM secretaria.groups WHERE id=v_resto_dup;
  END IF;
  IF v_resto_canon IS NOT NULL THEN
    UPDATE secretaria.groups SET name='Morado' WHERE id=v_resto_canon;
  END IF;
END $$;
