import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateExamGradesSystem1753800000000 implements MigrationInterface {
  name = 'CreateExamGradesSystem1753800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla exam_grades
    await queryRunner.createTable(
      new Table({
        name: 'exam_grades',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'task_id',
            type: 'uuid',
            isNullable: false,
            comment: 'ID de la tarea tipo EXAM',
          },
          {
            name: 'student_id',
            type: 'uuid',
            isNullable: false,
            comment: 'ID del estudiante',
          },
          {
            name: 'graded_by_teacher_id',
            type: 'uuid',
            isNullable: false,
            comment: 'ID del profesor que califica',
          },
          {
            name: 'numeric_grade',
            type: 'decimal',
            precision: 4,
            scale: 2,
            isNullable: false,
            comment: 'Calificación numérica (ej: 8.5 para escala 1-10)',
          },
          {
            name: 'letter_grade',
            type: 'varchar',
            length: '10',
            isNullable: true,
            comment: 'Calificación en formato texto (ej: A+, Excelente, etc.)',
          },
          {
            name: 'grade_scale',
            type: 'varchar',
            length: '20',
            default: "'1-10'",
            comment: 'Escala de calificación (1-10, 1-4, A-F, etc.)',
          },
          {
            name: 'comments',
            type: 'text',
            isNullable: true,
            comment: 'Comentarios opcionales del profesor sobre el examen',
          },
          {
            name: 'attendance_status',
            type: 'enum',
            enum: ['present', 'absent', 'justified_absence'],
            default: "'present'",
            comment: 'Estado del estudiante durante el examen',
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
            comment: 'Metadatos adicionales (duración, criterios específicos, etc.)',
          },
          {
            name: 'graded_at',
            type: 'timestamp with time zone',
            isNullable: false,
            comment: 'Fecha específica cuando se realizó la calificación',
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            comment: 'Fecha de creación de la calificación',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            comment: 'Fecha de última modificación',
          },
        ],
        comment: 'Calificaciones de tareas tipo EXAM (Test Yourself)',
      }),
      true
    );

    // Crear índices
    await queryRunner.createIndex(
      'exam_grades',
      new TableIndex({
        name: 'IDX_exam_grades_task_id',
        columnNames: ['task_id'],
      })
    );

    await queryRunner.createIndex(
      'exam_grades',
      new TableIndex({
        name: 'IDX_exam_grades_student_id',
        columnNames: ['student_id'],
      })
    );

    await queryRunner.createIndex(
      'exam_grades',
      new TableIndex({
        name: 'IDX_exam_grades_teacher_id',
        columnNames: ['graded_by_teacher_id'],
      })
    );

    await queryRunner.createIndex(
      'exam_grades',
      new TableIndex({
        name: 'IDX_exam_grades_graded_at',
        columnNames: ['graded_at'],
      })
    );

    await queryRunner.createIndex(
      'exam_grades',
      new TableIndex({
        name: 'IDX_exam_grades_numeric_grade',
        columnNames: ['numeric_grade'],
      })
    );

    await queryRunner.createIndex(
      'exam_grades',
      new TableIndex({
        name: 'IDX_exam_grades_attendance_status',
        columnNames: ['attendance_status'],
      })
    );

    // Índice único para evitar calificaciones duplicadas
    await queryRunner.createIndex(
      'exam_grades',
      new TableIndex({
        name: 'UQ_exam_grades_task_student',
        columnNames: ['task_id', 'student_id'],
        isUnique: true,
      })
    );

    // Crear claves foráneas
    await queryRunner.createForeignKey(
      'exam_grades',
      new TableForeignKey({
        columnNames: ['task_id'],
        referencedTableName: 'tasks',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'exam_grades',
      new TableForeignKey({
        columnNames: ['student_id'],
        referencedTableName: 'students',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'exam_grades',
      new TableForeignKey({
        columnNames: ['graded_by_teacher_id'],
        referencedTableName: 'teachers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    // Crear triggers para updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_exam_grades_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_exam_grades_updated_at
        BEFORE UPDATE ON exam_grades
        FOR EACH ROW
        EXECUTE FUNCTION update_exam_grades_updated_at();
    `);

    // Crear función para validar que la tarea es tipo EXAM
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION validate_exam_task()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM tasks 
          WHERE id = NEW.task_id 
          AND task_type = 'exam'
        ) THEN
          RAISE EXCEPTION 'Solo se pueden crear calificaciones para tareas tipo EXAM (Test Yourself)';
        END IF;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_validate_exam_task
        BEFORE INSERT OR UPDATE ON exam_grades
        FOR EACH ROW
        EXECUTE FUNCTION validate_exam_task();
    `);

    console.log('✅ Migración ExamGradesSystem completada');
    console.log('📋 Tabla exam_grades creada con:');
    console.log('   - Calificaciones numéricas y en texto');
    console.log('   - Control de asistencia (presente/ausente/justificado)');
    console.log('   - Metadatos extensibles');
    console.log('   - Restricción única por tarea-estudiante');
    console.log('   - Validación automática de tareas tipo EXAM');
    console.log('   - Índices optimizados para consultas');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar triggers
    await queryRunner.query('DROP TRIGGER IF EXISTS trigger_validate_exam_task ON exam_grades;');
    await queryRunner.query('DROP TRIGGER IF EXISTS trigger_exam_grades_updated_at ON exam_grades;');
    
    // Eliminar funciones
    await queryRunner.query('DROP FUNCTION IF EXISTS validate_exam_task();');
    await queryRunner.query('DROP FUNCTION IF EXISTS update_exam_grades_updated_at();');

    // Eliminar tabla (las foreign keys se eliminan automáticamente)
    await queryRunner.dropTable('exam_grades');

    console.log('❌ Migración ExamGradesSystem revertida');
    console.log('📋 Tabla exam_grades eliminada');
  }
}