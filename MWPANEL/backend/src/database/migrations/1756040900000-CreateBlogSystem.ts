import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBlogSystem1756040900000 implements MigrationInterface {
  name = 'CreateBlogSystem1756040900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create blog_categories table
    await queryRunner.query(`
      CREATE TABLE "blog_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "slug" character varying(255) NOT NULL,
        "description" text,
        "color" character varying(7),
        "icon" character varying(255),
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_blog_category_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_blog_categories" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_blog_categories_slug" ON "blog_categories" ("slug")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_categories_active" ON "blog_categories" ("isActive")`);

    // Create blog_posts table
    await queryRunner.query(`
      CREATE TYPE "public"."blog_posts_status_enum" AS ENUM('draft', 'published', 'archived', 'scheduled')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."blog_posts_visibility_enum" AS ENUM('public', 'staff_only', 'students_only', 'families_only', 'class_specific', 'private')
    `);

    await queryRunner.query(`
      CREATE TABLE "blog_posts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(255) NOT NULL,
        "content" text NOT NULL,
        "excerpt" text,
        "slug" character varying(255) NOT NULL,
        "status" "public"."blog_posts_status_enum" NOT NULL DEFAULT 'draft',
        "visibility" "public"."blog_posts_visibility_enum" NOT NULL DEFAULT 'public',
        "featured" boolean NOT NULL DEFAULT false,
        "visibilitySettings" jsonb,
        "publishDate" TIMESTAMP,
        "featuredImage" character varying(255),
        "tags" text,
        "views" integer NOT NULL DEFAULT '0',
        "likes" integer NOT NULL DEFAULT '0',
        "commentsEnabled" boolean NOT NULL DEFAULT true,
        "seoData" jsonb,
        "author_id" uuid NOT NULL,
        "category_id" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_blog_posts_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_blog_posts" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_blog_posts_slug" ON "blog_posts" ("slug")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_posts_status" ON "blog_posts" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_posts_visibility" ON "blog_posts" ("visibility")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_posts_status_visibility" ON "blog_posts" ("status", "visibility")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_posts_publishDate" ON "blog_posts" ("publishDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_posts_featured" ON "blog_posts" ("featured")`);

    // Create blog_comments table
    await queryRunner.query(`
      CREATE TYPE "public"."blog_comments_status_enum" AS ENUM('pending', 'approved', 'rejected', 'spam')
    `);

    await queryRunner.query(`
      CREATE TABLE "blog_comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "content" text NOT NULL,
        "authorName" character varying(255),
        "authorEmail" character varying(255),
        "status" "public"."blog_comments_status_enum" NOT NULL DEFAULT 'pending',
        "ipAddress" inet,
        "userAgent" text,
        "isEdited" boolean NOT NULL DEFAULT false,
        "editedAt" TIMESTAMP,
        "post_id" uuid NOT NULL,
        "author_id" uuid,
        "parent_id" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blog_comments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_blog_comments_status" ON "blog_comments" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_comments_post" ON "blog_comments" ("post_id")`);

    // Create blog_media table
    await queryRunner.query(`
      CREATE TYPE "public"."blog_media_type_enum" AS ENUM('image', 'video', 'document', 'audio')
    `);

    await queryRunner.query(`
      CREATE TABLE "blog_media" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "filename" character varying(255) NOT NULL,
        "originalName" character varying(255) NOT NULL,
        "mimeType" character varying(127) NOT NULL,
        "size" bigint NOT NULL,
        "type" "public"."blog_media_type_enum" NOT NULL,
        "url" character varying(512) NOT NULL,
        "thumbnailUrl" character varying(512),
        "altText" character varying(255),
        "caption" text,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "post_id" uuid,
        "uploaded_by_id" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blog_media" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_blog_media_type" ON "blog_media" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_media_post" ON "blog_media" ("post_id")`);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "blog_posts" 
      ADD CONSTRAINT "FK_blog_posts_author" 
      FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_posts" 
      ADD CONSTRAINT "FK_blog_posts_category" 
      FOREIGN KEY ("category_id") REFERENCES "blog_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_comments" 
      ADD CONSTRAINT "FK_blog_comments_post" 
      FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_comments" 
      ADD CONSTRAINT "FK_blog_comments_author" 
      FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_comments" 
      ADD CONSTRAINT "FK_blog_comments_parent" 
      FOREIGN KEY ("parent_id") REFERENCES "blog_comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_media" 
      ADD CONSTRAINT "FK_blog_media_post" 
      FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_media" 
      ADD CONSTRAINT "FK_blog_media_uploaded_by" 
      FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Insert default blog category
    await queryRunner.query(`
      INSERT INTO "blog_categories" ("name", "slug", "description", "color", "isActive", "sortOrder") 
      VALUES ('General', 'general', 'Artículos generales del blog', '#3B82F6', true, 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    await queryRunner.query(`ALTER TABLE "blog_media" DROP CONSTRAINT "FK_blog_media_uploaded_by"`);
    await queryRunner.query(`ALTER TABLE "blog_media" DROP CONSTRAINT "FK_blog_media_post"`);
    await queryRunner.query(`ALTER TABLE "blog_comments" DROP CONSTRAINT "FK_blog_comments_parent"`);
    await queryRunner.query(`ALTER TABLE "blog_comments" DROP CONSTRAINT "FK_blog_comments_author"`);
    await queryRunner.query(`ALTER TABLE "blog_comments" DROP CONSTRAINT "FK_blog_comments_post"`);
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP CONSTRAINT "FK_blog_posts_category"`);
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP CONSTRAINT "FK_blog_posts_author"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "blog_media"`);
    await queryRunner.query(`DROP TABLE "blog_comments"`);
    await queryRunner.query(`DROP TABLE "blog_posts"`);
    await queryRunner.query(`DROP TABLE "blog_categories"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "public"."blog_media_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."blog_comments_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."blog_posts_visibility_enum"`);
    await queryRunner.query(`DROP TYPE "public"."blog_posts_status_enum"`);
  }
}