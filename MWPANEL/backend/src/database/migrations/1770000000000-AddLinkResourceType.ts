import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLinkResourceType1770000000000 implements MigrationInterface {
  name = 'AddLinkResourceType1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add LINK to the enum (PostgreSQL requires ALTER TYPE)
    await queryRunner.query(`
      ALTER TYPE "public"."educational_resources_type_enum" ADD VALUE 'LINK'
    `);

    // 2. Make Drive-specific columns nullable
    await queryRunner.query(`
      ALTER TABLE "educational_resources"
        ALTER COLUMN "driveFileId" DROP NOT NULL,
        ALTER COLUMN "driveFolderId" DROP NOT NULL,
        ALTER COLUMN "driveFileName" DROP NOT NULL,
        ALTER COLUMN "mimeType" DROP NOT NULL,
        ALTER COLUMN "fileSize" DROP NOT NULL
    `);

    // 3. Drop the existing unique index on driveFileId (not null-safe)
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_educational_resources_driveFileId"
    `);

    // 4. Create a partial unique index (only when driveFileId is not null)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_educational_resources_driveFileId"
      ON "educational_resources" ("driveFileId")
      WHERE "driveFileId" IS NOT NULL
    `);

    // 5. Add new link-specific columns
    await queryRunner.query(`
      ALTER TABLE "educational_resources"
        ADD COLUMN IF NOT EXISTS "externalUrl" character varying,
        ADD COLUMN IF NOT EXISTS "previewTitle" character varying,
        ADD COLUMN IF NOT EXISTS "previewDescription" text,
        ADD COLUMN IF NOT EXISTS "previewImage" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove link columns
    await queryRunner.query(`
      ALTER TABLE "educational_resources"
        DROP COLUMN IF EXISTS "externalUrl",
        DROP COLUMN IF EXISTS "previewTitle",
        DROP COLUMN IF EXISTS "previewDescription",
        DROP COLUMN IF EXISTS "previewImage"
    `);

    // Restore NOT NULL constraints on Drive columns
    await queryRunner.query(`
      ALTER TABLE "educational_resources"
        ALTER COLUMN "driveFileId" SET NOT NULL,
        ALTER COLUMN "driveFolderId" SET NOT NULL,
        ALTER COLUMN "driveFileName" SET NOT NULL,
        ALTER COLUMN "mimeType" SET NOT NULL,
        ALTER COLUMN "fileSize" SET NOT NULL
    `);

    // Restore original non-partial unique index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_educational_resources_driveFileId"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_educational_resources_driveFileId"
      ON "educational_resources" ("driveFileId")
    `);

    // Note: PostgreSQL does not support removing enum values directly.
  }
}
