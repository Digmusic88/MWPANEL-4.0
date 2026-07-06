import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLessonsAndResourcesSystem1753200000000 implements MigrationInterface {
  name = 'CreateLessonsAndResourcesSystem1753200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear enum para tipos de recursos de lección
    await queryRunner.query(`
      CREATE TYPE "lesson_resource_type_enum" AS ENUM(
        'FILE', 
        'YOUTUBE_LINK', 
        'WEB_LINK', 
        'INTERNAL_DOC', 
        'PRESENTATION', 
        'TSX_ARTIFACT'
      )
    `);

    // Crear enum para niveles de visibilidad
    await queryRunner.query(`
      CREATE TYPE "lesson_resource_visibility_enum" AS ENUM(
        'PRIVATE', 
        'SHARED_CLASS', 
        'PUBLIC'
      )
    `);

    // Crear tabla lesson_workspaces
    await queryRunner.query(`
      CREATE TABLE "lesson_workspaces" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "subject_assignment_id" uuid NOT NULL,
        "drive_folder_id" character varying,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lesson_workspaces" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_lesson_workspaces_subject_assignment" UNIQUE ("subject_assignment_id")
      )
    `);

    // Crear tabla lesson_folders (lecciones individuales)
    await queryRunner.query(`
      CREATE TABLE "lesson_folders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "order_index" integer NOT NULL DEFAULT 0,
        "drive_folder_id" character varying,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lesson_folders" PRIMARY KEY ("id")
      )
    `);

    // Crear tabla lesson_resources (recursos dentro de las lecciones)
    await queryRunner.query(`
      CREATE TABLE "lesson_resources" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "lesson_folder_id" uuid NOT NULL,
        "type" "lesson_resource_type_enum" NOT NULL,
        "title" character varying NOT NULL,
        "description" text,
        
        -- Para archivos físicos
        "drive_file_id" character varying,
        "file_name" character varying,
        "mime_type" character varying,
        "file_size" bigint,
        "web_view_link" character varying,
        "download_link" character varying,
        
        -- Para enlaces externos
        "external_url" character varying,
        
        -- Para documentos internos (WYSIWYG)
        "internal_content" text,
        
        -- Para artefactos TSX
        "tsx_source_code" text,
        "tsx_component_props" jsonb,
        "tsx_dependencies" text[],
        "tsx_styles" text,
        
        -- Metadatos y configuración
        "order_index" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "visibility" "lesson_resource_visibility_enum" NOT NULL DEFAULT 'PRIVATE',
        "view_count" integer NOT NULL DEFAULT 0,
        "download_count" integer NOT NULL DEFAULT 0,
        
        -- Auditoría
        "created_by_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        
        CONSTRAINT "PK_lesson_resources" PRIMARY KEY ("id")
      )
    `);

    // Crear tabla lesson_resource_shares (compartir recursos específicos)
    await queryRunner.query(`
      CREATE TABLE "lesson_resource_shares" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "resource_id" uuid NOT NULL,
        "shared_with_id" uuid NOT NULL,
        "shared_by_id" uuid NOT NULL,
        "permission_level" character varying NOT NULL DEFAULT 'view',
        "expires_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lesson_resource_shares" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_lesson_resource_shares_resource_user" UNIQUE ("resource_id", "shared_with_id")
      )
    `);

    // Crear tabla lesson_resource_access_logs (auditoría de acceso)
    await queryRunner.query(`
      CREATE TABLE "lesson_resource_access_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "resource_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "action" character varying NOT NULL,
        "ip_address" character varying,
        "user_agent" character varying,
        "accessed_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lesson_resource_access_logs" PRIMARY KEY ("id")
      )
    `);

    // Crear índices para optimización
    await queryRunner.query(`CREATE INDEX "IDX_lesson_workspaces_subject_assignment" ON "lesson_workspaces" ("subject_assignment_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_lesson_folders_workspace" ON "lesson_folders" ("workspace_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_lesson_folders_order" ON "lesson_folders" ("workspace_id", "order_index")`);
    await queryRunner.query(`CREATE INDEX "IDX_lesson_resources_folder" ON "lesson_resources" ("lesson_folder_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_lesson_resources_type" ON "lesson_resources" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_lesson_resources_visibility" ON "lesson_resources" ("visibility")`);
    await queryRunner.query(`CREATE INDEX "IDX_lesson_resources_creator" ON "lesson_resources" ("created_by_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_lesson_resources_order" ON "lesson_resources" ("lesson_folder_id", "order_index")`);
    await queryRunner.query(`CREATE INDEX "IDX_lesson_resource_shares_resource" ON "lesson_resource_shares" ("resource_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_lesson_resource_shares_user" ON "lesson_resource_shares" ("shared_with_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_lesson_resource_access_logs_resource" ON "lesson_resource_access_logs" ("resource_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_lesson_resource_access_logs_user" ON "lesson_resource_access_logs" ("user_id")`);

    // Crear foreign keys
    await queryRunner.query(`
      ALTER TABLE "lesson_workspaces" 
      ADD CONSTRAINT "FK_lesson_workspaces_subject_assignment" 
      FOREIGN KEY ("subject_assignment_id") 
      REFERENCES "subject_assignments"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "lesson_folders" 
      ADD CONSTRAINT "FK_lesson_folders_workspace" 
      FOREIGN KEY ("workspace_id") 
      REFERENCES "lesson_workspaces"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "lesson_resources" 
      ADD CONSTRAINT "FK_lesson_resources_folder" 
      FOREIGN KEY ("lesson_folder_id") 
      REFERENCES "lesson_folders"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "lesson_resources" 
      ADD CONSTRAINT "FK_lesson_resources_creator" 
      FOREIGN KEY ("created_by_id") 
      REFERENCES "users"("id") 
      ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE "lesson_resource_shares" 
      ADD CONSTRAINT "FK_lesson_resource_shares_resource" 
      FOREIGN KEY ("resource_id") 
      REFERENCES "lesson_resources"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "lesson_resource_shares" 
      ADD CONSTRAINT "FK_lesson_resource_shares_shared_with" 
      FOREIGN KEY ("shared_with_id") 
      REFERENCES "users"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "lesson_resource_shares" 
      ADD CONSTRAINT "FK_lesson_resource_shares_shared_by" 
      FOREIGN KEY ("shared_by_id") 
      REFERENCES "users"("id") 
      ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE "lesson_resource_access_logs" 
      ADD CONSTRAINT "FK_lesson_resource_access_logs_resource" 
      FOREIGN KEY ("resource_id") 
      REFERENCES "lesson_resources"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "lesson_resource_access_logs" 
      ADD CONSTRAINT "FK_lesson_resource_access_logs_user" 
      FOREIGN KEY ("user_id") 
      REFERENCES "users"("id") 
      ON DELETE CASCADE
    `);

    // Crear triggers para updated_at
    await queryRunner.query(`
      CREATE TRIGGER update_lesson_workspaces_updated_at 
      BEFORE UPDATE ON lesson_workspaces 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_lesson_folders_updated_at 
      BEFORE UPDATE ON lesson_folders 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_lesson_resources_updated_at 
      BEFORE UPDATE ON lesson_resources 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_lesson_resources_updated_at ON lesson_resources`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_lesson_folders_updated_at ON lesson_folders`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_lesson_workspaces_updated_at ON lesson_workspaces`);

    // Eliminar foreign keys
    await queryRunner.query(`ALTER TABLE "lesson_resource_access_logs" DROP CONSTRAINT "FK_lesson_resource_access_logs_user"`);
    await queryRunner.query(`ALTER TABLE "lesson_resource_access_logs" DROP CONSTRAINT "FK_lesson_resource_access_logs_resource"`);
    await queryRunner.query(`ALTER TABLE "lesson_resource_shares" DROP CONSTRAINT "FK_lesson_resource_shares_shared_by"`);
    await queryRunner.query(`ALTER TABLE "lesson_resource_shares" DROP CONSTRAINT "FK_lesson_resource_shares_shared_with"`);
    await queryRunner.query(`ALTER TABLE "lesson_resource_shares" DROP CONSTRAINT "FK_lesson_resource_shares_resource"`);
    await queryRunner.query(`ALTER TABLE "lesson_resources" DROP CONSTRAINT "FK_lesson_resources_creator"`);
    await queryRunner.query(`ALTER TABLE "lesson_resources" DROP CONSTRAINT "FK_lesson_resources_folder"`);
    await queryRunner.query(`ALTER TABLE "lesson_folders" DROP CONSTRAINT "FK_lesson_folders_workspace"`);
    await queryRunner.query(`ALTER TABLE "lesson_workspaces" DROP CONSTRAINT "FK_lesson_workspaces_subject_assignment"`);

    // Eliminar índices
    await queryRunner.query(`DROP INDEX "IDX_lesson_resource_access_logs_user"`);
    await queryRunner.query(`DROP INDEX "IDX_lesson_resource_access_logs_resource"`);
    await queryRunner.query(`DROP INDEX "IDX_lesson_resource_shares_user"`);
    await queryRunner.query(`DROP INDEX "IDX_lesson_resource_shares_resource"`);
    await queryRunner.query(`DROP INDEX "IDX_lesson_resources_order"`);
    await queryRunner.query(`DROP INDEX "IDX_lesson_resources_creator"`);
    await queryRunner.query(`DROP INDEX "IDX_lesson_resources_visibility"`);
    await queryRunner.query(`DROP INDEX "IDX_lesson_resources_type"`);
    await queryRunner.query(`DROP INDEX "IDX_lesson_resources_folder"`);
    await queryRunner.query(`DROP INDEX "IDX_lesson_folders_order"`);
    await queryRunner.query(`DROP INDEX "IDX_lesson_folders_workspace"`);
    await queryRunner.query(`DROP INDEX "IDX_lesson_workspaces_subject_assignment"`);

    // Eliminar tablas
    await queryRunner.query(`DROP TABLE "lesson_resource_access_logs"`);
    await queryRunner.query(`DROP TABLE "lesson_resource_shares"`);
    await queryRunner.query(`DROP TABLE "lesson_resources"`);
    await queryRunner.query(`DROP TABLE "lesson_folders"`);
    await queryRunner.query(`DROP TABLE "lesson_workspaces"`);

    // Eliminar enums
    await queryRunner.query(`DROP TYPE "lesson_resource_visibility_enum"`);
    await queryRunner.query(`DROP TYPE "lesson_resource_type_enum"`);
  }
}