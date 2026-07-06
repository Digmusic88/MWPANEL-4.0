import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateStudentNotesConfig1755803000000 implements MigrationInterface {
  name = 'CreateStudentNotesConfig1755803000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'student_notes_config',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'config_key',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'config_value',
            type: 'text',
          },
          {
            name: 'config_type',
            type: 'varchar',
            length: '20',
            default: "'string'",
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'student_notes_config',
      new TableIndex({
        name: 'IDX_student_notes_config_key',
        columnNames: ['config_key']
      })
    );

    // Insertar configuraciones por defecto
    await queryRunner.query(`
      INSERT INTO student_notes_config (config_key, config_value, config_type, description) VALUES
      ('maxFileSize', '20', 'number', 'Tamaño máximo de archivo en MB'),
      ('allowedFileTypes', '["image/*", "audio/*"]', 'json', 'Tipos de archivo permitidos'),
      ('enableSharing', 'true', 'boolean', 'Permitir compartir apuntes'),
      ('maxNotesPerUser', '1000', 'number', 'Máximo de apuntes por usuario'),
      ('autoDeleteAfterDays', 'null', 'json', 'Eliminar automáticamente después de N días'),
      ('moderationEnabled', 'false', 'boolean', 'Activar moderación de contenido')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('student_notes_config', 'IDX_student_notes_config_key');
    await queryRunner.dropTable('student_notes_config');
  }
}