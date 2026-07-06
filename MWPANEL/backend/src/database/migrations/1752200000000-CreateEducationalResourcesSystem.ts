import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEducationalResourcesSystem1752200000000 implements MigrationInterface {
  name = 'CreateEducationalResourcesSystem1752200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create educational_resources table
    await queryRunner.query(`
      CREATE TYPE "public"."educational_resources_type_enum" AS ENUM(
        'PDF', 'VIDEO', 'IMAGE', 'INTERACTIVE_HTML', 
        'DOCUMENT', 'PRESENTATION', 'SPREADSHEET', 'AUDIO'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "educational_resources" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text,
        "type" "public"."educational_resources_type_enum" NOT NULL,
        "gradeLevel" character varying NOT NULL,
        "academicYear" character varying NOT NULL,
        "tags" text,
        "driveFileId" character varying NOT NULL,
        "driveFolderId" character varying NOT NULL,
        "driveFileName" character varying NOT NULL,
        "webViewLink" character varying,
        "downloadLink" character varying,
        "thumbnailLink" character varying,
        "mimeType" character varying NOT NULL,
        "fileSize" bigint NOT NULL,
        "authorId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "educationalLevelId" uuid NOT NULL,
        "isPublic" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "views" integer NOT NULL DEFAULT '0',
        "downloads" integer NOT NULL DEFAULT '0',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_educational_resources" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_educational_resources_driveFileId" 
      ON "educational_resources" ("driveFileId")
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_educational_resources_authorId" 
      ON "educational_resources" ("authorId")
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_educational_resources_subjectId" 
      ON "educational_resources" ("subjectId")
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_educational_resources_educationalLevelId" 
      ON "educational_resources" ("educationalLevelId")
    `);

    // Create resource_assignments table
    await queryRunner.query(`
      CREATE TABLE "resource_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "resourceId" uuid NOT NULL,
        "classGroupId" uuid,
        "studentId" uuid,
        "assignedById" uuid NOT NULL,
        "assignedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "dueDate" TIMESTAMP,
        "instructions" text,
        CONSTRAINT "PK_resource_assignments" PRIMARY KEY ("id")
      )
    `);

    // Create unique constraints for assignments
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_resource_assignments_resource_class" 
      ON "resource_assignments" ("resourceId", "classGroupId") 
      WHERE "classGroupId" IS NOT NULL
    `);
    
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_resource_assignments_resource_student" 
      ON "resource_assignments" ("resourceId", "studentId") 
      WHERE "studentId" IS NOT NULL
    `);

    // Create resource_views table
    await queryRunner.query(`
      CREATE TABLE "resource_views" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "resourceId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "viewedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "duration" integer,
        "completionPercentage" integer,
        "viewType" character varying NOT NULL DEFAULT 'web',
        CONSTRAINT "PK_resource_views" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for views
    await queryRunner.query(`
      CREATE INDEX "IDX_resource_views_resource_user" 
      ON "resource_views" ("resourceId", "userId")
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_resource_views_viewedAt" 
      ON "resource_views" ("viewedAt")
    `);

    // Create resource_comments table
    await queryRunner.query(`
      CREATE TABLE "resource_comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "resourceId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "content" text NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_resource_comments" PRIMARY KEY ("id")
      )
    `);

    // Create resource_favorites table
    await queryRunner.query(`
      CREATE TABLE "resource_favorites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "resourceId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_resource_favorites" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_resource_favorites_resource_user" UNIQUE ("resourceId", "userId")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "educational_resources" 
      ADD CONSTRAINT "FK_educational_resources_author" 
      FOREIGN KEY ("authorId") REFERENCES "users"("id") 
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "educational_resources" 
      ADD CONSTRAINT "FK_educational_resources_subject" 
      FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") 
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "educational_resources" 
      ADD CONSTRAINT "FK_educational_resources_educationalLevel" 
      FOREIGN KEY ("educationalLevelId") REFERENCES "educational_levels"("id") 
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "resource_assignments" 
      ADD CONSTRAINT "FK_resource_assignments_resource" 
      FOREIGN KEY ("resourceId") REFERENCES "educational_resources"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "resource_assignments" 
      ADD CONSTRAINT "FK_resource_assignments_classGroup" 
      FOREIGN KEY ("classGroupId") REFERENCES "class_groups"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "resource_assignments" 
      ADD CONSTRAINT "FK_resource_assignments_student" 
      FOREIGN KEY ("studentId") REFERENCES "users"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "resource_assignments" 
      ADD CONSTRAINT "FK_resource_assignments_assignedBy" 
      FOREIGN KEY ("assignedById") REFERENCES "users"("id") 
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "resource_views" 
      ADD CONSTRAINT "FK_resource_views_resource" 
      FOREIGN KEY ("resourceId") REFERENCES "educational_resources"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "resource_views" 
      ADD CONSTRAINT "FK_resource_views_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "resource_comments" 
      ADD CONSTRAINT "FK_resource_comments_resource" 
      FOREIGN KEY ("resourceId") REFERENCES "educational_resources"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "resource_comments" 
      ADD CONSTRAINT "FK_resource_comments_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "resource_favorites" 
      ADD CONSTRAINT "FK_resource_favorites_resource" 
      FOREIGN KEY ("resourceId") REFERENCES "educational_resources"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "resource_favorites" 
      ADD CONSTRAINT "FK_resource_favorites_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // Create function to update resource stats
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_resource_stats()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE educational_resources 
          SET views = views + 1 
          WHERE id = NEW."resourceId";
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger for auto-updating view count
    await queryRunner.query(`
      CREATE TRIGGER trigger_update_resource_views
      AFTER INSERT ON resource_views
      FOR EACH ROW
      EXECUTE FUNCTION update_resource_stats();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger and function
    await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_update_resource_views ON resource_views`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_resource_stats`);

    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "resource_favorites" DROP CONSTRAINT "FK_resource_favorites_user"`);
    await queryRunner.query(`ALTER TABLE "resource_favorites" DROP CONSTRAINT "FK_resource_favorites_resource"`);
    await queryRunner.query(`ALTER TABLE "resource_comments" DROP CONSTRAINT "FK_resource_comments_user"`);
    await queryRunner.query(`ALTER TABLE "resource_comments" DROP CONSTRAINT "FK_resource_comments_resource"`);
    await queryRunner.query(`ALTER TABLE "resource_views" DROP CONSTRAINT "FK_resource_views_user"`);
    await queryRunner.query(`ALTER TABLE "resource_views" DROP CONSTRAINT "FK_resource_views_resource"`);
    await queryRunner.query(`ALTER TABLE "resource_assignments" DROP CONSTRAINT "FK_resource_assignments_assignedBy"`);
    await queryRunner.query(`ALTER TABLE "resource_assignments" DROP CONSTRAINT "FK_resource_assignments_student"`);
    await queryRunner.query(`ALTER TABLE "resource_assignments" DROP CONSTRAINT "FK_resource_assignments_classGroup"`);
    await queryRunner.query(`ALTER TABLE "resource_assignments" DROP CONSTRAINT "FK_resource_assignments_resource"`);
    await queryRunner.query(`ALTER TABLE "educational_resources" DROP CONSTRAINT "FK_educational_resources_educationalLevel"`);
    await queryRunner.query(`ALTER TABLE "educational_resources" DROP CONSTRAINT "FK_educational_resources_subject"`);
    await queryRunner.query(`ALTER TABLE "educational_resources" DROP CONSTRAINT "FK_educational_resources_author"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "resource_favorites"`);
    await queryRunner.query(`DROP TABLE "resource_comments"`);
    await queryRunner.query(`DROP TABLE "resource_views"`);
    await queryRunner.query(`DROP TABLE "resource_assignments"`);
    await queryRunner.query(`DROP TABLE "educational_resources"`);

    // Drop enum
    await queryRunner.query(`DROP TYPE "public"."educational_resources_type_enum"`);
  }
}