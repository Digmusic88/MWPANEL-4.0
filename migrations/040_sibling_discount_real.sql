-- =====================================================================
-- Secretaría — Migración 040: descuento por hermanos REAL (aplicable)
-- - sibling_discounts: una fila por familia/mes con el descuento aplicado
--   (abono). Las cuotas de cada hermano se siguen cobrando a tarifa completa.
-- - org_settings.sibling_discount_eur: importe configurable (€/mes por hermano
--   adicional). Fuente única; la columna fee_schedules.siblings_discount_eur
--   queda en desuso.
-- Aditiva e idempotente.
-- =====================================================================
SET search_path TO secretaria, public;

CREATE TABLE IF NOT EXISTS secretaria.sibling_discounts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id        uuid NOT NULL REFERENCES secretaria.families(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL,
  period           text NOT NULL,                    -- 'YYYY-MM'
  amount           numeric(8,2) NOT NULL,            -- importe aplicado (snapshot)
  status           text NOT NULL DEFAULT 'aplicado', -- 'aplicado' | 'anulado'
  method           text NULL,                        -- método de cobro
  applied_at       date NOT NULL DEFAULT CURRENT_DATE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_sibling_discounts_family_period UNIQUE (family_id, period)
);
CREATE INDEX IF NOT EXISTS idx_sibling_discounts_year ON secretaria.sibling_discounts(academic_year_id);

-- Importe configurable del descuento por hermanos (global del centro). Default 5€.
INSERT INTO secretaria.org_settings(key, value) VALUES ('sibling_discount_eur', '5')
ON CONFLICT (key) DO NOTHING;
