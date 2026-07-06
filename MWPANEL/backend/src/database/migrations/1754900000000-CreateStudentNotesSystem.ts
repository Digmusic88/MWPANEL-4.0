/**
 * @migration: CreateStudentNotesSystem
 * @proyecto: MW Panel 2.0 - Sistema de Apuntes para Estudiantes
 * @fecha: 20 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Migración que crea el sistema completo de apuntes personales para estudiantes.
 * Permite crear, gestionar y organizar apuntes de texto, audio y dibujos con integración Google Drive.
 * 
 * TABLAS CREADAS:
 * - student_notes: Tabla principal de apuntes de estudiantes
 * 
 * CARACTERÍSTICAS:
 * - Soporte para múltiples tipos de apuntes (texto, audio, dibujo, mixto)
 * - Integración con Google Drive para archivos adjuntos
 * - Sistema de etiquetas para organización
 * - Relación con asignaturas y recursos educativos
 * - Control de privacidad y favoritos
 * - Estadísticas de visualización y engagement
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - SISTEMA DE APUNTES ESTUDIANTILES
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudentNotesSystem1754900000000 implements MigrationInterface {
    name = 'CreateStudentNotesSystem1754900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        
        // === 1. CREAR ENUMS ===
        
        await queryRunner.query(`
            CREATE TYPE "student_note_type_enum" AS ENUM(
                'text', 'voice', 'drawing', 'mixed'
            )
        `);

        // === 2. TABLA PRINCIPAL: student_notes ===
        
        await queryRunner.query(`
            CREATE TABLE "student_notes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "title" character varying(255) NOT NULL,
                "content" text NOT NULL,
                "type" "student_note_type_enum" NOT NULL DEFAULT 'text',
                "metadata" jsonb,
                "relatedResourceId" uuid,
                "authorId" uuid NOT NULL,
                "subjectId" uuid,
                "tags" text,
                "driveFileId" character varying,
                "webViewLink" character varying(500),
                "webContentLink" character varying(500),
                "isPrivate" boolean NOT NULL DEFAULT true,
                "isFavorite" boolean NOT NULL DEFAULT false,
                "viewCount" integer NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_student_notes" PRIMARY KEY ("id")
            )
        `);

        // === 3. CREAR ÍNDICES OPTIMIZADOS ===
        
        // Índices principales para consultas frecuentes
        await queryRunner.query(`CREATE INDEX "IDX_student_notes_author_subject" ON "student_notes" ("authorId", "subjectId")`);
        await queryRunner.query(`CREATE INDEX "IDX_student_notes_authorId" ON "student_notes" ("authorId")`);
        await queryRunner.query(`CREATE INDEX "IDX_student_notes_created_at" ON "student_notes" ("createdAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_student_notes_relatedResourceId" ON "student_notes" ("relatedResourceId")`);
        await queryRunner.query(`CREATE INDEX "IDX_student_notes_subjectId" ON "student_notes" ("subjectId")`);
        
        // Índices para filtrado y búsqueda
        await queryRunner.query(`CREATE INDEX "IDX_student_notes_type" ON "student_notes" ("type")`);
        await queryRunner.query(`CREATE INDEX "IDX_student_notes_favorite" ON "student_notes" ("isFavorite") WHERE "isFavorite" = true`);
        await queryRunner.query(`CREATE INDEX "IDX_student_notes_private" ON "student_notes" ("isPrivate")`);
        
        // Índice de texto completo para búsqueda de contenido
        await queryRunner.query(`CREATE INDEX "IDX_student_notes_title_content" ON "student_notes" USING gin(to_tsvector('spanish', title || ' ' || content))`);

        // === 4. CREAR FOREIGN KEYS ===
        
        // Relación con el autor (usuario)
        await queryRunner.query(`
            ALTER TABLE "student_notes" 
            ADD CONSTRAINT "FK_student_notes_authorId" 
            FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // Relación con asignatura (opcional)
        await queryRunner.query(`
            ALTER TABLE "student_notes" 
            ADD CONSTRAINT "FK_student_notes_subjectId" 
            FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        // Relación con recurso educativo relacionado (opcional)
        await queryRunner.query(`
            ALTER TABLE "student_notes" 
            ADD CONSTRAINT "FK_student_notes_relatedResourceId" 
            FOREIGN KEY ("relatedResourceId") REFERENCES "educational_resources"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        console.log('✅ Student Notes System created successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        
        // === ROLLBACK: ELIMINAR EN ORDEN INVERSO ===
        
        // 1. Eliminar Foreign Keys
        await queryRunner.query(`ALTER TABLE "student_notes" DROP CONSTRAINT "FK_student_notes_relatedResourceId"`);
        await queryRunner.query(`ALTER TABLE "student_notes" DROP CONSTRAINT "FK_student_notes_subjectId"`);
        await queryRunner.query(`ALTER TABLE "student_notes" DROP CONSTRAINT "FK_student_notes_authorId"`);

        // 2. Eliminar Índices
        await queryRunner.query(`DROP INDEX "IDX_student_notes_title_content"`);
        await queryRunner.query(`DROP INDEX "IDX_student_notes_private"`);
        await queryRunner.query(`DROP INDEX "IDX_student_notes_favorite"`);
        await queryRunner.query(`DROP INDEX "IDX_student_notes_type"`);
        await queryRunner.query(`DROP INDEX "IDX_student_notes_subjectId"`);
        await queryRunner.query(`DROP INDEX "IDX_student_notes_relatedResourceId"`);
        await queryRunner.query(`DROP INDEX "IDX_student_notes_created_at"`);
        await queryRunner.query(`DROP INDEX "IDX_student_notes_authorId"`);
        await queryRunner.query(`DROP INDEX "IDX_student_notes_author_subject"`);

        // 3. Eliminar Tabla
        await queryRunner.query(`DROP TABLE "student_notes"`);

        // 4. Eliminar Enums
        await queryRunner.query(`DROP TYPE "student_note_type_enum"`);

        console.log('✅ Student Notes System rollback completed');
    }
}