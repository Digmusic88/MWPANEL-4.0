-- migrations/033_danza_realtime.sql
-- Mete danza_assignments y danza_fee_tiers en el feed de tiempo real (topic 'danza')
-- para que la sección Danza refresque en vivo. Usa la función solo-NOTIFY existente.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['danza_assignments','danza_fee_tiers'] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_notify_change ON secretaria.%I; '
      'CREATE TRIGGER trg_notify_change AFTER INSERT OR UPDATE OR DELETE ON secretaria.%I '
      'FOR EACH ROW EXECUTE FUNCTION secretaria.fn_notify_change()', t, t);
  END LOOP;
END $$;
