import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskValuationType1753330400000 implements MigrationInterface {
  name = 'AddTaskValuationType1753330400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear el tipo enum para task_valuation_type
    await queryRunner.query(`
      CREATE TYPE "public"."task_valuation_type_enum" AS ENUM('emoji', 'score', 'rubric')
    `);

    // Agregar la columna valuationType a la tabla tasks
    await queryRunner.query(`
      ALTER TABLE "tasks" 
      ADD COLUMN "valuationType" "public"."task_valuation_type_enum" 
      NOT NULL DEFAULT 'score'
    `);

    // Agregar comentario a la columna
    await queryRunner.query(`
      COMMENT ON COLUMN "tasks"."valuationType" IS 'Tipo de evaluación: emoji, score, rubric'
    `);

    // Para tareas existentes de tipo 'exam', establecer valuationType basado en rubricId
    await queryRunner.query(`
      UPDATE "tasks" 
      SET "valuationType" = 'rubric' 
      WHERE "taskType" = 'exam' AND "rubricId" IS NOT NULL
    `);

    // Para tareas existentes de tipo 'exam' sin rúbrica, mantener 'score' por defecto
    console.log('✅ Migration AddTaskValuationType executed successfully');
    console.log('✅ Added valuationType column to tasks table');
    console.log('✅ Updated existing exam tasks with rubrics to use rubric evaluation');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar la columna valuationType
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "valuationType"`);

    // Eliminar el tipo enum
    await queryRunner.query(`DROP TYPE "public"."task_valuation_type_enum"`);

    console.log('✅ Migration AddTaskValuationType reverted successfully');
  }
}