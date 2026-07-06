import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTaskAttachmentsModule1753300000000 implements MigrationInterface {
  name = 'CreateTaskAttachmentsModule1753300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create task_attachments table
    await queryRunner.query(`
      CREATE TABLE "task_attachments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "taskId" uuid NOT NULL,
        "activityId" uuid,
        "uploadedById" uuid NOT NULL,
        "driveFileId" character varying NOT NULL,
        "driveFolderId" character varying NOT NULL,
        "fileName" character varying NOT NULL,
        "originalFileName" character varying NOT NULL,
        "mimeType" character varying NOT NULL,
        "fileSize" bigint NOT NULL,
        "thumbnailUrl" character varying,
        "webViewLink" character varying,
        "downloadLink" character varying,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "isActive" boolean NOT NULL DEFAULT true,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_task_attachments" PRIMARY KEY ("id")
      )
    `);

    // Create attachment_versions table
    await queryRunner.query(`
      CREATE TABLE "attachment_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "attachmentId" uuid NOT NULL,
        "versionNumber" integer NOT NULL,
        "driveFileId" character varying NOT NULL,
        "fileName" character varying NOT NULL,
        "fileSize" bigint NOT NULL,
        "changeDescription" text,
        "uploadedById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attachment_versions" PRIMARY KEY ("id")
      )
    `);

    // Create attachment_audit_logs table
    await queryRunner.query(`
      CREATE TABLE "attachment_audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "attachmentId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "action" character varying NOT NULL,
        "details" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attachment_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_attachment_audit_action" CHECK ("action" IN ('view', 'download', 'upload', 'delete', 'restore', 'share', 'comment'))
      )
    `);

    // Create attachment_comments table
    await queryRunner.query(`
      CREATE TABLE "attachment_comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "attachmentId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "content" text NOT NULL,
        "parentCommentId" uuid,
        "isEdited" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attachment_comments" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "task_attachments" 
      ADD CONSTRAINT "FK_task_attachments_task" 
      FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "task_attachments" 
      ADD CONSTRAINT "FK_task_attachments_activity" 
      FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "task_attachments" 
      ADD CONSTRAINT "FK_task_attachments_user" 
      FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "attachment_versions" 
      ADD CONSTRAINT "FK_attachment_versions_attachment" 
      FOREIGN KEY ("attachmentId") REFERENCES "task_attachments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "attachment_versions" 
      ADD CONSTRAINT "FK_attachment_versions_user" 
      FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "attachment_audit_logs" 
      ADD CONSTRAINT "FK_attachment_audit_logs_attachment" 
      FOREIGN KEY ("attachmentId") REFERENCES "task_attachments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "attachment_audit_logs" 
      ADD CONSTRAINT "FK_attachment_audit_logs_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "attachment_comments" 
      ADD CONSTRAINT "FK_attachment_comments_attachment" 
      FOREIGN KEY ("attachmentId") REFERENCES "task_attachments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "attachment_comments" 
      ADD CONSTRAINT "FK_attachment_comments_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "attachment_comments" 
      ADD CONSTRAINT "FK_attachment_comments_parent" 
      FOREIGN KEY ("parentCommentId") REFERENCES "attachment_comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Create indexes for better performance
    await queryRunner.query(`CREATE INDEX "IDX_task_attachments_task" ON "task_attachments" ("taskId")`);
    await queryRunner.query(`CREATE INDEX "IDX_task_attachments_activity" ON "task_attachments" ("activityId")`);
    await queryRunner.query(`CREATE INDEX "IDX_task_attachments_uploaded_by" ON "task_attachments" ("uploadedById")`);
    await queryRunner.query(`CREATE INDEX "IDX_task_attachments_drive_file" ON "task_attachments" ("driveFileId")`);
    await queryRunner.query(`CREATE INDEX "IDX_task_attachments_active" ON "task_attachments" ("isActive")`);
    await queryRunner.query(`CREATE INDEX "IDX_task_attachments_created" ON "task_attachments" ("createdAt")`);

    await queryRunner.query(`CREATE INDEX "IDX_attachment_versions_attachment" ON "attachment_versions" ("attachmentId")`);
    await queryRunner.query(`CREATE INDEX "IDX_attachment_versions_version" ON "attachment_versions" ("versionNumber")`);

    await queryRunner.query(`CREATE INDEX "IDX_attachment_audit_logs_attachment" ON "attachment_audit_logs" ("attachmentId")`);
    await queryRunner.query(`CREATE INDEX "IDX_attachment_audit_logs_user" ON "attachment_audit_logs" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_attachment_audit_logs_action" ON "attachment_audit_logs" ("action")`);
    await queryRunner.query(`CREATE INDEX "IDX_attachment_audit_logs_created" ON "attachment_audit_logs" ("createdAt")`);

    await queryRunner.query(`CREATE INDEX "IDX_attachment_comments_attachment" ON "attachment_comments" ("attachmentId")`);
    await queryRunner.query(`CREATE INDEX "IDX_attachment_comments_user" ON "attachment_comments" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_attachment_comments_parent" ON "attachment_comments" ("parentCommentId")`);

    // Add unique constraint for version number per attachment
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_attachment_versions_attachment_version" 
      ON "attachment_versions" ("attachmentId", "versionNumber")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indexes
    await queryRunner.query(`DROP INDEX "UQ_attachment_versions_attachment_version"`);
    await queryRunner.query(`DROP INDEX "IDX_attachment_comments_parent"`);
    await queryRunner.query(`DROP INDEX "IDX_attachment_comments_user"`);
    await queryRunner.query(`DROP INDEX "IDX_attachment_comments_attachment"`);
    await queryRunner.query(`DROP INDEX "IDX_attachment_audit_logs_created"`);
    await queryRunner.query(`DROP INDEX "IDX_attachment_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX "IDX_attachment_audit_logs_user"`);
    await queryRunner.query(`DROP INDEX "IDX_attachment_audit_logs_attachment"`);
    await queryRunner.query(`DROP INDEX "IDX_attachment_versions_version"`);
    await queryRunner.query(`DROP INDEX "IDX_attachment_versions_attachment"`);
    await queryRunner.query(`DROP INDEX "IDX_task_attachments_created"`);
    await queryRunner.query(`DROP INDEX "IDX_task_attachments_active"`);
    await queryRunner.query(`DROP INDEX "IDX_task_attachments_drive_file"`);
    await queryRunner.query(`DROP INDEX "IDX_task_attachments_uploaded_by"`);
    await queryRunner.query(`DROP INDEX "IDX_task_attachments_activity"`);
    await queryRunner.query(`DROP INDEX "IDX_task_attachments_task"`);

    // Remove foreign key constraints
    await queryRunner.query(`ALTER TABLE "attachment_comments" DROP CONSTRAINT "FK_attachment_comments_parent"`);
    await queryRunner.query(`ALTER TABLE "attachment_comments" DROP CONSTRAINT "FK_attachment_comments_user"`);
    await queryRunner.query(`ALTER TABLE "attachment_comments" DROP CONSTRAINT "FK_attachment_comments_attachment"`);
    await queryRunner.query(`ALTER TABLE "attachment_audit_logs" DROP CONSTRAINT "FK_attachment_audit_logs_user"`);
    await queryRunner.query(`ALTER TABLE "attachment_audit_logs" DROP CONSTRAINT "FK_attachment_audit_logs_attachment"`);
    await queryRunner.query(`ALTER TABLE "attachment_versions" DROP CONSTRAINT "FK_attachment_versions_user"`);
    await queryRunner.query(`ALTER TABLE "attachment_versions" DROP CONSTRAINT "FK_attachment_versions_attachment"`);
    await queryRunner.query(`ALTER TABLE "task_attachments" DROP CONSTRAINT "FK_task_attachments_user"`);
    await queryRunner.query(`ALTER TABLE "task_attachments" DROP CONSTRAINT "FK_task_attachments_activity"`);
    await queryRunner.query(`ALTER TABLE "task_attachments" DROP CONSTRAINT "FK_task_attachments_task"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "attachment_comments"`);
    await queryRunner.query(`DROP TABLE "attachment_audit_logs"`);
    await queryRunner.query(`DROP TABLE "attachment_versions"`);
    await queryRunner.query(`DROP TABLE "task_attachments"`);
  }
}