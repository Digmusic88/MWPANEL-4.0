import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLogbookSystem1753100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tabla de etiquetas (categorías creadas por el profesor)
    await queryRunner.query(`
      CREATE TABLE logbook_tags (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name           TEXT NOT NULL,
        color_hex      CHAR(7) NOT NULL,           -- '#RRGGBB'
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(owner_user_id, LOWER(name))
      );
    `);

    // Tabla de entradas de bitácora
    await queryRunner.query(`
      CREATE TABLE logbook_entries (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tag_id           UUID NULL REFERENCES logbook_tags(id) ON DELETE SET NULL,
        title            TEXT NOT NULL,            -- breve titular
        content_rich     JSONB NOT NULL,           -- doc del editor (TipTap/ProseMirror) o HTML/MD
        content_plain    TEXT NULL,                -- texto plano para búsqueda
        date_local       DATE NOT NULL,            -- día al que pertenece la entrada
        started_at_local TIME NULL,                -- hora inicio (opcional)
        ended_at_local   TIME NULL,                -- hora fin (opcional)
        duration_min     INT  NULL,                -- cache útil
        pinned           BOOLEAN NOT NULL DEFAULT false,
        visibility       TEXT NOT NULL DEFAULT 'private', -- 'private'|'staff'|'admin'
        attachments_cnt  INT NOT NULL DEFAULT 0,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (visibility IN ('private', 'staff', 'admin')),
        CHECK (started_at_local IS NULL OR ended_at_local IS NULL OR started_at_local <= ended_at_local)
      );
    `);

    // Adjuntos (opcional)
    await queryRunner.query(`
      CREATE TABLE logbook_attachments (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_id       UUID NOT NULL REFERENCES logbook_entries(id) ON DELETE CASCADE,
        owner_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_name      TEXT NOT NULL,
        mime_type      TEXT NOT NULL,
        byte_size      BIGINT NOT NULL,
        storage_key    TEXT NOT NULL,              -- ruta en tu bucket
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Índices recomendados
    await queryRunner.query(`
      CREATE INDEX ON logbook_entries (owner_user_id, date_local DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX ON logbook_entries (owner_user_id, tag_id, date_local DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX ON logbook_tags (owner_user_id);
    `);

    // Índice de búsqueda de texto completo (para búsqueda en contenido)
    await queryRunner.query(`
      CREATE INDEX logbook_entries_search_idx ON logbook_entries
      USING GIN (to_tsvector('spanish', title || ' ' || COALESCE(content_plain, '')));
    `);

    // Función para actualizar content_plain automáticamente cuando cambie content_rich
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_logbook_entry_content_plain()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Extraer texto plano del JSON de content_rich
        NEW.content_plain := COALESCE(NEW.content_rich->>'plain', '');
        NEW.updated_at := now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Trigger para actualizar content_plain automáticamente
    await queryRunner.query(`
      CREATE TRIGGER update_logbook_entry_content_plain_trigger
        BEFORE INSERT OR UPDATE ON logbook_entries
        FOR EACH ROW
        EXECUTE FUNCTION update_logbook_entry_content_plain();
    `);

    // Función para calcular duración en minutos
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION calculate_logbook_entry_duration()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Calcular duración si ambas horas están presentes
        IF NEW.started_at_local IS NOT NULL AND NEW.ended_at_local IS NOT NULL THEN
          NEW.duration_min := EXTRACT(EPOCH FROM (NEW.ended_at_local - NEW.started_at_local)) / 60;
        ELSE
          NEW.duration_min := NULL;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Trigger para calcular duración automáticamente
    await queryRunner.query(`
      CREATE TRIGGER calculate_logbook_entry_duration_trigger
        BEFORE INSERT OR UPDATE ON logbook_entries
        FOR EACH ROW
        EXECUTE FUNCTION calculate_logbook_entry_duration();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar triggers y funciones
    await queryRunner.query(`DROP TRIGGER IF EXISTS calculate_logbook_entry_duration_trigger ON logbook_entries;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS calculate_logbook_entry_duration();`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_logbook_entry_content_plain_trigger ON logbook_entries;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_logbook_entry_content_plain();`);

    // Eliminar tablas (en orden inverso por las FK)
    await queryRunner.query(`DROP TABLE IF EXISTS logbook_attachments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS logbook_entries;`);
    await queryRunner.query(`DROP TABLE IF EXISTS logbook_tags;`);
  }
}