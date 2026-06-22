-- migrations/034_bank_account_student_override.sql
-- Añade override de cuenta por alumno: bank_accounts.student_id
--   NULL      -> cuenta de la familia (la usa la remesa SEPA)
--   con valor -> override informativo de ese alumno (la remesa lo ignora)
BEGIN;

ALTER TABLE secretaria.bank_accounts
  ADD COLUMN IF NOT EXISTS student_id uuid NULL
  REFERENCES secretaria.students(id) ON DELETE CASCADE;

-- Saneo previo: si alguna familia ya tuviera >1 cuenta activa (student_id NULL),
-- conservar la más reciente y desactivar las demás, para poder crear el índice único.
UPDATE secretaria.bank_accounts ba
SET is_active = false
WHERE ba.student_id IS NULL
  AND ba.is_active
  AND ba.id <> (
    SELECT b2.id FROM secretaria.bank_accounts b2
    WHERE b2.family_id = ba.family_id AND b2.student_id IS NULL AND b2.is_active
    ORDER BY b2.created_at DESC, b2.id DESC
    LIMIT 1
  );

-- Como mucho una cuenta de familia activa por familia.
CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_family_active
  ON secretaria.bank_accounts(family_id)
  WHERE student_id IS NULL AND is_active;

-- Como mucho una override activa por alumno.
CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_student_active
  ON secretaria.bank_accounts(student_id)
  WHERE student_id IS NOT NULL AND is_active;

COMMIT;
