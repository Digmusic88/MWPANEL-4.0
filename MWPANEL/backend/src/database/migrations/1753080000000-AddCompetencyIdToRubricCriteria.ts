import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompetencyIdToRubricCriteria1753080000000 implements MigrationInterface {
  name = 'AddCompetencyIdToRubricCriteria1753080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Añadir columna competency_id a rubric_criteria (nullable para compatibilidad retroactiva)
    await queryRunner.query(
      `ALTER TABLE "rubric_criteria" ADD COLUMN "competency_id" UUID`
    );

    // Crear foreign key constraint hacia competencies
    await queryRunner.query(
      `ALTER TABLE "rubric_criteria" ADD CONSTRAINT "FK_rubric_criteria_competency" 
       FOREIGN KEY ("competency_id") REFERENCES "competencies"("id") ON DELETE SET NULL ON UPDATE CASCADE`
    );

    // Crear índice para mejorar performance en queries
    await queryRunner.query(
      `CREATE INDEX "IDX_rubric_criteria_competency_id" ON "rubric_criteria" ("competency_id")`
    );

    // Añadir campo para marcar si la rúbrica usa competencias (optimización de queries)
    await queryRunner.query(
      `ALTER TABLE "rubrics" ADD COLUMN "uses_competencies" BOOLEAN DEFAULT FALSE`
    );

    // Crear índice para filtrar rúbricas con competencias
    await queryRunner.query(
      `CREATE INDEX "IDX_rubrics_uses_competencies" ON "rubrics" ("uses_competencies")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar índices
    await queryRunner.query(`DROP INDEX "IDX_rubrics_uses_competencies"`);
    await queryRunner.query(`DROP INDEX "IDX_rubric_criteria_competency_id"`);
    
    // Eliminar columnas
    await queryRunner.query(`ALTER TABLE "rubrics" DROP COLUMN "uses_competencies"`);
    
    // Eliminar foreign key constraint
    await queryRunner.query(`ALTER TABLE "rubric_criteria" DROP CONSTRAINT "FK_rubric_criteria_competency"`);
    
    // Eliminar columna competency_id
    await queryRunner.query(`ALTER TABLE "rubric_criteria" DROP COLUMN "competency_id"`);
  }
}