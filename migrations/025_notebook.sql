-- Secretaría — Migración 025: cuaderno docente (apartados por grupo + planificación por día)
SET search_path TO secretaria, public;

-- Apartados (partes de la clase/examen) por grupo. Se autocrean desde plantilla del nivel y son editables.
CREATE TABLE IF NOT EXISTS secretaria.notebook_sections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL REFERENCES secretaria.groups(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nb_sections_group ON secretaria.notebook_sections(group_id);

-- Planificación: contenido por apartado y día
CREATE TABLE IF NOT EXISTS secretaria.notebook_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL REFERENCES secretaria.groups(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES secretaria.notebook_sections(id) ON DELETE CASCADE,
  date date NOT NULL,
  content text,
  is_done boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section_id, date)
);
CREATE INDEX IF NOT EXISTS idx_nb_entries_group_date ON secretaria.notebook_entries(group_id, date);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='secretaria' AND event_object_table='notebook_sections' AND trigger_name='trg_audit_notebook_sections') THEN
    CREATE TRIGGER trg_audit_notebook_sections AFTER INSERT OR UPDATE OR DELETE ON secretaria.notebook_sections FOR EACH ROW EXECUTE FUNCTION secretaria.fn_audit();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='secretaria' AND event_object_table='notebook_entries' AND trigger_name='trg_audit_notebook_entries') THEN
    CREATE TRIGGER trg_audit_notebook_entries AFTER INSERT OR UPDATE OR DELETE ON secretaria.notebook_entries FOR EACH ROW EXECUTE FUNCTION secretaria.fn_audit();
  END IF;
END $$;
