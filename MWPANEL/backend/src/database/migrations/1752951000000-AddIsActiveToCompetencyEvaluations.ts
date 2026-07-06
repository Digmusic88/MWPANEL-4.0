import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsActiveToCompetencyEvaluations1752951000000 implements MigrationInterface {
  name = 'AddIsActiveToCompetencyEvaluations1752951000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "competency_evaluations" 
      ADD COLUMN "isActive" boolean NOT NULL DEFAULT true
    `);
    
    // Agregar comentario para explicar el propósito de la columna
    await queryRunner.query(`
      COMMENT ON COLUMN "competency_evaluations"."isActive" IS 
      'Permite desactivar competencias específicas en evaluaciones cuando no son relevantes para una asignatura'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "competency_evaluations" 
      DROP COLUMN "isActive"
    `);
  }
}