/**
 * Migration: CreateResourceFolders
 * Descripción: Crea la tabla resource_folders para organización jerárquica de recursos
 * Jerarquía: Asignatura > Carpeta personalizada > Recurso
 * Fecha: 2025-10-27
 */

import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateResourceFolders1753500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla resource_folders
    await queryRunner.createTable(
      new Table({
        name: 'resource_folders',
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
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'subjectId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'createdById',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'parentFolderId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'color',
            type: 'varchar',
            default: "'#1890ff'",
          },
          {
            name: 'displayOrder',
            type: 'int',
            default: 0,
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

    // Crear índices para resource_folders
    await queryRunner.createIndex(
      'resource_folders',
      new TableIndex({
        name: 'IDX_resource_folders_subjectId',
        columnNames: ['subjectId'],
      }),
    );

    await queryRunner.createIndex(
      'resource_folders',
      new TableIndex({
        name: 'IDX_resource_folders_createdById',
        columnNames: ['createdById'],
      }),
    );

    await queryRunner.createIndex(
      'resource_folders',
      new TableIndex({
        name: 'IDX_resource_folders_parentFolderId',
        columnNames: ['parentFolderId'],
      }),
    );

    // Crear foreign keys para resource_folders
    await queryRunner.createForeignKey(
      'resource_folders',
      new TableForeignKey({
        columnNames: ['subjectId'],
        referencedTableName: 'subjects',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'resource_folders',
      new TableForeignKey({
        columnNames: ['createdById'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'resource_folders',
      new TableForeignKey({
        columnNames: ['parentFolderId'],
        referencedTableName: 'resource_folders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Agregar campo folderId a educational_resources
    await queryRunner.query(`
      ALTER TABLE "educational_resources"
      ADD COLUMN "folderId" uuid NULL
    `);

    // Crear índice para folderId
    await queryRunner.createIndex(
      'educational_resources',
      new TableIndex({
        name: 'IDX_educational_resources_folderId',
        columnNames: ['folderId'],
      }),
    );

    // Crear foreign key para folderId
    await queryRunner.createForeignKey(
      'educational_resources',
      new TableForeignKey({
        columnNames: ['folderId'],
        referencedTableName: 'resource_folders',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign key de educational_resources.folderId
    const educationalResourcesTable = await queryRunner.getTable('educational_resources');
    const folderIdForeignKey = educationalResourcesTable.foreignKeys.find(
      fk => fk.columnNames.indexOf('folderId') !== -1,
    );
    if (folderIdForeignKey) {
      await queryRunner.dropForeignKey('educational_resources', folderIdForeignKey);
    }

    // Eliminar índice de folderId
    await queryRunner.dropIndex('educational_resources', 'IDX_educational_resources_folderId');

    // Eliminar columna folderId
    await queryRunner.query(`
      ALTER TABLE "educational_resources"
      DROP COLUMN "folderId"
    `);

    // Eliminar foreign keys de resource_folders
    const resourceFoldersTable = await queryRunner.getTable('resource_folders');
    const foreignKeys = resourceFoldersTable.foreignKeys;
    for (const foreignKey of foreignKeys) {
      await queryRunner.dropForeignKey('resource_folders', foreignKey);
    }

    // Eliminar índices de resource_folders
    await queryRunner.dropIndex('resource_folders', 'IDX_resource_folders_subjectId');
    await queryRunner.dropIndex('resource_folders', 'IDX_resource_folders_createdById');
    await queryRunner.dropIndex('resource_folders', 'IDX_resource_folders_parentFolderId');

    // Eliminar tabla resource_folders
    await queryRunner.dropTable('resource_folders');
  }
}
