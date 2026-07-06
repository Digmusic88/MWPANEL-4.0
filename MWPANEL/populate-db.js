const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mwpanel',
  user: 'mwpanel',
  password: 'mwpanel_password_2024',
});

async function populateDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando población de base de datos...');
    
    // Limpiar datos existentes
    console.log('🧹 Limpiando datos existentes...');
    await client.query('DELETE FROM user_profiles');
    await client.query('DELETE FROM users');
    
    // Crear niveles educativos
    console.log('📚 Creando niveles educativos...');
    await client.query(`
      INSERT INTO educational_levels (id, name, code, description) VALUES
      (gen_random_uuid(), 'Educación Infantil', 'INFANTIL', 'Etapa educativa de 0 a 6 años'),
      (gen_random_uuid(), 'Educación Primaria', 'PRIMARIA', 'Etapa educativa obligatoria de 6 a 12 años'),
      (gen_random_uuid(), 'Educación Secundaria Obligatoria', 'SECUNDARIA', 'Etapa educativa obligatoria de 12 a 16 años')
      ON CONFLICT DO NOTHING
    `);
    
    // Crear cursos básicos
    console.log('📖 Creando cursos...');
    const primaria = await client.query("SELECT id FROM educational_levels WHERE code = 'PRIMARIA'");
    if (primaria.rows.length > 0) {
      const primariaId = primaria.rows[0].id;
      await client.query(`
        INSERT INTO courses (id, name, code, "educationalLevelId") VALUES
        (gen_random_uuid(), '1º Primaria', '1P', $1),
        (gen_random_uuid(), '2º Primaria', '2P', $1),
        (gen_random_uuid(), '3º Primaria', '3P', $1),
        (gen_random_uuid(), '4º Primaria', '4P', $1),
        (gen_random_uuid(), '5º Primaria', '5P', $1),
        (gen_random_uuid(), '6º Primaria', '6P', $1)
        ON CONFLICT DO NOTHING
      `, [primariaId]);
    }
    
    // Generar hashes de contraseñas
    console.log('🔐 Generando hashes de contraseñas...');
    const adminHash = await bcrypt.hash('Admin123', 10);
    const teacherHash = await bcrypt.hash('Profesor123', 10);
    const studentHash = await bcrypt.hash('Estudiante123', 10);
    const familyHash = await bcrypt.hash('Familia123', 10);
    
    // Crear usuarios
    console.log('👥 Creando usuarios...');
    const users = [
      ['admin@mwpanel.com', adminHash, 'admin', 'Administrador', 'del Sistema'],
      ['test@mwpanel.com', adminHash, 'admin', 'Test', 'Admin'],
      ['profesor@mwpanel.com', teacherHash, 'teacher', 'María', 'García López'],
      ['ana.lopez@mwpanel.com', teacherHash, 'teacher', 'Ana', 'López Martín'],
      ['carlos.ruiz@mwpanel.com', teacherHash, 'teacher', 'Carlos', 'Ruiz Sánchez'],
      ['lengua@mwpanel.com', teacherHash, 'teacher', 'Profesora', 'de Lengua'],
      ['matematicas@mwpanel.com', teacherHash, 'teacher', 'Profesor', 'de Matemáticas'],
      ['estudiante@mwpanel.com', studentHash, 'student', 'Ana', 'García López'],
      ['juan.perez@mwpanel.com', studentHash, 'student', 'Juan', 'Pérez González'],
      ['sofia.martinez@mwpanel.com', studentHash, 'student', 'Sofía', 'Martínez Rodríguez'],
      ['pablo.fernandez@mwpanel.com', studentHash, 'student', 'Pablo', 'Fernández Díaz'],
      ['demo@mwpanel.com', studentHash, 'student', 'Demo', 'Student'],
      ['familia@mwpanel.com', familyHash, 'family', 'Familia', 'Demo'],
      ['maria.gonzalez@mwpanel.com', familyHash, 'family', 'María', 'González Ruiz'],
    ];
    
    for (const [email, passwordHash, role, firstName, lastName] of users) {
      const userResult = await client.query(`
        INSERT INTO users (id, email, "passwordHash", role, "isActive") 
        VALUES (gen_random_uuid(), $1, $2, $3, true) 
        RETURNING id
      `, [email, passwordHash, role]);
      
      const userId = userResult.rows[0].id;
      
      await client.query(`
        INSERT INTO user_profiles (id, "userId", "firstName", "lastName", phone, dni) 
        VALUES (gen_random_uuid(), $1, $2, $3, '+34 600 000 001', '00000001A')
      `, [userId, firstName, lastName]);
      
      console.log(`✓ Usuario creado: ${email} (${role})`);
    }
    
    // Crear entidades específicas por rol
    console.log('🎓 Creando entidades específicas...');
    
    // Teachers
    const teachers = await client.query("SELECT id, email FROM users WHERE role = 'teacher'");
    for (const teacher of teachers.rows) {
      const employeeNumber = `T${teachers.rows.indexOf(teacher) + 1}`.padStart(3, '0');
      await client.query(`
        INSERT INTO teachers (id, "employeeNumber", specialties, "userId") 
        VALUES (gen_random_uuid(), $1, 'Educación General', $2)
      `, [employeeNumber, teacher.id]);
    }
    
    // Students (necesitamos un curso)
    const curso = await client.query("SELECT id FROM courses LIMIT 1");
    const educationalLevel = await client.query("SELECT id FROM educational_levels WHERE code = 'PRIMARIA'");
    
    if (curso.rows.length > 0 && educationalLevel.rows.length > 0) {
      const students = await client.query("SELECT id, email FROM users WHERE role = 'student'");
      for (const student of students.rows) {
        const enrollmentNumber = `S${students.rows.indexOf(student) + 1}`.padStart(4, '0');
        await client.query(`
          INSERT INTO students (id, "enrollmentNumber", "birthDate", "userId", "courseId", "educationalLevelId") 
          VALUES (gen_random_uuid(), $1, '2010-01-01', $2, $3, $4)
        `, [enrollmentNumber, student.id, curso.rows[0].id, educationalLevel.rows[0].id]);
      }
    }
    
    // Families
    const families = await client.query("SELECT id, email FROM users WHERE role = 'family'");
    for (const family of families.rows) {
      await client.query(`
        INSERT INTO families (id, "primaryContactId", "householdType") 
        VALUES (gen_random_uuid(), $1, 'nuclear')
      `, [family.id]);
    }
    
    console.log('✅ Base de datos poblada exitosamente!');
    console.log('📊 Estadísticas:');
    
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM teachers) as teachers,
        (SELECT COUNT(*) FROM students) as students,
        (SELECT COUNT(*) FROM families) as families
    `);
    
    console.log(`👥 Usuarios: ${stats.rows[0].users}`);
    console.log(`👩‍🏫 Profesores: ${stats.rows[0].teachers}`);
    console.log(`🎓 Estudiantes: ${stats.rows[0].students}`);
    console.log(`👨‍👩‍👧‍👦 Familias: ${stats.rows[0].families}`);
    
  } catch (error) {
    console.error('❌ Error poblando base de datos:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

populateDatabase();