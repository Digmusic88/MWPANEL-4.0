/**
 * @script: create-dua-test-data.js
 * @description: Script para crear datos de ejemplo del sistema DUA
 * @usage: node src/scripts/create-dua-test-data.js
 */

const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'mwpanel',
  password: process.env.DB_PASSWORD || 'mwpanel_password',
  database: process.env.DB_NAME || 'mwpanel',
};

async function createDuaTestData() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('🔌 Conectado a la base de datos');

    // 1. Obtener profesor de prueba
    const teacherResult = await client.query(`
      SELECT u.id as user_id, t.id as teacher_id
      FROM users u
      INNER JOIN teachers t ON t."userId" = u.id
      WHERE u.email = 'profesor@mwpanel.com'
      LIMIT 1
    `);

    if (teacherResult.rows.length === 0) {
      console.log('❌ No se encontró el profesor de prueba. Asegúrate de que existe profesor@mwpanel.com');
      return;
    }

    const teacher = teacherResult.rows[0];
    console.log(`👨‍🏫 Profesor encontrado: ${teacher.user_id}`);

    // 2. Obtener estudiantes de prueba (sin perfiles DUA existentes)
    const studentsResult = await client.query(`
      SELECT s.id, s."enrollmentNumber", u.id as user_id, up."firstName", up."lastName"
      FROM students s
      INNER JOIN users u ON s."userId" = u.id
      INNER JOIN user_profiles up ON u.id = up."userId"
      LEFT JOIN dua_profiles dp ON s.id = dp.student_id AND dp.is_active = true
      WHERE u."isActive" = true
        AND dp.id IS NULL
      ORDER BY up."lastName", up."firstName"
      LIMIT 5
    `);

    if (studentsResult.rows.length === 0) {
      console.log('❌ No se encontraron estudiantes sin perfiles DUA');
      return;
    }

    console.log(`👥 Estudiantes encontrados: ${studentsResult.rows.length}`);

    // 3. Crear perfiles DUA de ejemplo
    const duaProfiles = [
      {
        studentId: studentsResult.rows[0]?.id,
        educationalNeeds: ['DYSLEXIA'],
        supportLevel: 'MEDIUM',
        representationPreferences: {
          visualPreferred: true,
          needsVisualSupports: true,
          needsSimplifiedText: true,
          preferredFontSize: 14,
          needsColorCoding: true
        },
        expressionPreferences: {
          preferredResponseFormat: 'oral',
          needsExtendedTime: true,
          timeExtensionFactor: 1.5,
          needsAlternativeAssessment: true
        },
        engagementPreferences: {
          needsFrequentFeedback: true,
          preferredGroupSize: 'small',
          needsAnxietySupport: true
        }
      },
      {
        studentId: studentsResult.rows[1]?.id,
        educationalNeeds: ['ADHD'],
        supportLevel: 'HIGH',
        representationPreferences: {
          kinestheticPreferred: true,
          needsVisualSupports: true,
          needsColorCoding: true
        },
        expressionPreferences: {
          preferredResponseFormat: 'mixed',
          needsExtendedTime: false
        },
        engagementPreferences: {
          needsFrequentFeedback: true,
          preferredGroupSize: 'small',
          needsMovementBreaks: true
        }
      },
      {
        studentId: studentsResult.rows[2]?.id,
        educationalNeeds: ['HIGH_ABILITIES'],
        supportLevel: 'LOW',
        representationPreferences: {
          needsVisualSupports: false
        },
        expressionPreferences: {
          preferredResponseFormat: 'written',
          preferredOutputTools: ['digital_tools', 'research_projects']
        },
        engagementPreferences: {
          needsFrequentFeedback: false,
          preferredGroupSize: 'individual'
        }
      }
    ];

    // 4. Insertar perfiles DUA
    console.log('🔄 Creando perfiles DUA...');
    const createdProfiles = [];

    for (let i = 0; i < duaProfiles.length && i < studentsResult.rows.length; i++) {
      const profile = duaProfiles[i];
      if (!profile.studentId) continue;

      const profileId = uuidv4();
      const student = studentsResult.rows[i];

      await client.query(`
        INSERT INTO dua_profiles (
          id, student_id, evaluated_by, assessment_date, is_active,
          barriers_identified, strengths, challenges, goals,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        )
      `, [
        profileId,
        profile.studentId,
        teacher.user_id,
        new Date(),
        true,
        profile.educationalNeeds,
        ['Comprensión visual', 'Trabajo en equipo'],
        ['Concentración sostenida', 'Procesamiento auditivo'],
        ['Mejorar autonomía en tareas', 'Desarrollar estrategias de estudio'],
        new Date(),
        new Date()
      ]);

      createdProfiles.push({ id: profileId, studentId: profile.studentId, studentName: `${student.firstName} ${student.lastName}` });
      console.log(`✅ Perfil DUA creado para ${student.firstName} ${student.lastName}`);
    }

    // 5. Crear acomodaciones de ejemplo
    console.log('🔄 Creando acomodaciones...');
    
    const accommodationTemplates = [
      {
        title: 'Texto Ampliado',
        type: 'PRESENTATION',
        description: 'Incrementar el tamaño de fuente a 14pt para facilitar la lectura',
        status: 'IMPLEMENTED'
      },
      {
        title: 'Tiempo Extendido',
        type: 'TIMING',
        description: 'Proporcionar 50% más tiempo en exámenes y evaluaciones',
        status: 'APPROVED'
      },
      {
        title: 'Respuesta Oral',
        type: 'RESPONSE',
        description: 'Permitir respuestas orales en lugar de escritas cuando sea apropiado',
        status: 'PENDING'
      },
      {
        title: 'Ambiente Silencioso',
        type: 'SETTING',
        description: 'Proporcionar un ambiente libre de distracciones auditivas',
        status: 'IMPLEMENTED'
      },
      {
        title: 'Tecnología Asistida',
        type: 'ASSISTIVE_TECHNOLOGY',
        description: 'Uso de herramientas tecnológicas para apoyo al aprendizaje',
        status: 'APPROVED'
      }
    ];

    for (let i = 0; i < createdProfiles.length; i++) {
      const profile = createdProfiles[i];
      
      // Crear 2-3 acomodaciones por perfil
      const numAccommodations = Math.floor(Math.random() * 2) + 2; // 2-3 acomodaciones
      
      for (let j = 0; j < numAccommodations && j < accommodationTemplates.length; j++) {
        const accommodation = accommodationTemplates[j];
        const accommodationId = uuidv4();

        await client.query(`
          INSERT INTO dua_accommodations (
            id, student_id, requested_by, title, type, description, status,
            start_date, is_active, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
          )
        `, [
          accommodationId,
          profile.studentId,
          teacher.user_id,
          accommodation.title,
          accommodation.type,
          accommodation.description,
          accommodation.status,
          new Date(),
          true,
          new Date(),
          new Date()
        ]);

        console.log(`✅ Acomodación "${accommodation.title}" creada para ${profile.studentName}`);

        // 6. Crear registros de efectividad para acomodaciones implementadas
        if (accommodation.status === 'IMPLEMENTED') {
          const effectivenessId = uuidv4();
          const effectivenessRating = Math.floor(Math.random() * 3) + 3; // Entre 3 y 5

          await client.query(`
            INSERT INTO accommodation_effectiveness (
              id, accommodation_id, evaluated_by, effectiveness_rating,
              evaluation_date, teacher_feedback, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8
            )
          `, [
            effectivenessId,
            accommodationId,
            teacher.user_id,
            effectivenessRating,
            new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Últimos 30 días
            `Evaluación de efectividad para ${accommodation.title}. Mejora notable en el rendimiento del estudiante.`,
            new Date(),
            new Date()
          ]);

          console.log(`✅ Evaluación de efectividad creada para "${accommodation.title}"`);
        }
      }
    }

    console.log('\n🎉 ¡Datos de ejemplo del sistema DUA creados exitosamente!');
    console.log(`📊 Resumen:`);
    console.log(`   • Perfiles DUA: ${createdProfiles.length}`);
    console.log(`   • Acomodaciones: ${createdProfiles.length * 2}-${createdProfiles.length * 3}`);
    console.log(`   • Evaluaciones de efectividad: Creadas para acomodaciones implementadas`);
    console.log('\n💡 Ahora puedes probar el Dashboard DUA con datos reales');

  } catch (error) {
    console.error('❌ Error creando datos de ejemplo:', error);
  } finally {
    await client.end();
  }
}

// Ejecutar script
if (require.main === module) {
  createDuaTestData()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el script:', error);
      process.exit(1);
    });
}

module.exports = { createDuaTestData };