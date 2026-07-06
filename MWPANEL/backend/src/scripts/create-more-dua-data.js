/**
 * @script: create-more-dua-data.js
 * @description: Script para crear más datos de ejemplo del sistema DUA para gráficos
 * @usage: node src/scripts/create-more-dua-data.js
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

async function createMoreDuaData() {
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
      console.log('❌ No se encontró el profesor de prueba');
      return;
    }

    const teacher = teacherResult.rows[0];
    console.log(`👨‍🏫 Profesor encontrado: ${teacher.user_id}`);

    // 2. Obtener estudiantes existentes con perfiles DUA
    const studentsWithProfilesResult = await client.query(`
      SELECT DISTINCT s.id, s."enrollmentNumber", up."firstName", up."lastName"
      FROM students s
      INNER JOIN users u ON s."userId" = u.id
      INNER JOIN user_profiles up ON u.id = up."userId"
      INNER JOIN dua_profiles dp ON s.id = dp.student_id AND dp.is_active = true
      WHERE u."isActive" = true
      ORDER BY up."lastName", up."firstName"
    `);

    if (studentsWithProfilesResult.rows.length === 0) {
      console.log('❌ No se encontraron estudiantes con perfiles DUA');
      return;
    }

    console.log(`👥 Estudiantes con perfiles DUA: ${studentsWithProfilesResult.rows.length}`);

    // 3. Crear más acomodaciones con fechas variadas (últimos 6 meses)
    console.log('🔄 Creando acomodaciones adicionales con fechas variadas...');
    
    const moreAccommodationTemplates = [
      {
        title: 'Material Visual Adicional',
        type: 'PRESENTATION',
        description: 'Proporcionar mapas conceptuales y organizadores gráficos',
        status: 'IMPLEMENTED'
      },
      {
        title: 'Evaluación Parcial',
        type: 'TIMING',
        description: 'Dividir evaluaciones largas en sesiones más cortas',
        status: 'APPROVED'
      },
      {
        title: 'Herramientas Digitales',
        type: 'ASSISTIVE_TECHNOLOGY',
        description: 'Uso de tablet o software especializado para escritura',
        status: 'IMPLEMENTED'
      },
      {
        title: 'Espacio de Trabajo Organizado',
        type: 'SETTING',
        description: 'Mesa despejada y ubicación estratégica en el aula',
        status: 'IMPLEMENTED'
      },
      {
        title: 'Instrucciones Simplificadas',
        type: 'PRESENTATION',
        description: 'Fraccionar las instrucciones en pasos más pequeños',
        status: 'APPROVED'
      },
      {
        title: 'Retroalimentación Inmediata',
        type: 'RESPONSE',
        description: 'Feedback constante durante la realización de tareas',
        status: 'IMPLEMENTED'
      },
      {
        title: 'Materiales Manipulativos',
        type: 'PRESENTATION',
        description: 'Uso de objetos físicos para conceptos abstractos',
        status: 'PENDING'
      },
      {
        title: 'Reducción de Estímulos',
        type: 'SETTING',
        description: 'Minimizar distractores visuales y auditivos',
        status: 'APPROVED'
      }
    ];

    const createdAccommodations = [];

    // Crear 2-3 acomodaciones adicionales por estudiante
    for (let i = 0; i < studentsWithProfilesResult.rows.length; i++) {
      const student = studentsWithProfilesResult.rows[i];
      
      // Crear 2-3 acomodaciones por estudiante
      const numAccommodations = Math.floor(Math.random() * 2) + 2;
      
      for (let j = 0; j < numAccommodations && j < moreAccommodationTemplates.length; j++) {
        const accommodationIndex = (i * 3 + j) % moreAccommodationTemplates.length;
        const accommodation = moreAccommodationTemplates[accommodationIndex];
        const accommodationId = uuidv4();

        // Crear fechas variadas en los últimos 6 meses
        const daysAgo = Math.floor(Math.random() * 180); // 0-180 días
        const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

        await client.query(`
          INSERT INTO dua_accommodations (
            id, student_id, requested_by, title, type, description, status,
            start_date, is_active, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
          )
        `, [
          accommodationId,
          student.id,
          teacher.user_id,
          accommodation.title,
          accommodation.type,
          accommodation.description,
          accommodation.status,
          createdAt,
          true,
          createdAt,
          createdAt
        ]);

        createdAccommodations.push({
          id: accommodationId,
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          title: accommodation.title,
          status: accommodation.status,
          createdAt: createdAt
        });

        console.log(`✅ Acomodación "${accommodation.title}" creada para ${student.firstName} ${student.lastName} (${daysAgo} días atrás)`);

        // 4. Crear evaluaciones de efectividad para acomodaciones implementadas
        if (accommodation.status === 'IMPLEMENTED') {
          const effectivenessId = uuidv4();
          const effectivenessRating = Math.floor(Math.random() * 3) + 3; // Entre 3 y 5

          // Evaluación entre 1-30 días después de crear la acomodación
          const evaluationDaysAfter = Math.floor(Math.random() * 30) + 1;
          const evaluationDate = new Date(createdAt.getTime() + evaluationDaysAfter * 24 * 60 * 60 * 1000);

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
            evaluationDate,
            `Evaluación de ${accommodation.title}. Rating: ${effectivenessRating}/5. ${
              effectivenessRating >= 4 ? 'Muy efectiva, continuar aplicando.' : 
              effectivenessRating >= 3 ? 'Efectiva con ajustes menores.' : 
              'Requiere modificaciones significativas.'
            }`,
            evaluationDate,
            evaluationDate
          ]);

          console.log(`✅ Evaluación de efectividad creada para "${accommodation.title}" (Rating: ${effectivenessRating}/5)`);
        }
      }
    }

    // 5. Crear evaluaciones adicionales para acomodaciones existentes
    console.log('🔄 Creando evaluaciones adicionales para acomodaciones existentes...');
    
    const existingAccommodationsResult = await client.query(`
      SELECT id, title, student_id, created_at
      FROM dua_accommodations 
      WHERE status = 'IMPLEMENTED' 
      AND is_active = true
      AND id NOT IN (SELECT accommodation_id FROM accommodation_effectiveness)
      LIMIT 10
    `);

    for (const accommodation of existingAccommodationsResult.rows) {
      const effectivenessId = uuidv4();
      const effectivenessRating = Math.floor(Math.random() * 3) + 3; // Entre 3 y 5
      
      // Evaluación entre 1-60 días después de crear la acomodación
      const evaluationDaysAfter = Math.floor(Math.random() * 60) + 1;
      const evaluationDate = new Date(accommodation.created_at.getTime() + evaluationDaysAfter * 24 * 60 * 60 * 1000);

      await client.query(`
        INSERT INTO accommodation_effectiveness (
          id, accommodation_id, evaluated_by, effectiveness_rating,
          evaluation_date, teacher_feedback, student_feedback, evidence,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
      `, [
        effectivenessId,
        accommodation.id,
        teacher.user_id,
        effectivenessRating,
        evaluationDate,
        `Evaluación de seguimiento de ${accommodation.title}. Se observa ${
          effectivenessRating >= 4 ? 'mejora significativa' : 
          effectivenessRating >= 3 ? 'progreso moderado' : 
          'necesidad de ajustes'
        } en el rendimiento del estudiante.`,
        effectivenessRating >= 4 ? 'Me siento más cómodo/a con esta ayuda' : 
        effectivenessRating >= 3 ? 'Me ayuda bastante' : 
        'Necesito algo diferente',
        effectivenessRating >= 4 ? 'Participación activa en clase, mejores resultados en evaluaciones' : 
        effectivenessRating >= 3 ? 'Mejora gradual en comprensión' : 
        'Requiere estrategias adicionales',
        evaluationDate,
        evaluationDate
      ]);

      console.log(`✅ Evaluación adicional creada para "${accommodation.title}" (Rating: ${effectivenessRating}/5)`);
    }

    console.log('\n🎉 ¡Datos adicionales del sistema DUA creados exitosamente!');
    console.log(`📊 Resumen:`);
    console.log(`   • Acomodaciones adicionales: ${createdAccommodations.length}`);
    console.log(`   • Evaluaciones de efectividad adicionales: ${createdAccommodations.filter(a => a.status === 'IMPLEMENTED').length + existingAccommodationsResult.rows.length}`);
    console.log(`   • Rango de fechas: Últimos 6 meses`);
    console.log(`   • Tipos de acomodaciones: PRESENTATION, TIMING, SETTING, RESPONSE, ASSISTIVE_TECHNOLOGY`);
    console.log('\n💡 Ahora los gráficos del Dashboard DUA tendrán datos suficientes para mostrar');

  } catch (error) {
    console.error('❌ Error creando datos adicionales:', error);
  } finally {
    await client.end();
  }
}

// Ejecutar script
if (require.main === module) {
  createMoreDuaData()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el script:', error);
      process.exit(1);
    });
}

module.exports = { createMoreDuaData };