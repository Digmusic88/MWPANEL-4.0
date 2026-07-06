import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExamGradeEvaluationTypes1753330500000 implements MigrationInterface {
  name = 'AddExamGradeEvaluationTypes1753330500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar columna para calificación por emoji
    await queryRunner.query(`
      ALTER TABLE "exam_grades" 
      ADD COLUMN "emoji_grade" VARCHAR(10) NULL
    `);

    // Agregar comentario para emoji_grade
    await queryRunner.query(`
      COMMENT ON COLUMN "exam_grades"."emoji_grade" IS 'Calificación con emoji: 😊 (Muy Bien), 😐 (Bien), 😞 (Regular)'
    `);

    // Agregar columna para puntuaciones de rúbrica
    await queryRunner.query(`
      ALTER TABLE "exam_grades" 
      ADD COLUMN "rubric_scores" JSON NULL
    `);

    // Agregar comentario para rubric_scores
    await queryRunner.query(`
      COMMENT ON COLUMN "exam_grades"."rubric_scores" IS 'Puntuaciones detalladas por criterio de rúbrica en formato JSON'
    `);

    // Hacer que numeric_grade pueda ser nullable para evaluaciones por emoji/rúbrica
    await queryRunner.query(`
      ALTER TABLE "exam_grades" 
      ALTER COLUMN "numeric_grade" DROP NOT NULL
    `);

    console.log('✅ Migration AddExamGradeEvaluationTypes executed successfully');
    console.log('✅ Added emoji_grade column to exam_grades table');
    console.log('✅ Added rubric_scores column to exam_grades table');
    console.log('✅ Made numeric_grade nullable for alternative evaluation types');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restaurar numeric_grade como NOT NULL
    await queryRunner.query(`
      UPDATE "exam_grades" SET "numeric_grade" = 0 WHERE "numeric_grade" IS NULL
    `);
    
    await queryRunner.query(`
      ALTER TABLE "exam_grades" 
      ALTER COLUMN "numeric_grade" SET NOT NULL
    `);

    // Eliminar las nuevas columnas
    await queryRunner.query(`ALTER TABLE "exam_grades" DROP COLUMN "rubric_scores"`);
    await queryRunner.query(`ALTER TABLE "exam_grades" DROP COLUMN "emoji_grade"`);

    console.log('✅ Migration AddExamGradeEvaluationTypes reverted successfully');
  }
}