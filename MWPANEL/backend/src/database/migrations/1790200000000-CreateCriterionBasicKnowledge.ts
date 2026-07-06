import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCriterionBasicKnowledge1790200000000 implements MigrationInterface {
  name = 'CreateCriterionBasicKnowledge1790200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'criterion_knowledge_status_enum') THEN
          CREATE TYPE "criterion_knowledge_status_enum" AS ENUM ('suggested','confirmed','rejected');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'criterion_knowledge_source_enum') THEN
          CREATE TYPE "criterion_knowledge_source_enum" AS ENUM ('ai','manual');
        END IF;
      END $$;`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "criterion_basic_knowledge" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "evaluationCriterionId" uuid NOT NULL,
        "basicKnowledgeId" uuid NOT NULL,
        "status" "criterion_knowledge_status_enum" NOT NULL DEFAULT 'suggested',
        "source" "criterion_knowledge_source_enum" NOT NULL DEFAULT 'ai',
        "confidence" numeric(4,3),
        "createdBy" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_criterion_basic_knowledge" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_criterion_knowledge_pair" UNIQUE ("evaluationCriterionId","basicKnowledgeId"),
        CONSTRAINT "FK_ckbk_criterion" FOREIGN KEY ("evaluationCriterionId") REFERENCES "evaluation_criteria"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ckbk_knowledge" FOREIGN KEY ("basicKnowledgeId") REFERENCES "basic_knowledge"("id") ON DELETE CASCADE
      );`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_criterion_knowledge_criterion" ON "criterion_basic_knowledge" ("evaluationCriterionId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_criterion_knowledge_status" ON "criterion_basic_knowledge" ("status");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "criterion_basic_knowledge";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "criterion_knowledge_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "criterion_knowledge_source_enum";`);
  }
}
