import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración: Alinea basic_knowledge con el esquema vivo de producción.
 *
 * Origen: src/database/manual/2026-06-25-basic-knowledge-add-subjectid.sql
 * fue aplicado directamente a prod (2026-06-25) sin archivo de migración.
 * Esta migración lo representa para que el esquema sea reconstruible
 * desde TypeORM migrations solamente.
 *
 * Es ADITIVA e IDEMPOTENTE: usa IF NOT EXISTS / DROP CONSTRAINT IF EXISTS,
 * de modo que ejecutarla sobre prod (donde los cambios ya existen) es un no-op.
 */
export class AlignBasicKnowledgeAreaAnchor1790000000000 implements MigrationInterface {
  name = 'AlignBasicKnowledgeAreaAnchor1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Añadir columna subjectId (uuid, nullable) si aún no existe
    await queryRunner.query(`
      ALTER TABLE basic_knowledge ADD COLUMN IF NOT EXISTS "subjectId" uuid
    `);

    // 2. Asegura que specificCompetencyId sea nullable (no-op si ya lo es)
    await queryRunner.query(`
      ALTER TABLE basic_knowledge ALTER COLUMN "specificCompetencyId" DROP NOT NULL
    `);

    // 3. Recrear la FK de forma idempotente (drop-then-add)
    await queryRunner.query(`
      ALTER TABLE basic_knowledge DROP CONSTRAINT IF EXISTS "FK_bk_subject"
    `);
    await queryRunner.query(`
      ALTER TABLE basic_knowledge ADD CONSTRAINT "FK_bk_subject"
        FOREIGN KEY ("subjectId") REFERENCES subjects(id) ON DELETE SET NULL
    `);

    // 4. Crear índice si no existe
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_basic_knowledge_subject"
        ON basic_knowledge ("subjectId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir partes aditivas de forma segura

    // 1. Eliminar índice
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_basic_knowledge_subject"
    `);

    // 2. Eliminar FK
    await queryRunner.query(`
      ALTER TABLE basic_knowledge DROP CONSTRAINT IF EXISTS "FK_bk_subject"
    `);

    // 3. Eliminar columna subjectId
    await queryRunner.query(`
      ALTER TABLE basic_knowledge DROP COLUMN IF EXISTS "subjectId"
    `);

    // Nota: NO se restaura NOT NULL en specificCompetencyId porque
    // podrían existir filas con null tras ejecutar up(); hacerlo
    // causaría error de constraint en esos casos.
  }
}
