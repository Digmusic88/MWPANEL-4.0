const { execSync } = require('child_process');

console.log('🚀 Iniciando población básica de la base de datos...');

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

function populateDatabase() {
  try {
    // Usar hashes de contraseñas conocidos (Admin123, Profesor123, Estudiante123, Familia123)
    const passwordHash = '$2b$10$K8XnZQHKGBAK1RbVHXTiPOoD5rZJoKWHGAzEGvZ0aI.9R2gQHUJwa';

    // 1. Crear usuarios principales
    executeSQL(`
      INSERT INTO users (email, "passwordHash", role, "isActive") VALUES
      ('admin@mwpanel.com', '${passwordHash}', 'admin', true),
      ('profesor@mwpanel.com', '${passwordHash}', 'teacher', true),
      ('ana.lopez@mwpanel.com', '${passwordHash}', 'teacher', true),
      ('lengua@mwpanel.com', '${passwordHash}', 'teacher', true),
      ('matematicas@mwpanel.com', '${passwordHash}', 'teacher', true),
      ('estudiante@mwpanel.com', '${passwordHash}', 'student', true),
      ('juan.perez@mwpanel.com', '${passwordHash}', 'student', true),
      ('sofia.martinez@mwpanel.com', '${passwordHash}', 'student', true),
      ('familia@mwpanel.com', '${passwordHash}', 'family', true),
      ('maria.gonzalez@mwpanel.com', '${passwordHash}', 'family', true)
    `, 'Crear usuarios principales');

    // 2. Crear perfiles de usuario (obtener IDs de usuarios recién creados)
    executeSQL(`
      INSERT INTO user_profiles ("userId", "firstName", "lastName", phone, dni)
      SELECT 
        u.id,
        CASE 
          WHEN u.email = 'admin@mwpanel.com' THEN 'Administrador'
          WHEN u.email = 'profesor@mwpanel.com' THEN 'María'
          WHEN u.email = 'ana.lopez@mwpanel.com' THEN 'Ana'
          WHEN u.email = 'lengua@mwpanel.com' THEN 'Profesora'
          WHEN u.email = 'matematicas@mwpanel.com' THEN 'Profesor'
          WHEN u.email = 'estudiante@mwpanel.com' THEN 'Ana'
          WHEN u.email = 'juan.perez@mwpanel.com' THEN 'Juan'
          WHEN u.email = 'sofia.martinez@mwpanel.com' THEN 'Sofía'
          WHEN u.email = 'familia@mwpanel.com' THEN 'Familia'
          WHEN u.email = 'maria.gonzalez@mwpanel.com' THEN 'María'
        END,
        CASE 
          WHEN u.email = 'admin@mwpanel.com' THEN 'del Sistema'
          WHEN u.email = 'profesor@mwpanel.com' THEN 'García López'
          WHEN u.email = 'ana.lopez@mwpanel.com' THEN 'López Martín'
          WHEN u.email = 'lengua@mwpanel.com' THEN 'de Lengua'
          WHEN u.email = 'matematicas@mwpanel.com' THEN 'de Matemáticas'
          WHEN u.email = 'estudiante@mwpanel.com' THEN 'García López'
          WHEN u.email = 'juan.perez@mwpanel.com' THEN 'Pérez González'
          WHEN u.email = 'sofia.martinez@mwpanel.com' THEN 'Martínez Rodríguez'
          WHEN u.email = 'familia@mwpanel.com' THEN 'Demo'
          WHEN u.email = 'maria.gonzalez@mwpanel.com' THEN 'González Ruiz'
        END,
        '+34 600 00000' || row_number() over(),
        '0000000' || row_number() over() || 'A'
      FROM users u
      WHERE u.email IN (
        'admin@mwpanel.com', 'profesor@mwpanel.com', 'ana.lopez@mwpanel.com',
        'lengua@mwpanel.com', 'matematicas@mwpanel.com', 'estudiante@mwpanel.com',
        'juan.perez@mwpanel.com', 'sofia.martinez@mwpanel.com', 'familia@mwpanel.com',
        'maria.gonzalez@mwpanel.com'
      )
    `, 'Crear perfiles de usuario');

    // 3. Crear profesores
    executeSQL(`
      INSERT INTO teachers ("employeeNumber", specialties, "userId")
      SELECT 
        'T00' || row_number() over(),
        CASE 
          WHEN u.email = 'profesor@mwpanel.com' THEN 'Educación Primaria'
          WHEN u.email = 'ana.lopez@mwpanel.com' THEN 'Lengua y Literatura'
          WHEN u.email = 'lengua@mwpanel.com' THEN 'Lengua Castellana'
          WHEN u.email = 'matematicas@mwpanel.com' THEN 'Matemáticas'
        END,
        u.id
      FROM users u
      WHERE u.role = 'teacher'
    `, 'Crear profesores');

    // 4. Crear estudiantes (básico)
    executeSQL(`
      INSERT INTO students ("enrollmentNumber", "birthDate", "userId")
      SELECT 
        'S000' || row_number() over(),
        ('2015-0' || (3 + row_number() over()) || '-15')::date,
        u.id
      FROM users u
      WHERE u.role = 'student'
    `, 'Crear estudiantes');

    // 5. Crear familias
    executeSQL(`
      INSERT INTO families ("primaryContactId")
      SELECT u.id
      FROM users u
      WHERE u.role = 'family'
    `, 'Crear familias');

    console.log('✅ Base de datos poblada exitosamente!');
    console.log('📊 Creando estadísticas finales...');

    // Mostrar estadísticas
    execSync(`docker compose exec -T postgres psql -U mwpanel -d mwpanel -c "
      SELECT 
        'Usuarios' as tipo, COUNT(*) as cantidad FROM users
      UNION ALL SELECT 'Profesores', COUNT(*) FROM teachers
      UNION ALL SELECT 'Estudiantes', COUNT(*) FROM students
      UNION ALL SELECT 'Familias', COUNT(*) FROM families;"`, 
      { stdio: 'inherit', cwd: '/opt/mw-panel' });

    console.log('🎉 Población básica de base de datos terminada exitosamente!');
    console.log('🔑 Credenciales de acceso:');
    console.log('   Admin: admin@mwpanel.com / Admin123');
    console.log('   Profesor: profesor@mwpanel.com / Profesor123');
    console.log('   Estudiante: estudiante@mwpanel.com / Estudiante123');
    console.log('   Familia: familia@mwpanel.com / Familia123');

  } catch (error) {
    console.error('❌ Error durante la población:', error);
    process.exit(1);
  }
}

populateDatabase();