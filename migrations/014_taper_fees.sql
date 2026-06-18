-- =====================================================================
-- Secretaría — Migración 014: tarifas Servicio Táper
-- Curso 2025-2026
-- 5 tiers por horas/semana, mensualidad mes completo (10 meses oct-jun + sep)
-- =====================================================================

BEGIN;

SET search_path TO secretaria, public;

-- -----------------------------------------------------------------------
-- 1. Programas por horas/semana
-- -----------------------------------------------------------------------
INSERT INTO secretaria.programs(
  service_id, name, level_order,
  bills_matricula, bills_material,
  month_billing
)
SELECT s.id, x.name, x.ord, false, false,
  '{"01":1,"02":1,"03":1,"04":1,"05":1,"06":1,"07":0,"08":0,"09":1,"10":1,"11":1,"12":1}'::jsonb
FROM secretaria.services s,
  (VALUES
    ('5 h/semana', 1),
    ('4 h/semana', 2),
    ('3 h/semana', 3),
    ('2 h/semana', 4),
    ('1 h/semana', 5)
  ) AS x(name, ord)
WHERE s.code = 'TAPER'
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------
-- 2. Mensualidad por tier
-- -----------------------------------------------------------------------
INSERT INTO secretaria.fee_schedules(
  academic_year_id, service_id, program_id,
  concept, amount, label, siblings_discount_eur
)
SELECT ay.id, s.id, p.id,
  'mensualidad', x.amt, 'Mensualidad táper', 0
FROM secretaria.academic_years ay,
  secretaria.services s,
  secretaria.programs p,
  (VALUES
    ('5 h/semana', 75.00::numeric),
    ('4 h/semana', 65.00::numeric),
    ('3 h/semana', 54.00::numeric),
    ('2 h/semana', 36.00::numeric),
    ('1 h/semana', 18.00::numeric)
  ) AS x(prog, amt)
WHERE ay.is_active = true
  AND s.code = 'TAPER'
  AND p.service_id = s.id
  AND p.name = x.prog;

COMMIT;
