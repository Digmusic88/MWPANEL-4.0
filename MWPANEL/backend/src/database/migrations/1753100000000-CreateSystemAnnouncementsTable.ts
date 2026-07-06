import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateSystemAnnouncementsTable1753100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'system_announcements',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['info', 'warning', 'error', 'success'],
            default: "'info'",
          },
          {
            name: 'targetRoles',
            type: 'text[]',
            isNullable: false,
            comment: 'Roles a los que se dirige el mensaje: admin, teacher, student, family',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'priority',
            type: 'integer',
            default: 0,
            comment: 'Prioridad de visualización (mayor número = mayor prioridad)',
          },
          {
            name: 'createdById',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Add foreign key to users table
    await queryRunner.createForeignKey(
      'system_announcements',
      new TableForeignKey({
        columnNames: ['createdById'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create index for active announcements
    await queryRunner.query(`
      CREATE INDEX idx_system_announcements_active
      ON system_announcements (isActive, priority DESC, createdAt DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('system_announcements', 'idx_system_announcements_active');
    await queryRunner.dropTable('system_announcements');
  }
}
