import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBlogSystem1752800000000 implements MigrationInterface {
  name = 'CreateBlogSystem1752800000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create blog categories table
    await queryRunner.query(`
      CREATE TABLE "blog_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "description" text,
        "color" character varying(7) NOT NULL,
        "icon" character varying(255),
        "sortOrder" integer NOT NULL DEFAULT '0',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blog_categories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_blog_categories_name" UNIQUE ("name")
      )
    `);

    // Create blog posts table
    await queryRunner.query(`
      CREATE TYPE "public"."blog_posts_status_enum" AS ENUM('draft', 'published', 'archived')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."blog_posts_visibility_enum" AS ENUM('public', 'staff_only', 'students_only', 'families_only', 'class_specific', 'private')
    `);

    await queryRunner.query(`
      CREATE TABLE "blog_posts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(255) NOT NULL,
        "content" text NOT NULL,
        "excerpt" character varying(500),
        "slug" character varying(255) NOT NULL,
        "status" "public"."blog_posts_status_enum" NOT NULL DEFAULT 'draft',
        "visibility" "public"."blog_posts_visibility_enum" NOT NULL DEFAULT 'public',
        "featured" boolean NOT NULL DEFAULT false,
        "visibilitySettings" jsonb,
        "publishDate" TIMESTAMP NOT NULL DEFAULT now(),
        "featuredImage" character varying(255),
        "tags" text array,
        "commentsEnabled" boolean NOT NULL DEFAULT true,
        "seoData" jsonb,
        "viewCount" integer NOT NULL DEFAULT '0',
        "authorId" uuid NOT NULL,
        "categoryId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blog_posts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_blog_posts_slug" UNIQUE ("slug")
      )
    `);

    // Create blog comments table
    await queryRunner.query(`
      CREATE TYPE "public"."blog_comments_status_enum" AS ENUM('pending', 'approved', 'rejected')
    `);

    await queryRunner.query(`
      CREATE TABLE "blog_comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "content" character varying(2000) NOT NULL,
        "status" "public"."blog_comments_status_enum" NOT NULL DEFAULT 'pending',
        "authorId" uuid NOT NULL,
        "postId" uuid NOT NULL,
        "parentId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blog_comments" PRIMARY KEY ("id")
      )
    `);

    // Create blog media table
    await queryRunner.query(`
      CREATE TYPE "public"."blog_media_type_enum" AS ENUM('image', 'video', 'audio', 'document', 'gallery')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."blog_media_provider_enum" AS ENUM('local', 'google_drive', 'youtube', 'vimeo', 'external')
    `);

    await queryRunner.query(`
      CREATE TABLE "blog_media" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "filename" character varying(255) NOT NULL,
        "originalName" character varying(255) NOT NULL,
        "type" "public"."blog_media_type_enum" NOT NULL,
        "provider" "public"."blog_media_provider_enum" NOT NULL DEFAULT 'local',
        "url" text NOT NULL,
        "thumbnailUrl" text,
        "mimeType" character varying(100),
        "fileSize" bigint,
        "dimensions" jsonb,
        "alt" text,
        "caption" text,
        "sortOrder" integer NOT NULL DEFAULT '0',
        "isActive" boolean NOT NULL DEFAULT true,
        "metadata" jsonb,
        "uploadedById" uuid NOT NULL,
        "postId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blog_media" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "blog_posts" ADD CONSTRAINT "FK_blog_posts_author" 
      FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_posts" ADD CONSTRAINT "FK_blog_posts_category" 
      FOREIGN KEY ("categoryId") REFERENCES "blog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_comments" ADD CONSTRAINT "FK_blog_comments_author" 
      FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_comments" ADD CONSTRAINT "FK_blog_comments_post" 
      FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_comments" ADD CONSTRAINT "FK_blog_comments_parent" 
      FOREIGN KEY ("parentId") REFERENCES "blog_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_media" ADD CONSTRAINT "FK_blog_media_uploader" 
      FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_media" ADD CONSTRAINT "FK_blog_media_post" 
      FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // Create indexes for performance
    await queryRunner.query(`CREATE INDEX "IDX_blog_posts_status" ON "blog_posts" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_posts_visibility" ON "blog_posts" ("visibility")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_posts_featured" ON "blog_posts" ("featured")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_posts_publish_date" ON "blog_posts" ("publishDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_posts_author" ON "blog_posts" ("authorId")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_posts_category" ON "blog_posts" ("categoryId")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_posts_tags" ON "blog_posts" USING gin ("tags")`);
    
    await queryRunner.query(`CREATE INDEX "IDX_blog_comments_post" ON "blog_comments" ("postId")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_comments_status" ON "blog_comments" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_comments_parent" ON "blog_comments" ("parentId")`);
    
    await queryRunner.query(`CREATE INDEX "IDX_blog_media_type" ON "blog_media" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_media_provider" ON "blog_media" ("provider")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_media_post" ON "blog_media" ("postId")`);
    await queryRunner.query(`CREATE INDEX "IDX_blog_media_active" ON "blog_media" ("isActive")`);
    
    await queryRunner.query(`CREATE INDEX "IDX_blog_categories_sort_order" ON "blog_categories" ("sortOrder")`);

    // Insert default categories
    await queryRunner.query(`
      INSERT INTO "blog_categories" ("name", "description", "color", "icon", "sortOrder") VALUES
      ('Noticias', 'Noticias y anuncios importantes', '#3B82F6', 'news', 1),
      ('Eventos', 'Eventos escolares y actividades', '#10B981', 'calendar', 2),
      ('Académico', 'Contenido educativo y recursos', '#8B5CF6', 'book', 3),
      ('Deportes', 'Actividades deportivas y competiciones', '#F59E0B', 'trophy', 4),
      ('Cultura', 'Actividades culturales y artísticas', '#EF4444', 'palette', 5)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "blog_media" DROP CONSTRAINT "FK_blog_media_post"`);
    await queryRunner.query(`ALTER TABLE "blog_media" DROP CONSTRAINT "FK_blog_media_uploader"`);
    await queryRunner.query(`ALTER TABLE "blog_comments" DROP CONSTRAINT "FK_blog_comments_parent"`);
    await queryRunner.query(`ALTER TABLE "blog_comments" DROP CONSTRAINT "FK_blog_comments_post"`);
    await queryRunner.query(`ALTER TABLE "blog_comments" DROP CONSTRAINT "FK_blog_comments_author"`);
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP CONSTRAINT "FK_blog_posts_category"`);
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP CONSTRAINT "FK_blog_posts_author"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_blog_categories_sort_order"`);
    await queryRunner.query(`DROP INDEX "IDX_blog_media_active"`);
    await queryRunner.query(`DROP INDEX "IDX_blog_media_post"`);
    await queryRunner.query(`DROP INDEX "IDX_blog_media_provider"`);
    await queryRunner.query(`DROP INDEX "IDX_blog_media_type"`);
    await queryRunner.query(`DROP INDEX "IDX_blog_comments_parent"`);
    await queryRunner.query(`DROP INDEX "IDX_blog_comments_status"`);
    await queryRunner.query(`DROP INDEX "IDX_blog_comments_post"`);
    await queryRunner.query(`DROP INDEX "IDX_blog_posts_tags"`);
    await queryRunner.query(`DROP INDEX "IDX_blog_posts_category"`);
    await queryRunner.query(`DROP INDEX "IDX_blog_posts_author"`);
    await queryRunner.query(`DROP INDEX "IDX_blog_posts_publish_date"`);
    await queryRunner.query(`DROP INDEX "IDX_blog_posts_featured"`);
    await queryRunner.query(`DROP INDEX "IDX_blog_posts_visibility"`);
    await queryRunner.query(`DROP INDEX "IDX_blog_posts_status"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "blog_media"`);
    await queryRunner.query(`DROP TABLE "blog_comments"`);
    await queryRunner.query(`DROP TABLE "blog_posts"`);
    await queryRunner.query(`DROP TABLE "blog_categories"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "public"."blog_media_provider_enum"`);
    await queryRunner.query(`DROP TYPE "public"."blog_media_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."blog_comments_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."blog_posts_visibility_enum"`);
    await queryRunner.query(`DROP TYPE "public"."blog_posts_status_enum"`);
  }
}