-- =====================================================================
-- Secretaría — Migración 013: tarifas reales Escuela Alternativa Mundo World
-- Curso 2025-2026
-- Elimina tarifas de prueba; crea programas y tarifas oficiales.
-- =====================================================================

BEGIN;

SET search_path TO secretaria, public;

-- -----------------------------------------------------------------------
-- 1. Borrar tarifas de prueba
-- -----------------------------------------------------------------------
DELETE FROM secretaria.fee_schedules
WHERE label LIKE '%(prueba)%';

-- -----------------------------------------------------------------------
-- 2. ESCUELA ALTERNATIVA — programas por etapa
-- 11 mensualidades (agosto a junio, sin julio)
-- -----------------------------------------------------------------------
INSERT INTO secretaria.programs(
  service_id, name, level_order,
  bills_matricula, bills_material,
  month_billing
)
SELECT s.id, x.name, x.ord, true, true,
  '{"01":1,"02":1,"03":1,"04":1,"05":1,"06":1,"07":0,"08":1,"09":1,"10":1,"11":1,"12":1}'::jsonb
FROM secretaria.services s,
  (VALUES
    ('Ed. Infantil y Primaria',  1),
    ('Educación Secundaria',     2)
  ) AS x(name, ord)
WHERE s.code = 'ESCUELA'
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------
-- 3. DANZA — sustituir programas placeholder por tiers de precio reales
-- No hay matrículas ni grupos aún; es seguro borrar y recrear.
-- Septiembre = media cuota (factor 0.5)
-- -----------------------------------------------------------------------
DELETE FROM secretaria.fee_schedules
WHERE service_id = (SELECT id FROM secretaria.services WHERE code = 'DANZA');

DELETE FROM secretaria.programs
WHERE service_id = (SELECT id FROM secretaria.services WHERE code = 'DANZA');

INSERT INTO secretaria.programs(
  service_id, name, level_order,
  bills_matricula, bills_material,
  month_billing
)
SELECT s.id, x.name, x.ord, true, false,
  '{"01":1,"02":1,"03":1,"04":1,"05":1,"06":1,"07":0,"08":0,"09":0.5,"10":1,"11":1,"12":1}'::jsonb
FROM secretaria.services s,
  (VALUES
    ('Resto grupos – 2 días/semana',   1),
    ('Resto grupos – 1 día/semana',    2),
    ('Grupo Negro A – 2 días/semana',  3),
    ('Grupo Negro A – 1 día/semana',   4)
  ) AS x(name, ord)
WHERE s.code = 'DANZA';

-- -----------------------------------------------------------------------
-- 4. ESCUELA — tarifas
-- -----------------------------------------------------------------------

-- Matrícula (reserva de plaza)
INSERT INTO secretaria.fee_schedules(
  academic_year_id, service_id, program_id,
  concept, amount, label, siblings_discount_eur
)
SELECT ay.id, s.id, p.id,
  'matricula', x.amt, 'Matrícula (reserva de plaza)', 0
FROM secretaria.academic_years ay,
  secretaria.services s,
  secretaria.programs p,
  (VALUES
    ('Ed. Infantil y Primaria', 300.00::numeric),
    ('Educación Secundaria',    320.00::numeric)
  ) AS x(prog, amt)
WHERE ay.is_active = true
  AND s.code = 'ESCUELA'
  AND p.service_id = s.id
  AND p.name = x.prog;

-- Material (pago único en julio) — mismo importe para ambas etapas
INSERT INTO secretaria.fee_schedules(
  academic_year_id, service_id, program_id,
  concept, amount, label, siblings_discount_eur
)
SELECT ay.id, s.id, p.id,
  'material', 325.00, 'Material (pago único - julio)', 0
FROM secretaria.academic_years ay,
  secretaria.services s,
  secretaria.programs p
WHERE ay.is_active = true
  AND s.code = 'ESCUELA'
  AND p.service_id = s.id;

-- Mensualidad (11 meses ago–jun)
-- siblings_discount_eur = 60€ → descuento para 2.º hermano del mismo núcleo familiar
INSERT INTO secretaria.fee_schedules(
  academic_year_id, service_id, program_id,
  concept, amount, label, siblings_discount_eur
)
SELECT ay.id, s.id, p.id,
  'mensualidad', x.amt, 'Mensualidad (11 meses ago–jun)', 60.00
FROM secretaria.academic_years ay,
  secretaria.services s,
  secretaria.programs p,
  (VALUES
    ('Ed. Infantil y Primaria', 360.00::numeric),
    ('Educación Secundaria',    380.00::numeric)
  ) AS x(prog, amt)
WHERE ay.is_active = true
  AND s.code = 'ESCUELA'
  AND p.service_id = s.id
  AND p.name = x.prog;

-- -----------------------------------------------------------------------
-- 5. INGLÉS — tarifas
-- -----------------------------------------------------------------------

-- Matrícula / Material / Mock (pago único, nivel servicio)
INSERT INTO secretaria.fee_schedules(
  academic_year_id, service_id, program_id,
  concept, amount, label, siblings_discount_eur
)
SELECT ay.id, s.id, NULL,
  'matricula', 40.00, 'Matrícula / Material / Mock', 0
FROM secretaria.academic_years ay,
  secretaria.services s
WHERE ay.is_active = true
  AND s.code = 'INGLES';

-- Mensualidad por nivel (Starters/Movers/Flyers=68€; KEY-CAE=70€)
INSERT INTO secretaria.fee_schedules(
  academic_year_id, service_id, program_id,
  concept, amount, label, siblings_discount_eur
)
SELECT ay.id, s.id, p.id,
  'mensualidad',
  CASE WHEN p.name IN ('Starters', 'Movers', 'Flyers') THEN 68.00 ELSE 70.00 END,
  'Mensualidad (mes completo)',
  0
FROM secretaria.academic_years ay,
  secretaria.services s,
  secretaria.programs p
WHERE ay.is_active = true
  AND s.code = 'INGLES'
  AND p.service_id = s.id
  AND p.name IN ('Starters','Movers','Flyers','KEY (A2)','PET (B1)','FCE (B2)','CAE (C1)');

-- -----------------------------------------------------------------------
-- 6. APOYO — tarifas
-- -----------------------------------------------------------------------

-- Matrícula / Material (pago único, nivel servicio)
INSERT INTO secretaria.fee_schedules(
  academic_year_id, service_id, program_id,
  concept, amount, label, siblings_discount_eur
)
SELECT ay.id, s.id, NULL,
  'matricula', 40.00, 'Matrícula / Material', 0
FROM secretaria.academic_years ay,
  secretaria.services s
WHERE ay.is_active = true
  AND s.code = 'APOYO';

-- Mensualidad por etapa
INSERT INTO secretaria.fee_schedules(
  academic_year_id, service_id, program_id,
  concept, amount, label, siblings_discount_eur
)
SELECT ay.id, s.id, p.id,
  'mensualidad', x.amt, 'Mensualidad (mes completo)', 0
FROM secretaria.academic_years ay,
  secretaria.services s,
  secretaria.programs p,
  (VALUES
    ('Apoyo Primaria',     68.00::numeric),
    ('Apoyo ESO',          75.00::numeric),
    ('Apoyo Bachillerato', 95.00::numeric)
  ) AS x(prog, amt)
WHERE ay.is_active = true
  AND s.code = 'APOYO'
  AND p.service_id = s.id
  AND p.name = x.prog;

-- -----------------------------------------------------------------------
-- 7. DANZA — tarifas
-- -----------------------------------------------------------------------

-- Matrícula (nivel servicio)
INSERT INTO secretaria.fee_schedules(
  academic_year_id, service_id, program_id,
  concept, amount, label, siblings_discount_eur
)
SELECT ay.id, s.id, NULL,
  'matricula', 35.00, 'Matrícula', 0
FROM secretaria.academic_years ay,
  secretaria.services s
WHERE ay.is_active = true
  AND s.code = 'DANZA';

-- Alquiler maillot (nivel servicio)
INSERT INTO secretaria.fee_schedules(
  academic_year_id, service_id, program_id,
  concept, amount, label, siblings_discount_eur
)
SELECT ay.id, s.id, NULL,
  'maillot', 10.00, 'Alquiler maillot (anual)', 0
FROM secretaria.academic_years ay,
  secretaria.services s
WHERE ay.is_active = true
  AND s.code = 'DANZA';

-- Mensualidad por tier (septiembre=media cuota aplicada via month_billing=0.5 en el programa)
INSERT INTO secretaria.fee_schedules(
  academic_year_id, service_id, program_id,
  concept, amount, label, siblings_discount_eur
)
SELECT ay.id, s.id, p.id,
  'mensualidad', x.amt, 'Mensualidad (sept = media cuota)', 0
FROM secretaria.academic_years ay,
  secretaria.services s,
  secretaria.programs p,
  (VALUES
    ('Resto grupos – 2 días/semana',   50.00::numeric),
    ('Resto grupos – 1 día/semana',    30.00::numeric),
    ('Grupo Negro A – 2 días/semana',  55.00::numeric),
    ('Grupo Negro A – 1 día/semana',   35.00::numeric)
  ) AS x(prog, amt)
WHERE ay.is_active = true
  AND s.code = 'DANZA'
  AND p.service_id = s.id
  AND p.name = x.prog;

COMMIT;
