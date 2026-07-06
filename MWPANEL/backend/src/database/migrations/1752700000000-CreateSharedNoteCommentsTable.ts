import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSharedNoteCommentsTable1752700000000 implements MigrationInterface {
  name = 'CreateSharedNoteCommentsTable1752700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create shared_note_comments table
    await queryRunner.createTable(
      new Table({
        name: 'shared_note_comments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'sharedNoteId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
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
          },
        ],
        indices: [
          {
            name: 'IDX_shared_note_comments_shared_note_id',
            columnNames: ['sharedNoteId']
          },
          {
            name: 'IDX_shared_note_comments_user_id', 
            columnNames: ['userId']
          },
          {
            name: 'IDX_shared_note_comments_created_at',
            columnNames: ['createdAt']
          }
        ],
      }),
      true
    );

    // Add foreign key constraints
    await queryRunner.createForeignKey(
      'shared_note_comments',
      new TableForeignKey({
        columnNames: ['sharedNoteId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'shared_notes',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'shared_note_comments',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    const table = await queryRunner.getTable('shared_note_comments');
    if (table) {
      const foreignKeys = table.foreignKeys.filter(fk => fk.columnNames.indexOf('sharedNoteId') !== -1 || fk.columnNames.indexOf('userId') !== -1);
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('shared_note_comments', foreignKey);
      }
    }

    // Drop the table
    await queryRunner.dropTable('shared_note_comments');
  }
}