-- migrations/029_notify_remaining_tables.sql
-- Cierra el hueco "ver en vivo": varias tablas referenciadas por el mapa de topics
-- de tiempo real no tenian trigger de auditoria, asi que nunca emitian NOTIFY y
-- sus pantallas no refrescaban (Asistencia, Familias, Documentacion, Pruebas de
-- nivel, Rifas, Taper, y franjas de Apoyo / convocatorias de Examenes).
--
-- Usamos una funcion SOLO-NOTIFY (sin INSERT en audit_log) para no inflar la
-- auditoria con tablas de mucha escritura (p.ej. attendance). Las tablas que ya
-- tienen fn_audit siguen emitiendo NOTIFY por esa via (migracion 026); aqui solo
-- añadimos las que faltaban.
CREATE OR REPLACE FUNCTION secretaria.fn_notify_change() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('secretaria_changes',
    json_build_object('t', TG_TABLE_NAME, 'a', TG_OP)::text);
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'families','guardians','rooms','apoyo_slots','attendance','payment_allocations',
    'student_documents','document_types','level_tests','exam_sessions',
    'raffle_campaigns','raffle_books','taper_usage'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_notify_change ON secretaria.%I; '
      'CREATE TRIGGER trg_notify_change AFTER INSERT OR UPDATE OR DELETE ON secretaria.%I '
      'FOR EACH ROW EXECUTE FUNCTION secretaria.fn_notify_change()', t, t);
  END LOOP;
END $$;
