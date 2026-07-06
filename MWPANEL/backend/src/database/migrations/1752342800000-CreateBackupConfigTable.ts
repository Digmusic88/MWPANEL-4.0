import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateBackupConfigTable1752342800000 implements MigrationInterface {
  name = 'CreateBackupConfigTable1752342800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'backup_config',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'enableAutoBackup',
            type: 'boolean',
            default: true,
          },
          {
            name: 'backupFrequency',
            type: 'enum',
            enum: ['daily', 'weekly', 'monthly'],
            default: "'daily'",
          },
          {
            name: 'backupTime',
            type: 'varchar',
            length: '5',
            default: "'02:00'",
          },
          {
            name: 'retentionCount',
            type: 'integer',
            default: 10,
          },
          {
            name: 'lastBackupTime',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'nextBackupTime',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
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
      true,
    );

    // Insert default configuration
    await queryRunner.query(`
      INSERT INTO backup_config (
        "enableAutoBackup",
        "backupFrequency", 
        "backupTime",
        "retentionCount",
        "isActive"
      ) VALUES (
        true,
        'daily',
        '02:00',
        10,
        true
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('backup_config');
  }
}