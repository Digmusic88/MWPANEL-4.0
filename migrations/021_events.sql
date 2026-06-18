-- Secretaría — Migración 021: eventos / anuncios (calendario de docentes)
SET search_path TO secretaria, public;
CREATE TABLE IF NOT EXISTS secretaria.events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title varchar NOT NULL,
  description text,
  event_date date NOT NULL,
  event_time varchar,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_date ON secretaria.events(event_date);
