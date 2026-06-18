-- =====================================================================
-- Secretaría — Migración 013: franjas horarias de Apoyo persistentes
-- (para poder añadir y ELIMINAR franjas creadas por error o ya no usadas)
-- =====================================================================
SET search_path TO secretaria, public;

CREATE TABLE IF NOT EXISTS secretaria.apoyo_slots (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_time  varchar NOT NULL UNIQUE,   -- 'HH:MM'
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO secretaria.apoyo_slots(slot_time) VALUES
  ('16:00'),('16:30'),('17:00'),('17:30'),('18:00'),('18:30'),('19:00')
ON CONFLICT (slot_time) DO NOTHING;
