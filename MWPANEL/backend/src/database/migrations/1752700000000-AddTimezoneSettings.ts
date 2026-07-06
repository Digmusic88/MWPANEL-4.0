import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTimezoneSettings1752700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert timezone configuration settings
    await queryRunner.query(`
      INSERT INTO system_settings 
      ("id", "key", "name", "description", "type", "category", "value", "defaultValue", "isEditable", "requiresRestart", "validationRules", "sortOrder", "createdAt", "updatedAt")
      VALUES 
      (
        gen_random_uuid(),
        'system.timezone',
        'Zona Horaria del Sistema',
        'Zona horaria utilizada para mostrar fechas y horas en toda la plataforma. Soporta cambio automático horario de verano/invierno.',
        'string',
        'general',
        'Europe/Madrid',
        'Europe/Madrid',
        true,
        false,
        '{"allowedValues": ["Europe/Madrid", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Tokyo", "UTC"], "required": true}',
        10,
        NOW(),
        NOW()
      ),
      (
        gen_random_uuid(),
        'system.timezone_display_format',
        'Formato de Fecha y Hora',
        'Formato utilizado para mostrar fechas y horas en la interfaz de usuario.',
        'string',
        'general',
        'DD/MM/YYYY HH:mm',
        'DD/MM/YYYY HH:mm',
        true,
        false,
        '{"allowedValues": ["DD/MM/YYYY HH:mm", "MM/DD/YYYY HH:mm", "YYYY-MM-DD HH:mm", "DD-MM-YYYY HH:mm"], "required": true}',
        11,
        NOW(),
        NOW()
      ),
      (
        gen_random_uuid(),
        'system.auto_dst',
        'Cambio Automático Horario de Verano',
        'Habilitar cambio automático entre horario de verano e invierno según la zona horaria configurada.',
        'boolean',
        'general',
        'true',
        'true',
        true,
        false,
        '{"required": true}',
        12,
        NOW(),
        NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove timezone settings
    await queryRunner.query(`
      DELETE FROM system_settings 
      WHERE "key" IN ('system.timezone', 'system.timezone_display_format', 'system.auto_dst')
    `);
  }
}