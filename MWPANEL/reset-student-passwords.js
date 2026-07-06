/**
 * Script para resetear contraseñas de todos los estudiantes a "mundoworld"
 * Ejecutar desde el directorio del backend: node ../../reset-student-passwords.js
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function resetStudentPasswords() {
  const client = new Client({
    host: 'postgres',
    port: 5432,
    database: 'mwpanel',
    user: 'mwpanel',
    password: 'mwpanel123'
  });

  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();

    console.log('🔍 Buscando usuarios con rol "student"...');

    // Buscar todos los usuarios estudiantes
    const studentsQuery = `
      SELECT id, email, "passwordHash"
      FROM users
      WHERE role = 'student'
      AND "isActive" = true
    `;

    const studentsResult = await client.query(studentsQuery);
    const students = studentsResult.rows;

    console.log(`📊 Encontrados ${students.length} estudiantes activos`);

    if (students.length === 0) {
      console.log('⚠️  No se encontraron estudiantes activos');
      return;
    }

    // Generar hash de la nueva contraseña
    console.log('🔐 Generando hash para contraseña "mundoworld"...');
    const newPasswordHash = await bcrypt.hash('mundoworld', 10);

    // Actualizar contraseñas
    console.log('🔄 Actualizando contraseñas...');
    let updatedCount = 0;

    for (const student of students) {
      try {
        const updateQuery = `
          UPDATE users
          SET "passwordHash" = $1,
              "updatedAt" = NOW(),
              "isPasswordTemporary" = true,
              "temporaryPasswordHash" = null
          WHERE id = $2
        `;

        await client.query(updateQuery, [newPasswordHash, student.id]);
        console.log(`✅ Contraseña actualizada para: ${student.email}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error actualizando ${student.email}:`, error.message);
      }
    }

    console.log(`\n🎉 ¡Proceso completado!`);
    console.log(`📊 Estudiantes procesados: ${students.length}`);
    console.log(`✅ Contraseñas actualizadas: ${updatedCount}`);
    console.log(`❌ Errores: ${students.length - updatedCount}`);
    console.log(`\n🔑 Nueva contraseña para todos los estudiantes: mundoworld`);
    console.log(`⚠️  La contraseña está marcada como temporal y deberían cambiarla en el primer login`);

  } catch (error) {
    console.error('❌ Error en el proceso:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

// Verificar que bcrypt esté disponible
if (!bcrypt) {
  console.error('❌ Error: bcrypt no está disponible. Instalar con: npm install bcrypt');
  process.exit(1);
}

resetStudentPasswords();