-- 035_mock_sync.sql — Sincronización Secretaría → Mocks
-- Idempotente.

-- Nivel Cambridge estructurado en el programa (NULL = no sincroniza)
ALTER TABLE secretaria.programs ADD COLUMN IF NOT EXISTS mock_exam_type varchar;
ALTER TABLE secretaria.programs DROP CONSTRAINT IF EXISTS chk_mock_exam_type;
ALTER TABLE secretaria.programs ADD CONSTRAINT chk_mock_exam_type
  CHECK (mock_exam_type IS NULL OR mock_exam_type IN ('A2_KEY','B1_PET','B2_FIRST','C1_CAE','C2_CPE'));

-- Autorrelleno inicial por nombre (orden importa: específicos primero)
UPDATE secretaria.programs SET mock_exam_type = CASE
  WHEN name ILIKE '%CAE%' OR name ILIKE '%advanced%'              THEN 'C1_CAE'
  WHEN name ILIKE '%FCE%' OR name ILIKE '%first%'                 THEN 'B2_FIRST'
  WHEN name ILIKE '%PET%' OR name ILIKE '%prelim%'                THEN 'B1_PET'
  WHEN name ILIKE '%proficien%' OR name ILIKE '%CPE%'             THEN 'C2_CPE'
  WHEN name ILIKE '%KEY%' OR name ILIKE 'KET%' OR name ILIKE '% KET%' OR name ILIKE '%A2%' THEN 'A2_KEY'
  ELSE NULL END
WHERE mock_exam_type IS NULL;

-- Link del grupo de Secretaría con el grupo equivalente en Mocks
ALTER TABLE secretaria.groups ADD COLUMN IF NOT EXISTS mock_group_id integer;

-- Auditoría de cada reconciliación
CREATE TABLE IF NOT EXISTS secretaria.mock_sync_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at      timestamptz NOT NULL DEFAULT now(),
  trigger     varchar NOT NULL,                 -- 'change-feed' | 'cron' | 'manual'
  ok          boolean NOT NULL DEFAULT true,
  created     int NOT NULL DEFAULT 0,
  renamed     int NOT NULL DEFAULT 0,
  enrolled    int NOT NULL DEFAULT 0,
  unenrolled  int NOT NULL DEFAULT 0,
  adopted     int NOT NULL DEFAULT 0,
  incidencias jsonb NOT NULL DEFAULT '[]'::jsonb,
  error       text,
  duration_ms int
);
CREATE INDEX IF NOT EXISTS idx_mock_sync_log_ran_at ON secretaria.mock_sync_log (ran_at DESC);
