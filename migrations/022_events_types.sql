-- Secretaría — Migración 022: tipos de evento + vínculo a grupo (calendario docente)
SET search_path TO secretaria, public;

ALTER TABLE secretaria.events ADD COLUMN IF NOT EXISTS event_type varchar NOT NULL DEFAULT 'otro';
ALTER TABLE secretaria.events ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES secretaria.groups(id) ON DELETE SET NULL;
ALTER TABLE secretaria.events ADD COLUMN IF NOT EXISTS end_time varchar;
ALTER TABLE secretaria.events ADD COLUMN IF NOT EXISTS location varchar;

-- event_type esperado: clase | convocatoria | examen_oficial | reunion | otro
CREATE INDEX IF NOT EXISTS idx_events_type ON secretaria.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_group ON secretaria.events(group_id);

-- Auditoría coherente con el resto de tablas
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='secretaria' AND event_object_table='events' AND trigger_name='trg_audit_events') THEN
    CREATE TRIGGER trg_audit_events AFTER INSERT OR UPDATE OR DELETE ON secretaria.events FOR EACH ROW EXECUTE FUNCTION secretaria.fn_audit();
  END IF;
END $$;
