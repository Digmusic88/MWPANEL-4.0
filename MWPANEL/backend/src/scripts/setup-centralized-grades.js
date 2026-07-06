/**
 * Script para configurar el sistema de calificaciones centralizadas
 * Crea configuraciones por defecto y calcula las calificaciones iniciales
 */

const { DataSource } = require('typeorm');
const path = require('path');

// Configuración de la base de datos
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT) || 5432,
  username: process.env.DATABASE_USERNAME || 'mwpanel',
  password: process.env.DATABASE_PASSWORD || 'mwpanel123',
  database: process.env.DATABASE_NAME || 'mwpanel',
  synchronize: false,
  logging: false,
});

// Configuración estándar española por nivel educativo
const DEFAULT_WEIGHT_CONFIGURATIONS = {
  // Infantil: Más enfoque en observación y juego
  'infantil': {
    TASKS: { enabled: true, weight: 20, minimumItems: 2 },
    ACTIVITIES: { enabled: true, weight: 50, minimumItems: 3 },
    EVALUATIONS: { enabled: true, weight: 30, minimumItems: 1 },
    RUBRICS: { enabled: false, weight: 0, minimumItems: 0 }
  },
  // Primaria: Balance entre tareas y evaluación competencial
  'primaria': {
    TASKS: { enabled: true, weight: 40, minimumItems: 3 },
    ACTIVITIES: { enabled: true, weight: 25, minimumItems: 2 },
    EVALUATIONS: { enabled: true, weight: 30, minimumItems: 2 },
    RUBRICS: { enabled: true, weight: 5, minimumItems: 0 }
  },
  // Secundaria: Más peso en tareas y evaluaciones formales
  'secundaria': {
    TASKS: { enabled: true, weight: 50, minimumItems: 4 },
    ACTIVITIES: { enabled: true, weight: 20, minimumItems: 2 },
    EVALUATIONS: { enabled: true, weight: 25, minimumItems: 3 },
    RUBRICS: { enabled: true, weight: 5, minimumItems: 0 }
  },
  // Por defecto: Configuración equilibrada
  'default': {
    TASKS: { enabled: true, weight: 40, minimumItems: 3 },
    ACTIVITIES: { enabled: true, weight: 20, minimumItems: 2 },
    EVALUATIONS: { enabled: true, weight: 30, minimumItems: 2 },
    RUBRICS: { enabled: true, weight: 10, minimumItems: 0 }
  }
};

async function setupCentralizedGrades() {
  try {
    console.log('🚀 Iniciando configuración del sistema de calificaciones centralizadas...');
    
    await dataSource.initialize();
    console.log('✅ Conexión a base de datos establecida');

    // 1. Obtener todas las asignaciones de profesores
    const teacherAssignments = await dataSource.query(`
      SELECT 
          t.id as teacher_id,
          u.email,
          p."firstName" || ' ' || p."lastName" as teacher_name,
          sa.id as subject_assignment_id,
          s.id as subject_id,
          s.name as subject_name,
          cg.id as class_group_id,
          cg.name as class_group_name,
          el.id as educational_level_id,
          el.name as educational_level_name
      FROM teachers t
      JOIN users u ON t."userId" = u.id
      JOIN user_profiles p ON u.id = p."userId"
      JOIN subject_assignments sa ON t."teacherId" = t.id
      JOIN subjects s ON sa."subjectId" = s.id
      JOIN class_groups cg ON sa."classGroupId" = cg.id
      LEFT JOIN educational_levels el ON s."courseId" IN (
          SELECT id FROM courses WHERE "educationalLevelId" = el.id
      )
      ORDER BY teacher_name, subject_name
    `);

    console.log(`📊 Encontradas ${teacherAssignments.length} asignaciones de profesores`);

    // 2. Verificar configuraciones existentes
    const existingConfigs = await dataSource.query(`
      SELECT COUNT(*) as count FROM grade_configurations
    `);

    if (existingConfigs[0].count > 0) {
      console.log(`⚠️ Ya existen ${existingConfigs[0].count} configuraciones. ¿Continuar? (Se crearán solo las faltantes)`);
    }

    // 3. Crear configuraciones por defecto para cada asignación
    let configsCreated = 0;
    let configsSkipped = 0;

    for (const assignment of teacherAssignments) {
      // Verificar si ya existe configuración para esta combinación
      const existing = await dataSource.query(`
        SELECT id FROM grade_configurations 
        WHERE "teacherId" = $1 AND "subjectId" = $2
      `, [assignment.teacher_id, assignment.subject_id]);

      if (existing.length > 0) {
        configsSkipped++;
        continue;
      }

      // Determinar configuración según nivel educativo
      const levelName = assignment.educational_level_name?.toLowerCase() || 'default';
      let weightConfig = DEFAULT_WEIGHT_CONFIGURATIONS.default;
      
      if (levelName.includes('infantil')) {
        weightConfig = DEFAULT_WEIGHT_CONFIGURATIONS.infantil;
      } else if (levelName.includes('primaria')) {
        weightConfig = DEFAULT_WEIGHT_CONFIGURATIONS.primaria;
      } else if (levelName.includes('secundaria')) {
        weightConfig = DEFAULT_WEIGHT_CONFIGURATIONS.secundaria;
      }

      // Crear configuración
      await dataSource.query(`
        INSERT INTO grade_configurations (
          "teacherId",
          "subjectId",
          "courseId",
          "educationalLevelId",
          "weightConfiguration",
          "defaultScale",
          "roundingPolicy",
          "passingGrade",
          "minimumGrade",
          "maximumGrade",
          "useAcademicPeriods",
          "academicPeriods",
          "notifyGradeUpdates",
          "notifyFamilies",
          "requireJustificationBelowPassing",
          "enableAIAssessments",
          "aiAssessmentWeight",
          "aiAutoApprove",
          "includeInReports",
          "allowFamilyAccess",
          "showDetailedBreakdown",
          "isActive",
          "notes",
          "createdAt",
          "updatedAt"
        ) VALUES (
          $1, $2, NULL, $3, $4, 'numeric_0_10', 'round_half_up', 5.0, 0.0, 10.0,
          true, ARRAY['Primer Trimestre', 'Segundo Trimestre', 'Tercer Trimestre'],
          true, true, false, false, 0.10, false, true, true, false, true,
          'Configuración automática generada por el sistema',
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `, [
        assignment.teacher_id,
        assignment.subject_id,
        assignment.educational_level_id,
        JSON.stringify(weightConfig)
      ]);

      configsCreated++;
      console.log(`✅ Configuración creada para ${assignment.teacher_name} - ${assignment.subject_name}`);
    }

    console.log(`📋 Resumen configuraciones:`);
    console.log(`   ✅ Creadas: ${configsCreated}`);
    console.log(`   ⏭️ Saltadas (ya existían): ${configsSkipped}`);

    // 4. Obtener estudiantes con datos para calcular calificaciones
    const studentsWithGrades = await dataSource.query(`
      SELECT DISTINCT 
          s.id as student_id,
          sa.id as subject_assignment_id,
          sa."teacherId" as teacher_id,
          sa."subjectId" as subject_id
      FROM students s
      JOIN class_students cs ON s.id = cs."studentId"
      JOIN class_groups cg ON cs."classId" = cg.id
      JOIN subject_assignments sa ON cg.id = sa."classGroupId"
      WHERE EXISTS (
          SELECT 1 FROM task_submissions ts 
          JOIN tasks t ON ts."taskId" = t.id 
          WHERE ts."studentId" = s.id 
            AND t."subjectAssignmentId" = sa.id 
            AND ts."finalGrade" IS NOT NULL
      ) OR EXISTS (
          SELECT 1 FROM activity_assessments aa
          JOIN activities a ON aa."activityId" = a.id
          WHERE aa."studentId" = s.id
            AND a."subjectAssignmentId" = sa.id
            AND aa.value IS NOT NULL
      ) OR EXISTS (
          SELECT 1 FROM competency_evaluations ce
          JOIN evaluations e ON ce."evaluationId" = e.id
          WHERE e."studentId" = s.id
            AND ce.score IS NOT NULL
      )
      ORDER BY student_id, subject_assignment_id
    `);

    console.log(`🎯 Encontrados ${studentsWithGrades.length} estudiantes con datos para calcular calificaciones`);

    // 5. Activar el endpoint de cálculo masivo
    // Como no tenemos acceso directo al servicio NestJS desde aquí,
    // mostraremos las instrucciones para hacerlo vía API

    console.log('\n🔧 SIGUIENTE PASO: Ejecutar cálculo de calificaciones centralizadas');
    console.log('   Ejecuta este comando desde otra terminal:');
    console.log('\n   curl -X POST https://plataforma.mundoworld.school/api/centralized-grades/calculate/bulk \\');
    console.log('        -H "Content-Type: application/json" \\');
    console.log('        -H "Authorization: Bearer YOUR_JWT_TOKEN" \\');
    console.log('        -d \'{"subjectAssignmentId": "dde4771b-9d1b-4161-a79d-577f915928e4", "includeAI": false}\'');
    console.log('\n   (Repite para cada subject_assignment_id encontrado)');
    
    // También podemos crear un endpoint específico para inicialización
    console.log('\n📊 IDs de asignaciones para calcular:');
    const uniqueAssignments = [...new Set(studentsWithGrades.map(s => s.subject_assignment_id))];
    uniqueAssignments.forEach(id => {
      console.log(`   - ${id}`);
    });

    await dataSource.destroy();
    console.log('\n✅ Configuración inicial completada exitosamente');
    console.log('🎯 Estado: Sistema listo para calcular calificaciones centralizadas');

  } catch (error) {
    console.error('❌ Error configurando sistema de calificaciones centralizadas:', error);
    process.exit(1);
  }
}

// Ejecutar script
setupCentralizedGrades();