import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddGroupFieldsToConversations1765827711000 implements MigrationInterface {
  name = 'AddGroupFieldsToConversations1765827711000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar columna createdById - quien creo el grupo
    await queryRunner.addColumn(
      'conversations',
      new TableColumn({
        name: 'createdById',
        type: 'uuid',
        isNullable: true,
        comment: 'ID del usuario que creo el grupo (null para conversaciones directas)',
      })
    );

    // Agregar columna description - descripcion del grupo
    await queryRunner.addColumn(
      'conversations',
      new TableColumn({
        name: 'description',
        type: 'text',
        isNullable: true,
        comment: 'Descripcion del grupo de chat',
      })
    );

    // Agregar columna avatarUrl - avatar del grupo
    await queryRunner.addColumn(
      'conversations',
      new TableColumn({
        name: 'avatarUrl',
        type: 'varchar',
        length: '500',
        isNullable: true,
        comment: 'URL del avatar del grupo',
      })
    );

    // Agregar columna isArchived - para archivar grupos
    await queryRunner.addColumn(
      'conversations',
      new TableColumn({
        name: 'isArchived',
        type: 'boolean',
        default: false,
        comment: 'Indica si el grupo esta archivado',
      })
    );

    // Crear foreign key para createdById
    await queryRunner.createForeignKey(
      'conversations',
      new TableForeignKey({
        name: 'FK_conversations_createdBy',
        columnNames: ['createdById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      })
    );

    // Crear indice para buscar grupos por creador
    await queryRunner.createIndex(
      'conversations',
      new TableIndex({
        name: 'IDX_conversations_createdById',
        columnNames: ['createdById'],
      })
    );

    // Crear indice para filtrar por tipo (group vs direct)
    await queryRunner.createIndex(
      'conversations',
      new TableIndex({
        name: 'IDX_conversations_type',
        columnNames: ['type'],
      })
    );

    // Crear indice para filtrar archivados
    await queryRunner.createIndex(
      'conversations',
      new TableIndex({
        name: 'IDX_conversations_isArchived',
        columnNames: ['isArchived'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar indices
    await queryRunner.dropIndex('conversations', 'IDX_conversations_isArchived');
    await queryRunner.dropIndex('conversations', 'IDX_conversations_type');
    await queryRunner.dropIndex('conversations', 'IDX_conversations_createdById');

    // Eliminar foreign key
    await queryRunner.dropForeignKey('conversations', 'FK_conversations_createdBy');

    // Eliminar columnas
    await queryRunner.dropColumn('conversations', 'isArchived');
    await queryRunner.dropColumn('conversations', 'avatarUrl');
    await queryRunner.dropColumn('conversations', 'description');
    await queryRunner.dropColumn('conversations', 'createdById');
  }
}
