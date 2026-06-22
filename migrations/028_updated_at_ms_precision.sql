-- migrations/028_updated_at_ms_precision.sql
-- Fix control de version optimista: la columna updated_at guardaba microsegundos
-- (now()), pero la API la serializa a milisegundos (JS Date -> ISO ...Z), por lo
-- que `WHERE updated_at = <expected_ms>` nunca casaba. Reducimos la columna a
-- precision de milisegundos (timestamptz(3)) para que lo almacenado coincida
-- exactamente con el valor que viaja al cliente y vuelve.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['students','families','guardians','enrollments','groups'] LOOP
    EXECUTE format('ALTER TABLE secretaria.%I ALTER COLUMN updated_at TYPE timestamptz(3)', t);
  END LOOP;
END $$;
