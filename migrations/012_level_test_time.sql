-- migrations/012_level_test_time.sql
-- Añade hora de la prueba de nivel (HH:MM varchar, nullable)
SET search_path TO secretaria, public;

ALTER TABLE secretaria.level_tests
  ADD COLUMN IF NOT EXISTS test_time varchar(5) NULL;

COMMENT ON COLUMN secretaria.level_tests.test_time IS 'Hora de la prueba en formato HH:MM';
