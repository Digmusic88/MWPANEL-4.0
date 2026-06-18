-- Secretaría — Migración 023: reuniones de profesores (hojas de coordinación, estilo MW Panel)
SET search_path TO secretaria, public;

CREATE TABLE IF NOT EXISTS secretaria.meeting_sheets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title varchar NOT NULL,
  meeting_date date NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS secretaria.meeting_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sheet_id uuid NOT NULL REFERENCES secretaria.meeting_sheets(id) ON DELETE CASCADE,
  item_title varchar NOT NULL,
  item_description text,
  due_date date,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  priority varchar NOT NULL DEFAULT 'medium',   -- low | medium | high
  assignee_teacher_id uuid REFERENCES secretaria.teachers(id) ON DELETE SET NULL,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meeting_items_sheet ON secretaria.meeting_items(sheet_id);
CREATE INDEX IF NOT EXISTS idx_meeting_sheets_date ON secretaria.meeting_sheets(meeting_date);

-- Auditoría coherente
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='secretaria' AND event_object_table='meeting_sheets' AND trigger_name='trg_audit_meeting_sheets') THEN
    CREATE TRIGGER trg_audit_meeting_sheets AFTER INSERT OR UPDATE OR DELETE ON secretaria.meeting_sheets FOR EACH ROW EXECUTE FUNCTION secretaria.fn_audit();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='secretaria' AND event_object_table='meeting_items' AND trigger_name='trg_audit_meeting_items') THEN
    CREATE TRIGGER trg_audit_meeting_items AFTER INSERT OR UPDATE OR DELETE ON secretaria.meeting_items FOR EACH ROW EXECUTE FUNCTION secretaria.fn_audit();
  END IF;
END $$;
