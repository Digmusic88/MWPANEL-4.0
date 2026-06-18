-- Secretaría — Migración 016: color personalizable por grupo (horarios + columnas pastel)
SET search_path TO secretaria, public;
ALTER TABLE secretaria.groups ADD COLUMN IF NOT EXISTS color varchar;
