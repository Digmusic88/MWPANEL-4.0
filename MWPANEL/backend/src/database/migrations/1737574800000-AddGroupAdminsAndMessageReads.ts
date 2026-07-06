import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGroupAdminsAndMessageReads1737574800000 implements MigrationInterface {
  name = 'AddGroupAdminsAndMessageReads1737574800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar columna isAdmin a message_group_members
    await queryRunner.query(`
      ALTER TABLE "message_group_members"
      ADD COLUMN "isAdmin" boolean NOT NULL DEFAULT false
    `);

    // 2. Crear tabla para trackear lecturas de mensajes en grupos
    await queryRunner.query(`
      CREATE TABLE "message_read_status" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "messageId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "readAt" TIMESTAMP NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_message_read_status" PRIMARY KEY ("id")
      )
    `);

    // 3. Crear índices para optimizar consultas
    await queryRunner.query(`
      CREATE INDEX "IDX_message_read_status_message"
      ON "message_read_status" ("messageId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_message_read_status_user"
      ON "message_read_status" ("userId")
    `);

    // 4. Crear constraint único para evitar duplicados
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_message_user_read"
      ON "message_read_status" ("messageId", "userId")
    `);

    // 5. Agregar foreign keys
    await queryRunner.query(`
      ALTER TABLE "message_read_status"
      ADD CONSTRAINT "FK_message_read_status_message"
      FOREIGN KEY ("messageId")
      REFERENCES "messages"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "message_read_status"
      ADD CONSTRAINT "FK_message_read_status_user"
      FOREIGN KEY ("userId")
      REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    // 6. Hacer que el creador del grupo sea admin automáticamente
    await queryRunner.query(`
      UPDATE "message_group_members" m
      SET "isAdmin" = true
      FROM "message_groups" g
      WHERE m."groupId" = g.id
      AND m."userId" = g."createdById"
    `);

    console.log('✅ Migration: Added group admins and message read tracking');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir en orden inverso

    // 1. Eliminar foreign keys
    await queryRunner.query(`
      ALTER TABLE "message_read_status"
      DROP CONSTRAINT "FK_message_read_status_user"
    `);

    await queryRunner.query(`
      ALTER TABLE "message_read_status"
      DROP CONSTRAINT "FK_message_read_status_message"
    `);

    // 2. Eliminar índices
    await queryRunner.query(`
      DROP INDEX "UQ_message_user_read"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_message_read_status_user"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_message_read_status_message"
    `);

    // 3. Eliminar tabla
    await queryRunner.query(`
      DROP TABLE "message_read_status"
    `);

    // 4. Eliminar columna isAdmin
    await queryRunner.query(`
      ALTER TABLE "message_group_members"
      DROP COLUMN "isAdmin"
    `);

    console.log('✅ Migration reverted: Removed group admins and message read tracking');
  }
}
