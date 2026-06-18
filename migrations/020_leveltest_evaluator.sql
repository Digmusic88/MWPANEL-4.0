-- Secretaría — Migración 020: evaluador (profesor) en pruebas de nivel + enlaces de la prueba existente
SET search_path TO secretaria, public;
ALTER TABLE secretaria.level_tests ADD COLUMN IF NOT EXISTS evaluator_teacher_id uuid REFERENCES secretaria.teachers(id) ON DELETE SET NULL;

-- La prueba actual: evaluador = Diego León León, y enlazada al alumno Íñigo Osacar
UPDATE secretaria.level_tests
SET evaluator_teacher_id = (SELECT id FROM secretaria.teachers WHERE full_name ILIKE '%diego le%' OR full_name ILIKE 'diego%' LIMIT 1)
WHERE evaluator ILIKE '%diego%' AND evaluator_teacher_id IS NULL;

UPDATE secretaria.level_tests
SET student_id = '3f65c098-751a-41d1-a75a-7176d39ba755'
WHERE candidate_name ILIKE '%osacar%' AND student_id IS NULL;
