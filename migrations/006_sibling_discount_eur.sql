-- =====================================================================
-- Secretaría — Migración 006: descuento por hermanos en EUROS (no %)
-- Renombra siblings_discount_pct → siblings_discount_eur y ajusta tipo.
-- Los valores previos eran de prueba (10%) → se ponen a 0 (eran euros distintos).
-- =====================================================================
SET search_path TO secretaria, public;
ALTER TABLE secretaria.fee_schedules RENAME COLUMN siblings_discount_pct TO siblings_discount_eur;
ALTER TABLE secretaria.fee_schedules ALTER COLUMN siblings_discount_eur TYPE numeric(8,2);
ALTER TABLE secretaria.fee_schedules ALTER COLUMN siblings_discount_eur SET DEFAULT 0;
UPDATE secretaria.fee_schedules SET siblings_discount_eur = 0;
