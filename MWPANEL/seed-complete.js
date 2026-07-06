const { execSync } = require('child_process');

console.log('🚀 Iniciando población completa de la base de datos...');

// Función para ejecutar SQL
function executeSQL(sql, description) {
  console.log(`📝 ${description}...`);
  try {
    execSync(`docker compose exec -T postgres psql -U mwpanel -d mwpanel -c "${sql.replace(/"/g, '\\"')}"`, {
      stdio: 'inherit',
      cwd: '/opt/mw-panel'
    });
    return true;
  } catch (error) {
    console.error(`❌ Error en ${description}:`, error.message);
    return false;
  }
}

async function populateDatabase() {
  try {
    // 1. Usar hashes predefinidos de contraseñas
    console.log('🔐 Usando hashes de contraseñas predefinidos...');
    const adminHash = '$2b$10$HkqI0LzHQjSXF7VWHoSZJ.Xq7Zz7z1LqcOeY2qF8iQ4.xQNu9sI5a';
    const teacherHash = '$2b$10$HkqI0LzHQjSXF7VWHoSZJ.Xq7Zz7z1LqcOeY2qF8iQ4.xQNu9sI5a';
    const studentHash = '$2b$10$HkqI0LzHQjSXF7VWHoSZJ.Xq7Zz7z1LqcOeY2qF8iQ4.xQNu9sI5a';
    const familyHash = '$2b$10$HkqI0LzHQjSXF7VWHoSZJ.Xq7Zz7z1LqcOeY2qF8iQ4.xQNu9sI5a';

    // 2. Crear niveles educativos
    executeSQL(`
      INSERT INTO educational_levels (id, name, code, description) VALUES 
      ('11111111-1111-1111-1111-111111111111', 'Educación Infantil', 'INFANTIL', 'Etapa educativa de 0 a 6 años'),
      ('22222222-2222-2222-2222-222222222222', 'Educación Primaria', 'PRIMARIA', 'Etapa educativa obligatoria de 6 a 12 años'),
      ('33333333-3333-3333-3333-333333333333', 'Educación Secundaria Obligatoria', 'SECUNDARIA', 'Etapa educativa obligatoria de 12 a 16 años')
    `, 'Crear niveles educativos');

    // 3. Crear áreas de competencias
    executeSQL(`
      INSERT INTO areas (id, name, description, color) VALUES
      ('a1111111-1111-1111-1111-111111111111', 'Lengua Castellana y Literatura', 'Comunicación lingüística', '#e74c3c'),
      ('a2222222-2222-2222-2222-222222222222', 'Matemáticas', 'Competencia matemática', '#3498db'),
      ('a3333333-3333-3333-3333-333333333333', 'Ciencias Naturales', 'Competencia científica', '#2ecc71'),
      ('a4444444-4444-4444-4444-444444444444', 'Ciencias Sociales', 'Competencia social y cívica', '#f39c12'),
      ('a5555555-5555-5555-5555-555555555555', 'Educación Artística', 'Conciencia y expresión cultural', '#9b59b6')
    `, 'Crear áreas de competencias');

    // 4. Crear competencias
    executeSQL(`
      INSERT INTO competencies (id, name, description, "areaId") VALUES
      ('c1111111-1111-1111-1111-111111111111', 'Comunicación lingüística', 'Utilizar el lenguaje como instrumento de comunicación oral y escrita', 'a1111111-1111-1111-1111-111111111111'),
      ('c2222222-2222-2222-2222-222222222222', 'Competencia matemática', 'Utilizar números y operaciones básicas, símbolos y formas', 'a2222222-2222-2222-2222-222222222222'),
      ('c3333333-3333-3333-3333-333333333333', 'Conocimiento del medio', 'Interpretar el mundo físico y social', 'a3333333-3333-3333-3333-333333333333'),
      ('c4444444-4444-4444-4444-444444444444', 'Tratamiento de la información', 'Buscar, obtener, procesar y comunicar información', 'a4444444-4444-4444-4444-444444444444'),
      ('c5555555-5555-5555-5555-555555555555', 'Competencia social y ciudadana', 'Comprender la realidad social del mundo', 'a4444444-4444-4444-4444-444444444444'),
      ('c6666666-6666-6666-6666-666666666666', 'Competencia cultural y artística', 'Apreciar, comprender y valorar manifestaciones culturales', 'a5555555-5555-5555-5555-555555555555'),
      ('c7777777-7777-7777-7777-777777777777', 'Competencia para aprender a aprender', 'Iniciarse en el aprendizaje y continuar aprendiendo', 'a1111111-1111-1111-1111-111111111111'),
      ('c8888888-8888-8888-8888-888888888888', 'Autonomía e iniciativa personal', 'Desarrollar valores personales y tomar decisiones', 'a5555555-5555-5555-5555-555555555555')
    `, 'Crear competencias');

    // 5. Crear ciclos
    executeSQL(`
      INSERT INTO cycles (id, name, "order", "educationalLevelId") VALUES
      ('cy111111-1111-1111-1111-111111111111', 'Primer Ciclo Primaria', 1, '22222222-2222-2222-2222-222222222222'),
      ('cy222222-2222-2222-2222-222222222222', 'Segundo Ciclo Primaria', 2, '22222222-2222-2222-2222-222222222222'),
      ('cy333333-3333-3333-3333-333333333333', 'Tercer Ciclo Primaria', 3, '22222222-2222-2222-2222-222222222222')
    `, 'Crear ciclos');

    // 6. Crear cursos
    executeSQL(`
      INSERT INTO courses (id, name, "order", "academicYear", "cycleId") VALUES
      ('co111111-1111-1111-1111-111111111111', '1º Primaria', 1, '2024-2025', 'cy111111-1111-1111-1111-111111111111'),
      ('co222222-2222-2222-2222-222222222222', '2º Primaria', 2, '2024-2025', 'cy111111-1111-1111-1111-111111111111'),
      ('co333333-3333-3333-3333-333333333333', '3º Primaria', 3, '2024-2025', 'cy222222-2222-2222-2222-222222222222'),
      ('co444444-4444-4444-4444-444444444444', '4º Primaria', 4, '2024-2025', 'cy222222-2222-2222-2222-222222222222'),
      ('co555555-5555-5555-5555-555555555555', '5º Primaria', 5, '2024-2025', 'cy333333-3333-3333-3333-333333333333'),
      ('co666666-6666-6666-6666-666666666666', '6º Primaria', 6, '2024-2025', 'cy333333-3333-3333-3333-333333333333')
    `, 'Crear cursos');

    // 7. Crear aulas
    executeSQL(`
      INSERT INTO classrooms (id, name, capacity, type, equipment, location) VALUES
      ('cr111111-1111-1111-1111-111111111111', 'Aula 1A', 25, 'standard', 'Pizarra digital, proyector', 'Planta baja'),
      ('cr222222-2222-2222-2222-222222222222', 'Aula 1B', 25, 'standard', 'Pizarra digital, proyector', 'Planta baja'),
      ('cr333333-3333-3333-3333-333333333333', 'Aula 2A', 25, 'standard', 'Pizarra digital, proyector', 'Primera planta'),
      ('cr444444-4444-4444-4444-444444444444', 'Laboratorio', 20, 'laboratory', 'Equipos científicos', 'Primera planta'),
      ('cr555555-5555-5555-5555-555555555555', 'Biblioteca', 30, 'library', 'Ordenadores, libros', 'Planta baja')
    `, 'Crear aulas');

    // 8. Crear años académicos
    executeSQL(`
      INSERT INTO academic_years (id, name, "startDate", "endDate", "isActive") VALUES
      ('ay111111-1111-1111-1111-111111111111', '2024-2025', '2024-09-01', '2025-06-30', true),
      ('ay222222-2222-2222-2222-222222222222', '2023-2024', '2023-09-01', '2024-06-30', false)
    `, 'Crear años académicos');

    // 9. Crear períodos de evaluación
    executeSQL(`
      INSERT INTO evaluation_periods (id, name, type, "startDate", "endDate", "academicYearId") VALUES
      ('ep111111-1111-1111-1111-111111111111', 'Primer Trimestre', 'trimester_1', '2024-09-01', '2024-12-20', 'ay111111-1111-1111-1111-111111111111'),
      ('ep222222-2222-2222-2222-222222222222', 'Segundo Trimestre', 'trimester_2', '2025-01-08', '2025-03-28', 'ay111111-1111-1111-1111-111111111111'),
      ('ep333333-3333-3333-3333-333333333333', 'Tercer Trimestre', 'trimester_3', '2025-04-07', '2025-06-30', 'ay111111-1111-1111-1111-111111111111')
    `, 'Crear períodos de evaluación');

    // 10. Crear usuarios principales
    executeSQL(`
      INSERT INTO users (id, email, "passwordHash", role, "isActive") VALUES
      ('u1111111-1111-1111-1111-111111111111', 'admin@mwpanel.com', '${adminHash}', 'admin', true),
      ('u2222222-2222-2222-2222-222222222222', 'profesor@mwpanel.com', '${teacherHash}', 'teacher', true),
      ('u3333333-3333-3333-3333-333333333333', 'ana.lopez@mwpanel.com', '${teacherHash}', 'teacher', true),
      ('u4444444-4444-4444-4444-444444444444', 'carlos.ruiz@mwpanel.com', '${teacherHash}', 'teacher', true),
      ('u5555555-5555-5555-5555-555555555555', 'lengua@mwpanel.com', '${teacherHash}', 'teacher', true),
      ('u6666666-6666-6666-6666-666666666666', 'matematicas@mwpanel.com', '${teacherHash}', 'teacher', true),
      ('u7777777-7777-7777-7777-777777777777', 'estudiante@mwpanel.com', '${studentHash}', 'student', true),
      ('u8888888-8888-8888-8888-888888888888', 'juan.perez@mwpanel.com', '${studentHash}', 'student', true),
      ('u9999999-9999-9999-9999-999999999999', 'sofia.martinez@mwpanel.com', '${studentHash}', 'student', true),
      ('ua111111-1111-1111-1111-111111111111', 'pablo.fernandez@mwpanel.com', '${studentHash}', 'student', true),
      ('ub111111-1111-1111-1111-111111111111', 'familia@mwpanel.com', '${familyHash}', 'family', true),
      ('uc111111-1111-1111-1111-111111111111', 'maria.gonzalez@mwpanel.com', '${familyHash}', 'family', true)
    `, 'Crear usuarios principales');

    // 11. Crear perfiles de usuario
    executeSQL(`
      INSERT INTO user_profiles (id, "userId", "firstName", "lastName", phone, dni) VALUES
      (gen_random_uuid(), 'u1111111-1111-1111-1111-111111111111', 'Administrador', 'del Sistema', '+34 600 000 001', '00000001A'),
      (gen_random_uuid(), 'u2222222-2222-2222-2222-222222222222', 'María', 'García López', '+34 600 000 002', '12345678B'),
      (gen_random_uuid(), 'u3333333-3333-3333-3333-333333333333', 'Ana', 'López Martín', '+34 600 000 003', '23456789C'),
      (gen_random_uuid(), 'u4444444-4444-4444-4444-444444444444', 'Carlos', 'Ruiz Sánchez', '+34 600 000 004', '34567890D'),
      (gen_random_uuid(), 'u5555555-5555-5555-5555-555555555555', 'Profesora', 'de Lengua', '+34 600 000 005', '45678901E'),
      (gen_random_uuid(), 'u6666666-6666-6666-6666-666666666666', 'Profesor', 'de Matemáticas', '+34 600 000 006', '56789012F'),
      (gen_random_uuid(), 'u7777777-7777-7777-7777-777777777777', 'Ana', 'García López', '+34 600 000 007', '67890123G'),
      (gen_random_uuid(), 'u8888888-8888-8888-8888-888888888888', 'Juan', 'Pérez González', '+34 600 000 008', '78901234H'),
      (gen_random_uuid(), 'u9999999-9999-9999-9999-999999999999', 'Sofía', 'Martínez Rodríguez', '+34 600 000 009', '89012345I'),
      (gen_random_uuid(), 'ua111111-1111-1111-1111-111111111111', 'Pablo', 'Fernández Díaz', '+34 600 000 010', '90123456J'),
      (gen_random_uuid(), 'ub111111-1111-1111-1111-111111111111', 'Familia', 'Demo', '+34 600 000 011', '01234567K'),
      (gen_random_uuid(), 'uc111111-1111-1111-1111-111111111111', 'María', 'González Ruiz', '+34 600 000 012', '12345678L')
    `, 'Crear perfiles de usuario');

    // 12. Crear profesores
    executeSQL(`
      INSERT INTO teachers (id, "employeeNumber", specialties, "userId") VALUES
      ('t1111111-1111-1111-1111-111111111111', 'T001', 'Educación Primaria', 'u2222222-2222-2222-2222-222222222222'),
      ('t2222222-2222-2222-2222-222222222222', 'T002', 'Lengua y Literatura', 'u3333333-3333-3333-3333-333333333333'),
      ('t3333333-3333-3333-3333-333333333333', 'T003', 'Educación Física', 'u4444444-4444-4444-4444-444444444444'),
      ('t4444444-4444-4444-4444-444444444444', 'T004', 'Lengua Castellana', 'u5555555-5555-5555-5555-555555555555'),
      ('t5555555-5555-5555-5555-555555555555', 'T005', 'Matemáticas', 'u6666666-6666-6666-6666-666666666666')
    `, 'Crear profesores');

    // 13. Crear estudiantes
    executeSQL(`
      INSERT INTO students (id, "enrollmentNumber", "birthDate", "userId", "courseId", "educationalLevelId") VALUES
      ('s1111111-1111-1111-1111-111111111111', 'S0001', '2015-05-15', 'u7777777-7777-7777-7777-777777777777', 'co111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
      ('s2222222-2222-2222-2222-222222222222', 'S0002', '2015-03-20', 'u8888888-8888-8888-8888-888888888888', 'co222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
      ('s3333333-3333-3333-3333-333333333333', 'S0003', '2014-11-08', 'u9999999-9999-9999-9999-999999999999', 'co333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222'),
      ('s4444444-4444-4444-4444-444444444444', 'S0004', '2014-07-12', 'ua111111-1111-1111-1111-111111111111', 'co444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222')
    `, 'Crear estudiantes');

    // 14. Crear familias
    executeSQL(`
      INSERT INTO families (id, "primaryContactId", "householdType") VALUES
      ('f1111111-1111-1111-1111-111111111111', 'ub111111-1111-1111-1111-111111111111', 'nuclear'),
      ('f2222222-2222-2222-2222-222222222222', 'uc111111-1111-1111-1111-111111111111', 'nuclear')
    `, 'Crear familias');

    // 15. Crear relaciones familia-estudiantes
    executeSQL(`
      INSERT INTO family_students (id, "familyId", "studentId", relationship) VALUES
      (gen_random_uuid(), 'f1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 'mother'),
      (gen_random_uuid(), 'f1111111-1111-1111-1111-111111111111', 's2222222-2222-2222-2222-222222222222', 'mother'),
      (gen_random_uuid(), 'f2222222-2222-2222-2222-222222222222', 's3333333-3333-3333-3333-333333333333', 'father'),
      (gen_random_uuid(), 'f2222222-2222-2222-2222-222222222222', 's4444444-4444-4444-4444-444444444444', 'father')
    `, 'Crear relaciones familia-estudiantes');

    // 16. Crear grupos de clase
    executeSQL(`
      INSERT INTO class_groups (id, name, "academicYear", capacity, "tutorId", "classroomId") VALUES
      ('cg111111-1111-1111-1111-111111111111', '1º A', '2024-2025', 25, 't1111111-1111-1111-1111-111111111111', 'cr111111-1111-1111-1111-111111111111'),
      ('cg222222-2222-2222-2222-222222222222', '2º A', '2024-2025', 25, 't2222222-2222-2222-2222-222222222222', 'cr222222-2222-2222-2222-222222222222'),
      ('cg333333-3333-3333-3333-333333333333', '3º A', '2024-2025', 25, 't3333333-3333-3333-3333-333333333333', 'cr333333-3333-3333-3333-333333333333')
    `, 'Crear grupos de clase');

    // 17. Asignar estudiantes a grupos de clase
    executeSQL(`
      INSERT INTO class_students (id, "classGroupId", "studentId") VALUES
      (gen_random_uuid(), 'cg111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111'),
      (gen_random_uuid(), 'cg222222-2222-2222-2222-222222222222', 's2222222-2222-2222-2222-222222222222'),
      (gen_random_uuid(), 'cg333333-3333-3333-3333-333333333333', 's3333333-3333-3333-3333-333333333333'),
      (gen_random_uuid(), 'cg333333-3333-3333-3333-333333333333', 's4444444-4444-4444-4444-444444444444')
    `, 'Asignar estudiantes a grupos de clase');

    // 18. Crear asignaturas
    executeSQL(`
      INSERT INTO subjects (id, name, description, color, "courseId") VALUES
      ('su111111-1111-1111-1111-111111111111', 'Lengua Castellana', 'Lengua y Literatura Española', '#e74c3c', 'co111111-1111-1111-1111-111111111111'),
      ('su222222-2222-2222-2222-222222222222', 'Matemáticas', 'Matemáticas y Cálculo', '#3498db', 'co111111-1111-1111-1111-111111111111'),
      ('su333333-3333-3333-3333-333333333333', 'Ciencias Naturales', 'Conocimiento del Medio Natural', '#2ecc71', 'co222222-2222-2222-2222-222222222222'),
      ('su444444-4444-4444-4444-444444444444', 'Educación Física', 'Actividad Física y Deporte', '#f39c12', 'co333333-3333-3333-3333-333333333333')
    `, 'Crear asignaturas');

    // 19. Crear asignaciones de asignaturas a profesores
    executeSQL(`
      INSERT INTO subject_assignments (id, "teacherId", "subjectId", "classGroupId", "academicYear") VALUES
      (gen_random_uuid(), 't4444444-4444-4444-4444-444444444444', 'su111111-1111-1111-1111-111111111111', 'cg111111-1111-1111-1111-111111111111', '2024-2025'),
      (gen_random_uuid(), 't5555555-5555-5555-5555-555555555555', 'su222222-2222-2222-2222-222222222222', 'cg111111-1111-1111-1111-111111111111', '2024-2025'),
      (gen_random_uuid(), 't2222222-2222-2222-2222-222222222222', 'su333333-3333-3333-3333-333333333333', 'cg222222-2222-2222-2222-222222222222', '2024-2025'),
      (gen_random_uuid(), 't3333333-3333-3333-3333-333333333333', 'su444444-4444-4444-4444-444444444444', 'cg333333-3333-3333-3333-333333333333', '2024-2025')
    `, 'Crear asignaciones profesor-asignatura');

    console.log('✅ Base de datos poblada exitosamente!');
    console.log('📊 Creando estadísticas finales...');

    // Mostrar estadísticas
    execSync(`docker compose exec -T postgres psql -U mwpanel -d mwpanel -c "
      SELECT 
        'Usuarios' as tipo, COUNT(*) as cantidad FROM users
      UNION ALL SELECT 'Profesores', COUNT(*) FROM teachers
      UNION ALL SELECT 'Estudiantes', COUNT(*) FROM students
      UNION ALL SELECT 'Familias', COUNT(*) FROM families
      UNION ALL SELECT 'Grupos de Clase', COUNT(*) FROM class_groups
      UNION ALL SELECT 'Asignaturas', COUNT(*) FROM subjects;
    "`, { stdio: 'inherit', cwd: '/opt/mw-panel' });

    console.log('🎉 Población completa de base de datos terminada exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la población:', error);
    process.exit(1);
  }
}

populateDatabase();