-- migrations/031_danza_model.sql
CREATE TABLE IF NOT EXISTS secretaria.danza_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id uuid NOT NULL REFERENCES secretaria.enrollments(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES secretaria.groups(id) ON DELETE CASCADE,
  weekday int NOT NULL,
  start_time time NOT NULL,
  room varchar,
  UNIQUE (enrollment_id, group_id, weekday, start_time)
);
CREATE INDEX IF NOT EXISTS idx_danza_assign_enr ON secretaria.danza_assignments(enrollment_id);

CREATE TABLE IF NOT EXISTS secretaria.danza_fee_tiers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid REFERENCES secretaria.groups(id) ON DELETE CASCADE,  -- NULL = por defecto
  days int NOT NULL,
  amount numeric(8,2) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS danza_tier_default ON secretaria.danza_fee_tiers(days) WHERE group_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS danza_tier_group   ON secretaria.danza_fee_tiers(group_id, days) WHERE group_id IS NOT NULL;

ALTER TABLE secretaria.groups ADD COLUMN IF NOT EXISTS bills_maillot boolean NOT NULL DEFAULT false;

-- Tiers por defecto de Danza (1 día=30, 2 días=50). Overrides por grupo se siembran tras consolidar (Task 2).
INSERT INTO secretaria.danza_fee_tiers(group_id, days, amount)
SELECT NULL, v.days, v.amount FROM (VALUES (1, 30.00), (2, 50.00)) AS v(days, amount)
WHERE NOT EXISTS (SELECT 1 FROM secretaria.danza_fee_tiers WHERE group_id IS NULL AND days=v.days);
