import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeCompetencyScoreToDecimal1752970500000 implements MigrationInterface {
  name = 'ChangeCompetencyScoreToDecimal1752970500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Cambiar el tipo de dato de score de integer a decimal(3,1) para soportar medias estrellas
    await queryRunner.query(
      `ALTER TABLE "competency_evaluations" ALTER COLUMN "score" TYPE DECIMAL(3,1) USING "score"::DECIMAL(3,1)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir el cambio de decimal a integer
    await queryRunner.query(
      `ALTER TABLE "competency_evaluations" ALTER COLUMN "score" TYPE INTEGER USING ROUND("score")`
    );
  }
}