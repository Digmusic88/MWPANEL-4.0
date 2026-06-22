-- migrations/026_realtime_notify.sql
-- Amplia el trigger de auditoria para emitir un NOTIFY con payload minimo
-- (solo tabla + accion). No cambia lo que ya escribe en audit_log.
CREATE OR REPLACE FUNCTION secretaria.fn_audit() RETURNS trigger AS $$
BEGIN
  INSERT INTO secretaria.audit_log(table_name, record_id, action, old_data, new_data)
  VALUES (TG_TABLE_NAME,
          COALESCE(NEW.id::text, OLD.id::text),
          TG_OP,
          CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
          CASE WHEN TG_OP IN ('UPDATE','INSERT') THEN to_jsonb(NEW) END);

  -- Aviso de tiempo real: payload minimo (sin datos sensibles, < 8KB).
  PERFORM pg_notify('secretaria_changes',
    json_build_object('t', TG_TABLE_NAME, 'a', TG_OP)::text);

  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;
