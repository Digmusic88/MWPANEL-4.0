-- Secretaría — Migración 015: orden personalizable de los grupos (columnas del tablero)
SET search_path TO secretaria, public;
ALTER TABLE secretaria.groups ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
