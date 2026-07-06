import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureAutoActivityEvaluationCompatibility9999999999999 implements MigrationInterface {
  name = 'EnsureAutoActivityEvaluationCompatibility9999999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure the table exists with correct column names for TypeORM
    await queryRunner.query(`
      -- Rename columns to match TypeORM entity (camelCase)
      DO $$
      BEGIN
        -- Check if old column names exist and rename them
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auto_activity_evaluation' AND column_name='teacherid') THEN
          ALTER TABLE auto_activity_evaluation RENAME COLUMN teacherid TO "teacherId";
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auto_activity_evaluation' AND column_name='activitytitle') THEN
          ALTER TABLE auto_activity_evaluation RENAME COLUMN activitytitle TO "activityTitle";
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auto_activity_evaluation' AND column_name='activitydescription') THEN
          ALTER TABLE auto_activity_evaluation RENAME COLUMN activitydescription TO "activityDescription";
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auto_activity_evaluation' AND column_name='subjectid') THEN
          ALTER TABLE auto_activity_evaluation RENAME COLUMN subjectid TO "subjectId";
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auto_activity_evaluation' AND column_name='descriptorid') THEN
          ALTER TABLE auto_activity_evaluation RENAME COLUMN descriptorid TO "descriptorId";
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auto_activity_evaluation' AND column_name='descriptortype') THEN
          ALTER TABLE auto_activity_evaluation RENAME COLUMN descriptortype TO "descriptorType";
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auto_activity_evaluation' AND column_name='similarityscore') THEN
          ALTER TABLE auto_activity_evaluation RENAME COLUMN similarityscore TO "similarityScore";
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auto_activity_evaluation' AND column_name='createdat') THEN
          ALTER TABLE auto_activity_evaluation RENAME COLUMN createdat TO "createdAt";
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auto_activity_evaluation' AND column_name='updatedat') THEN
          ALTER TABLE auto_activity_evaluation RENAME COLUMN updatedat TO "updatedAt";
        END IF;
      END $$;
    `);

    // Ensure enum types exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "descriptor_type_enum" AS ENUM('specific', 'knowledge', 'criteria', 'operative');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "educational_stage_enum" AS ENUM('INFANTIL', 'PRIMARIA', 'SECUNDARIA');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Update constraint and index names to match new column names
    await queryRunner.query(`
      DO $$
      BEGIN
        -- Update foreign key constraints
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_auto_activity_evaluation_teacherid') THEN
          ALTER TABLE auto_activity_evaluation DROP CONSTRAINT fk_auto_activity_evaluation_teacherid;
          ALTER TABLE auto_activity_evaluation ADD CONSTRAINT "FK_auto_activity_evaluation_teacherId" FOREIGN KEY ("teacherId") REFERENCES users(id) ON DELETE CASCADE;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_auto_activity_evaluation_subjectid') THEN
          ALTER TABLE auto_activity_evaluation DROP CONSTRAINT fk_auto_activity_evaluation_subjectid;
          ALTER TABLE auto_activity_evaluation ADD CONSTRAINT "FK_auto_activity_evaluation_subjectId" FOREIGN KEY ("subjectId") REFERENCES subjects(id) ON DELETE SET NULL;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert column names back to lowercase
    await queryRunner.query(`
      ALTER TABLE auto_activity_evaluation RENAME COLUMN "teacherId" TO teacherid;
      ALTER TABLE auto_activity_evaluation RENAME COLUMN "activityTitle" TO activitytitle;
      ALTER TABLE auto_activity_evaluation RENAME COLUMN "activityDescription" TO activitydescription;
      ALTER TABLE auto_activity_evaluation RENAME COLUMN "subjectId" TO subjectid;
      ALTER TABLE auto_activity_evaluation RENAME COLUMN "descriptorId" TO descriptorid;
      ALTER TABLE auto_activity_evaluation RENAME COLUMN "descriptorType" TO descriptortype;
      ALTER TABLE auto_activity_evaluation RENAME COLUMN "similarityScore" TO similarityscore;
      ALTER TABLE auto_activity_evaluation RENAME COLUMN "createdAt" TO createdat;
      ALTER TABLE auto_activity_evaluation RENAME COLUMN "updatedAt" TO updatedat;
    `);
  }
}