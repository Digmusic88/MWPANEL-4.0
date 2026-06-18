-- Secretaría — Migración 024: calendario escolar (trimestres + días sin clase)
SET search_path TO secretaria, public;

-- Trimestres / periodos lectivos: las clases sólo se generan dentro de estos rangos
CREATE TABLE IF NOT EXISTS secretaria.academic_terms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id uuid NOT NULL REFERENCES secretaria.academic_years(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_terms_year ON secretaria.academic_terms(academic_year_id);

-- Días sin clase: festivos, puentes, descansos, vacaciones (un día o un rango)
CREATE TABLE IF NOT EXISTS secretaria.non_class_days (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id uuid NOT NULL REFERENCES secretaria.academic_years(id) ON DELETE CASCADE,
  date date NOT NULL,
  end_date date,                              -- NULL = un solo día; si no, rango (puentes/vacaciones)
  label varchar NOT NULL,
  kind varchar NOT NULL DEFAULT 'festivo',    -- festivo | puente | descanso | vacaciones
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nonclass_year ON secretaria.non_class_days(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_nonclass_date ON secretaria.non_class_days(date);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='secretaria' AND event_object_table='academic_terms' AND trigger_name='trg_audit_academic_terms') THEN
    CREATE TRIGGER trg_audit_academic_terms AFTER INSERT OR UPDATE OR DELETE ON secretaria.academic_terms FOR EACH ROW EXECUTE FUNCTION secretaria.fn_audit();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='secretaria' AND event_object_table='non_class_days' AND trigger_name='trg_audit_non_class_days') THEN
    CREATE TRIGGER trg_audit_non_class_days AFTER INSERT OR UPDATE OR DELETE ON secretaria.non_class_days FOR EACH ROW EXECUTE FUNCTION secretaria.fn_audit();
  END IF;
END $$;
