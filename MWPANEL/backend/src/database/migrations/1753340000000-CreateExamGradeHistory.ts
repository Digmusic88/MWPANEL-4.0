import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExamGradeHistory1753340000000 implements MigrationInterface {
  name = 'CreateExamGradeHistory1753340000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla de historial de calificaciones de exámenes
    await queryRunner.query(`
      CREATE TABLE "exam_grade_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "task_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "graded_by_teacher_id" uuid NOT NULL,
        "numeric_grade" decimal(5,2),
        "letter_grade" character varying(5),
        "grade_scale" character varying(10),
        "comments" text,
        "attendance_status" character varying(20) DEFAULT 'present',
        "metadata" json,
        "emoji_grade" character varying(20),
        "rubric_scores" json,
        "action_type" character varying(20) NOT NULL DEFAULT 'created',
        "graded_at" timestamp with time zone NOT NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exam_grade_history" PRIMARY KEY ("id")
      )
    `);

    // Índices para mejorar performance en consultas de historial
    await queryRunner.query(`
      CREATE INDEX "IDX_exam_grade_history_task_student" 
      ON "exam_grade_history" ("task_id", "student_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_exam_grade_history_created_at" 
      ON "exam_grade_history" ("created_at")
    `);

    // Foreign keys
    await queryRunner.query(`
      ALTER TABLE "exam_grade_history" 
      ADD CONSTRAINT "FK_exam_grade_history_task" 
      FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "exam_grade_history" 
      ADD CONSTRAINT "FK_exam_grade_history_student" 
      FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "exam_grade_history" 
      ADD CONSTRAINT "FK_exam_grade_history_teacher" 
      FOREIGN KEY ("graded_by_teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE
    `);

    // Trigger para insertar automáticamente en historial cuando se crea/actualiza una calificación
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION insert_exam_grade_history()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Insertar en historial cuando se crea una nueva calificación
        IF TG_OP = 'INSERT' THEN
          INSERT INTO exam_grade_history (
            task_id, student_id, graded_by_teacher_id,
            numeric_grade, letter_grade, grade_scale, comments,
            attendance_status, metadata, emoji_grade, rubric_scores,
            action_type, graded_at, created_at
          ) VALUES (
            NEW.task_id, NEW.student_id, NEW.graded_by_teacher_id,
            NEW.numeric_grade, NEW.letter_grade, NEW.grade_scale, NEW.comments,
            NEW.attendance_status, NEW.metadata, NEW.emoji_grade, NEW.rubric_scores,
            'created', NEW.graded_at, NEW.created_at
          );
          RETURN NEW;
        END IF;

        -- Insertar en historial cuando se actualiza una calificación
        IF TG_OP = 'UPDATE' THEN
          INSERT INTO exam_grade_history (
            task_id, student_id, graded_by_teacher_id,
            numeric_grade, letter_grade, grade_scale, comments,
            attendance_status, metadata, emoji_grade, rubric_scores,
            action_type, graded_at, created_at
          ) VALUES (
            NEW.task_id, NEW.student_id, NEW.graded_by_teacher_id,
            NEW.numeric_grade, NEW.letter_grade, NEW.grade_scale, NEW.comments,
            NEW.attendance_status, NEW.metadata, NEW.emoji_grade, NEW.rubric_scores,
            'updated', NEW.graded_at, now()
          );
          RETURN NEW;
        END IF;

        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Crear trigger en la tabla exam_grades
    await queryRunner.query(`
      CREATE TRIGGER exam_grade_history_trigger
      AFTER INSERT OR UPDATE ON exam_grades
      FOR EACH ROW
      EXECUTE FUNCTION insert_exam_grade_history();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar trigger y función
    await queryRunner.query(`DROP TRIGGER IF EXISTS exam_grade_history_trigger ON exam_grades`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS insert_exam_grade_history()`);
    
    // Eliminar tabla
    await queryRunner.query(`DROP TABLE "exam_grade_history"`);
  }
}