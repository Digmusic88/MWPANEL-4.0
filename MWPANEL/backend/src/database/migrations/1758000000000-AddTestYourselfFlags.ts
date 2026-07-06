import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: AddTestYourselfFlags
 *
 * Purpose: Agregar flags para separar Test Yourself del sistema de tareas
 *
 * Changes:
 * - Agrega campo is_test_yourself para identificar Test Yourself
 * - Agrega campo visible_to_families para control de visibilidad
 * - Marca todos los exámenes existentes como Test Yourself
 * - Crea índices para optimizar queries de familias
 *
 * Rationale:
 * - Test Yourself son evaluaciones presenciales, no tareas con entrega
 * - Familias no deben verlos como "tareas sin entregar"
 * - Profesores deben controlar qué Test Yourself comparten
 */
export class AddTestYourselfFlags1758000000000 implements MigrationInterface {
  name = 'AddTestYourselfFlags1758000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar campos a tabla tasks
    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD COLUMN "is_test_yourself" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD COLUMN "visible_to_families" boolean NOT NULL DEFAULT false
    `);

    // 2. Marcar todos los exámenes existentes como Test Yourself
    // Por defecto, NO visibles para familias (mantener comportamiento actual mejorado)
    await queryRunner.query(`
      UPDATE "tasks"
      SET "is_test_yourself" = true,
          "visible_to_families" = false
      WHERE "taskType" = 'exam'
    `);

    // 3. Crear índices para optimizar queries de familias
    // Índice para filtrar Test Yourself rápidamente
    await queryRunner.query(`
      CREATE INDEX "IDX_tasks_is_test_yourself"
      ON "tasks" ("is_test_yourself")
    `);

    // Índice parcial para Test Yourself visibles (solo indexa cuando es relevante)
    await queryRunner.query(`
      CREATE INDEX "IDX_tasks_visible_families"
      ON "tasks" ("visible_to_families")
      WHERE "is_test_yourself" = true
    `);

    // Índice compuesto para queries comunes de familias
    await queryRunner.query(`
      CREATE INDEX "IDX_tasks_type_visibility"
      ON "tasks" ("is_test_yourself", "visible_to_families", "isActive")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Eliminar índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_tasks_type_visibility"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_tasks_visible_families"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_tasks_is_test_yourself"
    `);

    // 2. Eliminar columnas
    await queryRunner.query(`
      ALTER TABLE "tasks"
      DROP COLUMN "visible_to_families"
    `);

    await queryRunner.query(`
      ALTER TABLE "tasks"
      DROP COLUMN "is_test_yourself"
    `);
  }
}
