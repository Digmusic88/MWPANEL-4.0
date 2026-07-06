/**
 * @archivo: 1753100000000-CreateCentralizedGradesSystem.ts
 * @módulo: Database Migrations
 * @función: Migración para sistema centralizado de calificaciones
 * @crítico: SÍ - Sistema neurálgico de evaluación docente
 * @actualizado: Julio 2025 - Centralización de valoraciones
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCentralizedGradesSystem1753100000000 implements MigrationInterface {
  name = 'CreateCentralizedGradesSystem1753100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ejecutar el script SQL completo que ya funcionó
    await queryRunner.query(`
      -- Crear ENUMs necesarios
      DO $$ BEGIN
          CREATE TYPE grade_scale_enum AS ENUM (
              'numeric_0_10',
              'numeric_0_100', 
              'competency_1_5',
              'emoji',
              'rubric_based',
              'pass_fail'
          );
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
          CREATE TYPE rounding_policy_enum AS ENUM (
              'no_rounding',
              'round_half_up',
              'round_up',
              'round_down',
              'round_nearest'
          );
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
          CREATE TYPE grade_period_enum AS ENUM (
              'first_trimester',
              'second_trimester',
              'third_trimester',
              'annual',
              'continuous'
          );
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
          CREATE TYPE grade_status_enum AS ENUM (
              'draft',
              'provisional',
              'final',
              'archived'
          );
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      -- Crear tabla de configuraciones de calificación
      CREATE TABLE IF NOT EXISTS grade_configurations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          teacher_id UUID NOT NULL,
          subject_id UUID NOT NULL,
          course_id UUID NULL,
          educational_level_id UUID NOT NULL,
          weight_configuration JSONB NOT NULL,
          default_scale grade_scale_enum DEFAULT 'numeric_0_10',
          rounding_policy rounding_policy_enum DEFAULT 'round_half_up',
          passing_grade DECIMAL(3,1) DEFAULT 5.0,
          minimum_grade DECIMAL(3,1) DEFAULT 0.0,
          maximum_grade DECIMAL(3,1) DEFAULT 10.0,
          use_academic_periods BOOLEAN DEFAULT true,
          academic_periods TEXT[] DEFAULT ARRAY['Primer Trimestre', 'Segundo Trimestre', 'Tercer Trimestre'],
          notify_grade_updates BOOLEAN DEFAULT true,
          notify_families BOOLEAN DEFAULT true,
          require_justification_below_passing BOOLEAN DEFAULT false,
          enable_ai_assessments BOOLEAN DEFAULT false,
          ai_assessment_weight DECIMAL(3,2) DEFAULT 0.10,
          ai_auto_approve BOOLEAN DEFAULT false,
          include_in_reports BOOLEAN DEFAULT true,
          allow_family_access BOOLEAN DEFAULT true,
          show_detailed_breakdown BOOLEAN DEFAULT false,
          custom_settings JSONB NULL,
          is_active BOOLEAN DEFAULT true,
          notes TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Crear tabla de calificaciones centralizadas
      CREATE TABLE IF NOT EXISTS centralized_grades (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          student_id UUID NOT NULL,
          teacher_id UUID NOT NULL,
          subject_id UUID NOT NULL,
          subject_assignment_id UUID NOT NULL,
          grade_configuration_id UUID NOT NULL,
          period grade_period_enum DEFAULT 'continuous',
          period_start_date DATE NULL,
          period_end_date DATE NULL,
          status grade_status_enum DEFAULT 'draft',
          final_grade DECIMAL(5,2) NOT NULL,
          previous_grade DECIMAL(5,2) NULL,
          predicted_grade DECIMAL(5,2) NULL,
          breakdown JSONB NOT NULL,
          metrics JSONB NOT NULL,
          ai_insights JSONB NULL,
          teacher_comments TEXT NULL,
          internal_notes TEXT NULL,
          audit_trail JSONB NOT NULL,
          visible_to_student BOOLEAN DEFAULT true,
          visible_to_family BOOLEAN DEFAULT true,
          include_in_transcript BOOLEAN DEFAULT false,
          last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_published TIMESTAMP NULL,
          last_modified TIMESTAMP NULL,
          needs_recalculation BOOLEAN DEFAULT false,
          data_source_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
          data_integrity DECIMAL(3,2) DEFAULT 1.0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Crear índices optimizados
      CREATE INDEX IF NOT EXISTS idx_grade_config_teacher_subject 
      ON grade_configurations(teacher_id, subject_id);

      CREATE INDEX IF NOT EXISTS idx_grade_config_course_level 
      ON grade_configurations(course_id, educational_level_id);

      CREATE INDEX IF NOT EXISTS idx_centralized_grades_student_period 
      ON centralized_grades(student_id, period);

      CREATE INDEX IF NOT EXISTS idx_centralized_grades_subject_assignment_period 
      ON centralized_grades(subject_assignment_id, period);

      CREATE INDEX IF NOT EXISTS idx_centralized_grades_status_period 
      ON centralized_grades(status, period);

      CREATE INDEX IF NOT EXISTS idx_centralized_grades_final_grade 
      ON centralized_grades(final_grade);

      CREATE INDEX IF NOT EXISTS idx_centralized_grades_updated_at 
      ON centralized_grades(updated_at);

      -- Crear constraint único para prevenir duplicados
      CREATE UNIQUE INDEX IF NOT EXISTS unique_grade_config_per_teacher_subject_course_level 
      ON grade_configurations(teacher_id, subject_id, course_id, educational_level_id);

      CREATE UNIQUE INDEX IF NOT EXISTS unique_centralized_grade_per_student_assignment_period 
      ON centralized_grades(student_id, subject_assignment_id, period);

      -- Crear función para updated_at automático
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Crear triggers para updated_at
      DROP TRIGGER IF EXISTS update_grade_configurations_updated_at ON grade_configurations;
      CREATE TRIGGER update_grade_configurations_updated_at 
      BEFORE UPDATE ON grade_configurations 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_centralized_grades_updated_at ON centralized_grades;
      CREATE TRIGGER update_centralized_grades_updated_at 
      BEFORE UPDATE ON centralized_grades 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      -- Crear comentarios en las tablas
      COMMENT ON TABLE grade_configurations IS 'Configuraciones de ponderaciones y políticas de calificación por profesor, materia y curso';
      COMMENT ON TABLE centralized_grades IS 'Calificaciones centralizadas que agregan todas las fuentes de evaluación del sistema';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar triggers
    await queryRunner.query('DROP TRIGGER IF EXISTS update_centralized_grades_updated_at ON centralized_grades');
    await queryRunner.query('DROP TRIGGER IF EXISTS update_grade_configurations_updated_at ON grade_configurations');
    await queryRunner.query('DROP FUNCTION IF EXISTS update_updated_at_column()');

    // Eliminar tablas
    await queryRunner.query('DROP TABLE IF EXISTS centralized_grades');
    await queryRunner.query('DROP TABLE IF EXISTS grade_configurations');

    // Eliminar ENUMs
    await queryRunner.query('DROP TYPE IF EXISTS grade_status_enum');
    await queryRunner.query('DROP TYPE IF EXISTS grade_period_enum');
    await queryRunner.query('DROP TYPE IF EXISTS rounding_policy_enum');
    await queryRunner.query('DROP TYPE IF EXISTS grade_scale_enum');
  }
}