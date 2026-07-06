import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLessonResourceVisibilityEnum1753371200000 implements MigrationInterface {
  name = 'UpdateLessonResourceVisibilityEnum1753371200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, drop the old enum
    await queryRunner.query(`DROP TYPE IF EXISTS "lesson_resource_visibility_enum_old"`);
    
    // Rename current enum to old
    await queryRunner.query(`ALTER TYPE "lesson_resource_visibility_enum" RENAME TO "lesson_resource_visibility_enum_old"`);
    
    // Create new enum with updated values
    await queryRunner.query(`CREATE TYPE "lesson_resource_visibility_enum" AS ENUM('PRIVATE', 'CLASS', 'SCHOOL', 'PUBLIC')`);
    
    // Update the column to use new enum, converting old values to new ones
    await queryRunner.query(`
      ALTER TABLE "lesson_resources" 
      ALTER COLUMN "visibility" TYPE "lesson_resource_visibility_enum" 
      USING CASE 
        WHEN "visibility"::text = 'SHARED_CLASS' THEN 'CLASS'::lesson_resource_visibility_enum
        ELSE "visibility"::text::lesson_resource_visibility_enum
      END
    `);
    
    // Update default value
    await queryRunner.query(`ALTER TABLE "lesson_resources" ALTER COLUMN "visibility" SET DEFAULT 'CLASS'`);
    
    // Drop old enum
    await queryRunner.query(`DROP TYPE "lesson_resource_visibility_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the changes
    await queryRunner.query(`DROP TYPE IF EXISTS "lesson_resource_visibility_enum_old"`);
    await queryRunner.query(`ALTER TYPE "lesson_resource_visibility_enum" RENAME TO "lesson_resource_visibility_enum_old"`);
    await queryRunner.query(`CREATE TYPE "lesson_resource_visibility_enum" AS ENUM('PRIVATE', 'SHARED_CLASS', 'PUBLIC')`);
    
    await queryRunner.query(`
      ALTER TABLE "lesson_resources" 
      ALTER COLUMN "visibility" TYPE "lesson_resource_visibility_enum" 
      USING CASE 
        WHEN "visibility"::text = 'CLASS' THEN 'SHARED_CLASS'::lesson_resource_visibility_enum
        WHEN "visibility"::text = 'SCHOOL' THEN 'SHARED_CLASS'::lesson_resource_visibility_enum
        ELSE "visibility"::text::lesson_resource_visibility_enum
      END
    `);
    
    await queryRunner.query(`ALTER TABLE "lesson_resources" ALTER COLUMN "visibility" SET DEFAULT 'PRIVATE'`);
    await queryRunner.query(`DROP TYPE "lesson_resource_visibility_enum_old"`);
  }
}