-- =====================================================================
-- Secretaría — Migración 017: auditoría ampliada + revertir genérico
-- =====================================================================
SET search_path TO secretaria, public;

-- Triggers de auditoría en las tablas de organización (si no existen)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['groups','schedule_slots','apoyo_assignments','charges'] LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers
                   WHERE trigger_schema='secretaria' AND event_object_table=t AND trigger_name='trg_audit_'||t) THEN
      EXECUTE format('CREATE TRIGGER trg_audit_%s AFTER INSERT OR UPDATE OR DELETE ON secretaria.%I FOR EACH ROW EXECUTE FUNCTION secretaria.fn_audit()', t, t);
    END IF;
  END LOOP;
END $$;

-- Revierte una entrada del audit_log aplicando la operación inversa.
-- La propia reversión queda registrada (trigger), por lo que puede revertirse de nuevo (rehacer).
CREATE OR REPLACE FUNCTION secretaria.fn_revert_audit(p_audit_id uuid)
RETURNS jsonb AS $$
DECLARE a RECORD; tbl text; setlist text;
  allow text[] := ARRAY['groups','schedule_slots','apoyo_assignments','charges','enrollments','students','bank_accounts','payments','sepa_batches'];
BEGIN
  SELECT * INTO a FROM secretaria.audit_log WHERE id=p_audit_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entrada de historial no encontrada'; END IF;
  tbl := a.table_name;
  IF NOT (tbl = ANY(allow)) THEN RAISE EXCEPTION 'Tabla no reversible: %', tbl; END IF;

  IF a.action='INSERT' THEN
    EXECUTE format('DELETE FROM secretaria.%I WHERE id::text = $1', tbl) USING a.record_id;
  ELSIF a.action='DELETE' THEN
    EXECUTE format('INSERT INTO secretaria.%I SELECT (jsonb_populate_record(NULL::secretaria.%I, $1)).*', tbl, tbl) USING a.old_data;
  ELSE -- UPDATE: restaurar old_data
    SELECT string_agg(format('%I = s.%I', column_name, column_name), ', ') INTO setlist
      FROM information_schema.columns
      WHERE table_schema='secretaria' AND table_name=tbl AND column_name <> 'id';
    EXECUTE format('UPDATE secretaria.%I t SET %s FROM (SELECT (jsonb_populate_record(NULL::secretaria.%I, $1)).*) s WHERE t.id::text=$2', tbl, setlist, tbl)
      USING a.old_data, a.record_id;
    IF NOT FOUND THEN
      EXECUTE format('INSERT INTO secretaria.%I SELECT (jsonb_populate_record(NULL::secretaria.%I, $1)).*', tbl, tbl) USING a.old_data;
    END IF;
  END IF;
  RETURN jsonb_build_object('ok', true, 'table', tbl, 'action', a.action);
END; $$ LANGUAGE plpgsql;
