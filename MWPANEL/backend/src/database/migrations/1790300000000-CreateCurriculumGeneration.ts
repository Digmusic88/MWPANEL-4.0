import { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateCurriculumGeneration1790300000000 implements MigrationInterface {
  name = 'CreateCurriculumGeneration1790300000000';
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='curriculum_generation_status_enum') THEN
        CREATE TYPE "curriculum_generation_status_enum" AS ENUM ('draft','applied','discarded'); END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='curriculum_generation_scopetype_enum') THEN
        CREATE TYPE "curriculum_generation_scopetype_enum" AS ENUM ('cycle','course'); END IF;
    END $$;`);
    await q.query(`CREATE TABLE IF NOT EXISTS "curriculum_generation" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "subjectName" character varying NOT NULL,
      "educationalLevelId" uuid NOT NULL,
      "scopeType" "curriculum_generation_scopetype_enum" NOT NULL,
      "scopeId" uuid NOT NULL,
      "status" "curriculum_generation_status_enum" NOT NULL DEFAULT 'draft',
      "model" character varying,
      "payload" jsonb NOT NULL,
      "createdBy" uuid, "appliedBy" uuid,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      "appliedAt" TIMESTAMP WITH TIME ZONE,
      CONSTRAINT "PK_curriculum_generation" PRIMARY KEY ("id"));`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_curriculum_generation_subject_scope" ON "curriculum_generation" ("subjectName","scopeType","scopeId");`);
  }
  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "curriculum_generation";`);
    await q.query(`DROP TYPE IF EXISTS "curriculum_generation_status_enum";`);
    await q.query(`DROP TYPE IF EXISTS "curriculum_generation_scopetype_enum";`);
  }
}
