-- =====================================================================
-- Secretaría — Migración 014: aulas (columnas del horario por aula)
-- =====================================================================
SET search_path TO secretaria, public;

CREATE TABLE IF NOT EXISTS secretaria.rooms (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       varchar NOT NULL UNIQUE,
  sort       int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO secretaria.rooms(name, sort) VALUES
  ('Aula 1',1),('Aula 2',2),('Aula 3',3),('Aula 4',4),('Sala 2',5),('Sala 3',6),('Sala 4',7)
ON CONFLICT (name) DO NOTHING;
