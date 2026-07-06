import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSharedNotesSystem1755704400000 implements MigrationInterface {
  name = 'CreateSharedNotesSystem1755704400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla shared_notes usando SQL directo
    await queryRunner.query(`
      CREATE TABLE "shared_notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "noteId" uuid NOT NULL,
        "sharedById" uuid NOT NULL,
        "sharedWithId" uuid NOT NULL,
        "sharedWithType" character varying NOT NULL DEFAULT 'student',
        "status" character varying NOT NULL DEFAULT 'active',
        "message" text,
        "permissions" text,
        "expiresAt" TIMESTAMP,
        "lastAccessedAt" TIMESTAMP,
        "accessCount" integer NOT NULL DEFAULT 0,
        "isNotified" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "sharedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_shared_notes" PRIMARY KEY ("id")
      )
    `);

    // Crear índices para optimizar consultas
    await queryRunner.query(`CREATE INDEX "IDX_shared_notes_noteId" ON "shared_notes" ("noteId")`);
    await queryRunner.query(`CREATE INDEX "IDX_shared_notes_sharedById" ON "shared_notes" ("sharedById")`);
    await queryRunner.query(`CREATE INDEX "IDX_shared_notes_sharedWithId" ON "shared_notes" ("sharedWithId")`);
    await queryRunner.query(`CREATE INDEX "IDX_shared_notes_note_shared_with" ON "shared_notes" ("noteId", "sharedWithId")`);
    await queryRunner.query(`CREATE INDEX "IDX_shared_notes_shared_at" ON "shared_notes" ("sharedAt")`);

    // Crear claves foráneas
    await queryRunner.query(`ALTER TABLE "shared_notes" ADD CONSTRAINT "FK_shared_notes_noteId" FOREIGN KEY ("noteId") REFERENCES "student_notes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "shared_notes" ADD CONSTRAINT "FK_shared_notes_sharedById" FOREIGN KEY ("sharedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "shared_notes" ADD CONSTRAINT "FK_shared_notes_sharedWithId" FOREIGN KEY ("sharedWithId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    // Crear restricción única para evitar compartir el mismo apunte múltiples veces con la misma persona
    await queryRunner.query(`ALTER TABLE "shared_notes" ADD CONSTRAINT "UQ_shared_notes_unique_active_sharing" UNIQUE ("noteId", "sharedById", "sharedWithId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar restricción única
    await queryRunner.query(`ALTER TABLE "shared_notes" DROP CONSTRAINT "UQ_shared_notes_unique_active_sharing"`);

    // Eliminar claves foráneas
    await queryRunner.query(`ALTER TABLE "shared_notes" DROP CONSTRAINT "FK_shared_notes_sharedWithId"`);
    await queryRunner.query(`ALTER TABLE "shared_notes" DROP CONSTRAINT "FK_shared_notes_sharedById"`);
    await queryRunner.query(`ALTER TABLE "shared_notes" DROP CONSTRAINT "FK_shared_notes_noteId"`);

    // Eliminar índices
    await queryRunner.query(`DROP INDEX "IDX_shared_notes_shared_at"`);
    await queryRunner.query(`DROP INDEX "IDX_shared_notes_note_shared_with"`);
    await queryRunner.query(`DROP INDEX "IDX_shared_notes_sharedWithId"`);
    await queryRunner.query(`DROP INDEX "IDX_shared_notes_sharedById"`);
    await queryRunner.query(`DROP INDEX "IDX_shared_notes_noteId"`);

    // Eliminar tabla
    await queryRunner.query(`DROP TABLE "shared_notes"`);
  }
}