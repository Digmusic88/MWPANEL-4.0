import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendTaskSubmissionAttachmentForStudentNotes1753100000000 implements MigrationInterface {
  name = 'ExtendTaskSubmissionAttachmentForStudentNotes1753100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to task_submission_attachments table
    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      ADD COLUMN "type" VARCHAR(50) DEFAULT 'file' NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      ADD COLUMN "studentNoteId" uuid
    `);

    // Create enum type for attachment types
    await queryRunner.query(`
      CREATE TYPE "attachment_type_enum" AS ENUM('file', 'student_note')
    `);

    // Update type column to use enum
    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      ALTER COLUMN "type" TYPE "attachment_type_enum" USING "type"::"attachment_type_enum"
    `);

    // Make file-related columns nullable (for student notes)
    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      ALTER COLUMN "filename" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      ALTER COLUMN "originalName" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      ALTER COLUMN "mimeType" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      ALTER COLUMN "size" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      ALTER COLUMN "path" DROP NOT NULL
    `);

    // Add foreign key constraint to student_notes
    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      ADD CONSTRAINT "FK_task_submission_attachments_studentNoteId" 
      FOREIGN KEY ("studentNoteId") REFERENCES "student_notes"("id") ON DELETE CASCADE
    `);

    // Add check constraint to ensure either file fields are filled OR studentNoteId is filled
    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      ADD CONSTRAINT "CHK_attachment_type_consistency" 
      CHECK (
        (type = 'file' AND filename IS NOT NULL AND "originalName" IS NOT NULL AND "mimeType" IS NOT NULL AND size IS NOT NULL AND path IS NOT NULL AND "studentNoteId" IS NULL) OR
        (type = 'student_note' AND "studentNoteId" IS NOT NULL)
      )
    `);

    // Create index on studentNoteId for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_task_submission_attachments_studentNoteId" 
      ON "task_submission_attachments" ("studentNoteId")
    `);

    // Create index on type column
    await queryRunner.query(`
      CREATE INDEX "IDX_task_submission_attachments_type" 
      ON "task_submission_attachments" ("type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indexes
    await queryRunner.query(`DROP INDEX "IDX_task_submission_attachments_type"`);
    await queryRunner.query(`DROP INDEX "IDX_task_submission_attachments_studentNoteId"`);

    // Remove check constraint
    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      DROP CONSTRAINT "CHK_attachment_type_consistency"
    `);

    // Remove foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      DROP CONSTRAINT "FK_task_submission_attachments_studentNoteId"
    `);

    // Make file-related columns NOT NULL again
    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      ALTER COLUMN "path" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      ALTER COLUMN "size" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      ALTER COLUMN "mimeType" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      ALTER COLUMN "originalName" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      ALTER COLUMN "filename" SET NOT NULL
    `);

    // Remove columns
    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      DROP COLUMN "studentNoteId"
    `);

    await queryRunner.query(`
      ALTER TABLE "task_submission_attachments" 
      DROP COLUMN "type"
    `);

    // Drop enum type
    await queryRunner.query(`DROP TYPE "attachment_type_enum"`);
  }
}