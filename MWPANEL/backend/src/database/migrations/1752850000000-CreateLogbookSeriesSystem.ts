import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLogbookSeriesSystem1752850000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear tabla logbook_series para gestión de plantillas recurrentes
    await queryRunner.query(`
      CREATE TABLE logbook_series (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_user_id    UUID NOT NULL,
        rule_rrule       TEXT NOT NULL,
        start_date       DATE NOT NULL,
        end_date         DATE NOT NULL,
        started_at_local TIME NULL,
        ended_at_local   TIME NULL,
        tag_id           UUID NULL REFERENCES logbook_tags(id) ON DELETE SET NULL,
        visibility       TEXT NOT NULL DEFAULT 'private',
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

        -- Foreign keys
        CONSTRAINT fk_logbook_series_owner_user FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 2. Crear índices para logbook_series
    await queryRunner.query(`
      CREATE INDEX idx_logbook_series_owner_user_id ON logbook_series (owner_user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_logbook_series_dates ON logbook_series (owner_user_id, start_date, end_date);
    `);

    // 3. Agregar columnas a logbook_entries para soporte de series
    await queryRunner.query(`
      ALTER TABLE logbook_entries
      ADD COLUMN series_id UUID NULL REFERENCES logbook_series(id) ON DELETE SET NULL,
      ADD COLUMN is_placeholder BOOLEAN NOT NULL DEFAULT false;
    `);

    // 4. Crear índices para las nuevas columnas
    await queryRunner.query(`
      CREATE INDEX idx_logbook_entries_series ON logbook_entries (series_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_logbook_entries_series_date ON logbook_entries (owner_user_id, series_id, date_local);
    `);

    // 5. Crear índice único para evitar duplicados por ocurrencia semanal
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_logbook_series_occurrence
      ON logbook_entries (owner_user_id, series_id, date_local)
      WHERE series_id IS NOT NULL;
    `);

    // 6. Crear índice para filtrado por placeholders
    await queryRunner.query(`
      CREATE INDEX idx_logbook_entries_placeholder ON logbook_entries (owner_user_id, is_placeholder);
    `);

    // 7. Agregar trigger para updated_at en logbook_series
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_logbook_series_updated_at
      BEFORE UPDATE ON logbook_series
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar trigger
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_logbook_series_updated_at ON logbook_series;`);

    // Eliminar función si no se usa en otros lugares
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column();`);

    // Eliminar índices de logbook_entries
    await queryRunner.query(`DROP INDEX IF EXISTS idx_logbook_entries_placeholder;`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_logbook_series_occurrence;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_logbook_entries_series_date;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_logbook_entries_series;`);

    // Eliminar columnas de logbook_entries
    await queryRunner.query(`ALTER TABLE logbook_entries DROP COLUMN IF EXISTS is_placeholder;`);
    await queryRunner.query(`ALTER TABLE logbook_entries DROP COLUMN IF EXISTS series_id;`);

    // Eliminar índices de logbook_series
    await queryRunner.query(`DROP INDEX IF EXISTS idx_logbook_series_dates;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_logbook_series_owner_user_id;`);

    // Eliminar tabla logbook_series
    await queryRunner.query(`DROP TABLE IF EXISTS logbook_series;`);
  }
}