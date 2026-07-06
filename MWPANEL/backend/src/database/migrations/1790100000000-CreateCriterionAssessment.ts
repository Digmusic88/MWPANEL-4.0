import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCriterionAssessment1790100000000 implements MigrationInterface {
  name = 'CreateCriterionAssessment1790100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='criterion_assessments_scaletype_enum') THEN
        CREATE TYPE "criterion_assessments_scaletype_enum" AS ENUM ('levels','numeric'); END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='criterion_assessments_levelvalue_enum') THEN
        CREATE TYPE "criterion_assessments_levelvalue_enum" AS ENUM ('EMERGING','DEVELOPING','ACHIEVING','EXCEEDING'); END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='criterion_scale_configs_scaletype_enum') THEN
        CREATE TYPE "criterion_scale_configs_scaletype_enum" AS ENUM ('levels','numeric'); END IF;
    END $$;`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "criterion_assessments" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "studentId" uuid NOT NULL,
      "evaluationCriterionId" uuid NOT NULL,
      "subjectAssignmentId" uuid NOT NULL,
      "evaluationPeriodId" uuid NOT NULL,
      "teacherId" uuid NOT NULL,
      "scaleType" "criterion_assessments_scaletype_enum" NOT NULL,
      "levelValue" "criterion_assessments_levelvalue_enum",
      "numericValue" numeric(5,2),
      "normalizedScore" numeric(5,2) NOT NULL,
      "observations" text,
      "assessedAt" timestamptz NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_criterion_assessments" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_criterion_assessment_student_criterion_period"
      ON "criterion_assessments" ("studentId","evaluationCriterionId","evaluationPeriodId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_criterion_assessment_assignment_period"
      ON "criterion_assessments" ("subjectAssignmentId","evaluationPeriodId")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "criterion_scale_configs" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "subjectAssignmentId" uuid NOT NULL,
      "scaleType" "criterion_scale_configs_scaletype_enum" NOT NULL DEFAULT 'levels',
      "numericMax" integer NOT NULL DEFAULT 10,
      "levelMapping" jsonb NOT NULL DEFAULT '{"EMERGING":40,"DEVELOPING":60,"ACHIEVING":80,"EXCEEDING":100}',
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_criterion_scale_configs" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_criterion_scale_config_assignment" UNIQUE ("subjectAssignmentId")
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "criterion_scale_configs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "criterion_assessments"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "criterion_scale_configs_scaletype_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "criterion_assessments_levelvalue_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "criterion_assessments_scaletype_enum"`);
  }
}
