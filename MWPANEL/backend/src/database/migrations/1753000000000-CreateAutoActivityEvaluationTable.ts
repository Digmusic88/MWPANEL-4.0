import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAutoActivityEvaluationTable1753000000000 implements MigrationInterface {
  name = 'CreateAutoActivityEvaluationTable1753000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear enum para etapa educativa
    await queryRunner.query(`
      CREATE TYPE "educational_stage_enum" AS ENUM('INFANTIL', 'PRIMARIA', 'SECUNDARIA')
    `);

    // Crear enum para tipo de descriptor
    await queryRunner.query(`
      CREATE TYPE "descriptor_type_enum" AS ENUM('specific', 'knowledge', 'criteria', 'operative')
    `);

    // Crear tabla de evaluaciones automáticas de actividades
    await queryRunner.query(`
      CREATE TABLE "auto_activity_evaluation" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "teacherId" uuid NOT NULL,
        "activityTitle" character varying(500) NOT NULL,
        "activityDescription" text NOT NULL,
        "stage" "educational_stage_enum" NOT NULL,
        "subjectId" uuid,
        "descriptorId" uuid NOT NULL,
        "descriptorType" "descriptor_type_enum" NOT NULL,
        "similarityScore" decimal(5,4) NOT NULL,
        "weight" integer NOT NULL DEFAULT 30,
        "accepted" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_auto_activity_evaluation" PRIMARY KEY ("id")
      )
    `);

    // Crear foreign keys
    await queryRunner.query(`
      ALTER TABLE "auto_activity_evaluation" 
      ADD CONSTRAINT "FK_auto_activity_evaluation_teacherId" 
      FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "auto_activity_evaluation" 
      ADD CONSTRAINT "FK_auto_activity_evaluation_subjectId" 
      FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL
    `);

    // Crear índices para optimizar consultas
    await queryRunner.query(`
      CREATE INDEX "IDX_auto_activity_evaluation_teacher" ON "auto_activity_evaluation" ("teacherId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_auto_activity_evaluation_subject" ON "auto_activity_evaluation" ("subjectId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_auto_activity_evaluation_descriptor" ON "auto_activity_evaluation" ("descriptorId", "descriptorType")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_auto_activity_evaluation_accepted" ON "auto_activity_evaluation" ("accepted")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar índices
    await queryRunner.query(`DROP INDEX "IDX_auto_activity_evaluation_teacher"`);
    await queryRunner.query(`DROP INDEX "IDX_auto_activity_evaluation_subject"`);
    await queryRunner.query(`DROP INDEX "IDX_auto_activity_evaluation_descriptor"`);
    await queryRunner.query(`DROP INDEX "IDX_auto_activity_evaluation_accepted"`);

    // Eliminar tabla
    await queryRunner.query(`DROP TABLE "auto_activity_evaluation"`);

    // Eliminar enums
    await queryRunner.query(`DROP TYPE "descriptor_type_enum"`);
    await queryRunner.query(`DROP TYPE "educational_stage_enum"`);
  }
}