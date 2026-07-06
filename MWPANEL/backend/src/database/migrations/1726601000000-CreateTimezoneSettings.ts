/**
 * ⚠️ NO EJECUTAR — migración histórica incompatible.
 * Inserta `isPublic` en system_settings (columna inexistente) y rompe `migration:run`.
 * La tabla timezone_settings YA EXISTE en producción (esquema mantenido por working-tree + SQL directo).
 * En este repo el esquema NO se aplica por `migration:run`; ver CLAUDE.md.
 */
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTimezoneSettings1726601000000 implements MigrationInterface {
  name = 'CreateTimezoneSettings1726601000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla de configuración de timezone
    await queryRunner.createTable(
      new Table({
        name: 'timezone_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'timezone',
            type: 'varchar',
            length: '100',
            default: "'Europe/Madrid'",
            comment: 'Zona horaria principal del sistema',
          },
          {
            name: 'displayFormat',
            type: 'varchar',
            length: '50',
            default: "'DD/MM/YYYY HH:mm'",
            comment: 'Formato de display para fechas y horas',
          },
          {
            name: 'autoDST',
            type: 'boolean',
            default: true,
            comment: 'Ajuste automático horario de verano',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            comment: 'Si esta configuración está activa',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Insertar configuración por defecto para España
    await queryRunner.query(`
      INSERT INTO timezone_settings (timezone, "displayFormat", "autoDST", "isActive")
      VALUES ('Europe/Madrid', 'DD/MM/YYYY HH:mm', true, true)
    `);

    // Añadir configuración de timezone al sistema de settings existente
    await queryRunner.query(`
      INSERT INTO system_settings (key, value, description, "isPublic", category, "dataType")
      VALUES
        ('SYSTEM_TIMEZONE', 'Europe/Madrid', 'Zona horaria principal del sistema', false, 'system', 'string'),
        ('TIMEZONE_AUTO_DST', 'true', 'Ajuste automático horario de verano', false, 'system', 'boolean'),
        ('DATE_FORMAT', 'DD/MM/YYYY HH:mm', 'Formato de visualización de fechas', false, 'system', 'string')
      ON CONFLICT (key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar configuración del sistema
    await queryRunner.query(`
      DELETE FROM system_settings
      WHERE key IN ('SYSTEM_TIMEZONE', 'TIMEZONE_AUTO_DST', 'DATE_FORMAT')
    `);

    // Eliminar tabla
    await queryRunner.dropTable('timezone_settings');
  }
}