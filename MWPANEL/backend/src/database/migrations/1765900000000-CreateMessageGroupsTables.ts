import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateMessageGroupsTables1765900000000 implements MigrationInterface {
  name = 'CreateMessageGroupsTables1765900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear el enum type para GroupType
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "group_type_enum" AS ENUM ('admin_broadcast', 'teacher_class', 'teacher_subject', 'custom');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Crear tabla message_groups
    await queryRunner.createTable(
      new Table({
        name: 'message_groups',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'group_type_enum',
            default: "'custom'",
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isDefault',
            type: 'boolean',
            default: false,
          },
          {
            name: 'config',
            type: 'text',
            isNullable: true,
            comment: 'JSON config for automatic member inclusion',
          },
          {
            name: 'createdById',
            type: 'uuid',
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
      true
    );

    // Crear tabla message_group_members
    await queryRunner.createTable(
      new Table({
        name: 'message_group_members',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'groupId',
            type: 'uuid',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'addedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // Crear foreign keys para message_groups
    await queryRunner.createForeignKey(
      'message_groups',
      new TableForeignKey({
        name: 'FK_message_groups_createdBy',
        columnNames: ['createdById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    // Crear foreign keys para message_group_members
    await queryRunner.createForeignKey(
      'message_group_members',
      new TableForeignKey({
        name: 'FK_message_group_members_group',
        columnNames: ['groupId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'message_groups',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'message_group_members',
      new TableForeignKey({
        name: 'FK_message_group_members_user',
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    // Crear indices para message_groups
    await queryRunner.createIndex(
      'message_groups',
      new TableIndex({
        name: 'IDX_message_groups_createdById',
        columnNames: ['createdById'],
      })
    );

    await queryRunner.createIndex(
      'message_groups',
      new TableIndex({
        name: 'IDX_message_groups_type',
        columnNames: ['type'],
      })
    );

    await queryRunner.createIndex(
      'message_groups',
      new TableIndex({
        name: 'IDX_message_groups_isActive',
        columnNames: ['isActive'],
      })
    );

    // Crear indices para message_group_members
    await queryRunner.createIndex(
      'message_group_members',
      new TableIndex({
        name: 'IDX_message_group_members_groupId',
        columnNames: ['groupId'],
      })
    );

    await queryRunner.createIndex(
      'message_group_members',
      new TableIndex({
        name: 'IDX_message_group_members_userId',
        columnNames: ['userId'],
      })
    );

    // Crear indice unico para evitar duplicados en membresía
    await queryRunner.createIndex(
      'message_group_members',
      new TableIndex({
        name: 'IDX_message_group_members_unique',
        columnNames: ['groupId', 'userId'],
        isUnique: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar indices de message_group_members
    await queryRunner.dropIndex('message_group_members', 'IDX_message_group_members_unique');
    await queryRunner.dropIndex('message_group_members', 'IDX_message_group_members_userId');
    await queryRunner.dropIndex('message_group_members', 'IDX_message_group_members_groupId');

    // Eliminar indices de message_groups
    await queryRunner.dropIndex('message_groups', 'IDX_message_groups_isActive');
    await queryRunner.dropIndex('message_groups', 'IDX_message_groups_type');
    await queryRunner.dropIndex('message_groups', 'IDX_message_groups_createdById');

    // Eliminar foreign keys
    await queryRunner.dropForeignKey('message_group_members', 'FK_message_group_members_user');
    await queryRunner.dropForeignKey('message_group_members', 'FK_message_group_members_group');
    await queryRunner.dropForeignKey('message_groups', 'FK_message_groups_createdBy');

    // Eliminar tablas
    await queryRunner.dropTable('message_group_members');
    await queryRunner.dropTable('message_groups');

    // Eliminar el enum type
    await queryRunner.query(`DROP TYPE IF EXISTS "group_type_enum"`);
  }
}
