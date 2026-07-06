import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateConversationReadStatus1734326900000 implements MigrationInterface {
  name = 'CreateConversationReadStatus1734326900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla de tracking de lectura por usuario por conversación
    await queryRunner.createTable(
      new Table({
        name: 'conversation_read_status',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'conversation_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'last_read_at',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Crear índice único para evitar duplicados
    await queryRunner.createIndex(
      'conversation_read_status',
      new TableIndex({
        name: 'IDX_conversation_read_status_user_conversation',
        columnNames: ['user_id', 'conversation_id'],
        isUnique: true,
      }),
    );

    // Crear índice para búsquedas rápidas
    await queryRunner.createIndex(
      'conversation_read_status',
      new TableIndex({
        name: 'IDX_conversation_read_status_user',
        columnNames: ['user_id'],
      }),
    );

    // Foreign key a users
    await queryRunner.createForeignKey(
      'conversation_read_status',
      new TableForeignKey({
        name: 'FK_conversation_read_status_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Foreign key a conversations
    await queryRunner.createForeignKey(
      'conversation_read_status',
      new TableForeignKey({
        name: 'FK_conversation_read_status_conversation',
        columnNames: ['conversation_id'],
        referencedTableName: 'conversations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    console.log('✅ Created conversation_read_status table for per-user read tracking');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign keys
    await queryRunner.dropForeignKey('conversation_read_status', 'FK_conversation_read_status_user');
    await queryRunner.dropForeignKey('conversation_read_status', 'FK_conversation_read_status_conversation');

    // Eliminar índices
    await queryRunner.dropIndex('conversation_read_status', 'IDX_conversation_read_status_user_conversation');
    await queryRunner.dropIndex('conversation_read_status', 'IDX_conversation_read_status_user');

    // Eliminar tabla
    await queryRunner.dropTable('conversation_read_status');

    console.log('❌ Dropped conversation_read_status table');
  }
}
