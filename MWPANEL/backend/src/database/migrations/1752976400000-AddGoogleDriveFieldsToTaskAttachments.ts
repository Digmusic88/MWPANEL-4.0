import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleDriveFieldsToTaskAttachments1752976400000 implements MigrationInterface {
  name = 'AddGoogleDriveFieldsToTaskAttachments1752976400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add Google Drive fields to task_attachments table
    await queryRunner.query(`
      ALTER TABLE "task_attachments" 
      ADD COLUMN "driveFileId" character varying(255),
      ADD COLUMN "driveFolderId" character varying(255),
      ADD COLUMN "driveWebViewLink" character varying(1000),
      ADD COLUMN "driveDownloadLink" character varying(1000),
      ADD COLUMN "driveFolderPath" text
    `);
    
    // Make path column nullable as it should be for Google Drive files
    await queryRunner.query(`
      ALTER TABLE "task_attachments" 
      ALTER COLUMN "path" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove Google Drive fields
    await queryRunner.query(`
      ALTER TABLE "task_attachments" 
      DROP COLUMN "driveFileId",
      DROP COLUMN "driveFolderId", 
      DROP COLUMN "driveWebViewLink",
      DROP COLUMN "driveDownloadLink",
      DROP COLUMN "driveFolderPath"
    `);
    
    // Make path column not null again
    await queryRunner.query(`
      ALTER TABLE "task_attachments" 
      ALTER COLUMN "path" SET NOT NULL
    `);
  }
}