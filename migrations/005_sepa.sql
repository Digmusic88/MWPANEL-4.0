-- =====================================================================
-- Secretaría — Migración 005: SEPA (domiciliación / pain.008)
-- - org_settings: configuración del ACREEDOR (nombre, IBAN, BIC, identificador SEPA).
-- - charges.sepa_batch_id: enlaza cada recibo a la remesa en que se incluye
--   (evita doble inclusión y permite marcar cobrados al confirmar).
-- Aditivo y reversible.
-- =====================================================================
SET search_path TO secretaria, public;

CREATE TABLE IF NOT EXISTS secretaria.org_settings (
  key   varchar PRIMARY KEY,
  value text
);

-- Claves del acreedor para el fichero pain.008 (se editan desde Configuración).
INSERT INTO secretaria.org_settings(key, value) VALUES
  ('creditor_name', ''),
  ('creditor_iban', ''),
  ('creditor_bic',  ''),
  ('creditor_id',   '')   -- Identificador del acreedor SEPA (ES##ZZZ...)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE secretaria.charges
  ADD COLUMN IF NOT EXISTS sepa_batch_id uuid NULL REFERENCES secretaria.sepa_batches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_charges_sepa_batch ON secretaria.charges(sepa_batch_id);
