import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateBlogPublishingPermissions1763500000000 implements MigrationInterface {
  name = 'CreateBlogPublishingPermissions1763500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla de permisos de publicación del blog
    await queryRunner.createTable(
      new Table({
        name: 'blog_publishing_permissions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'teacherId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'classGroupId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'createdById',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Crear restricción única para evitar duplicados
    await queryRunner.query(`
      ALTER TABLE blog_publishing_permissions
      ADD CONSTRAINT UQ_blog_permissions_teacher_group
      UNIQUE (\"teacherId\", \"classGroupId\")
    `);

    // Crear índices para búsquedas rápidas
    await queryRunner.createIndex(
      'blog_publishing_permissions',
      new TableIndex({
        name: 'IDX_blog_permissions_teacher',
        columnNames: ['teacherId'],
      }),
    );

    await queryRunner.createIndex(
      'blog_publishing_permissions',
      new TableIndex({
        name: 'IDX_blog_permissions_group',
        columnNames: ['classGroupId'],
      }),
    );

    // Crear foreign keys
    await queryRunner.createForeignKey(
      'blog_publishing_permissions',
      new TableForeignKey({
        name: 'FK_blog_permissions_teacher',
        columnNames: ['teacherId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'blog_publishing_permissions',
      new TableForeignKey({
        name: 'FK_blog_permissions_group',
        columnNames: ['classGroupId'],
        referencedTableName: 'class_groups',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'blog_publishing_permissions',
      new TableForeignKey({
        name: 'FK_blog_permissions_created_by',
        columnNames: ['createdById'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    console.log('✅ Blog publishing permissions table created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign keys
    await queryRunner.dropForeignKey(
      'blog_publishing_permissions',
      'FK_blog_permissions_created_by',
    );
    await queryRunner.dropForeignKey(
      'blog_publishing_permissions',
      'FK_blog_permissions_group',
    );
    await queryRunner.dropForeignKey(
      'blog_publishing_permissions',
      'FK_blog_permissions_teacher',
    );

    // Eliminar índices
    await queryRunner.dropIndex(
      'blog_publishing_permissions',
      'IDX_blog_permissions_group',
    );
    await queryRunner.dropIndex(
      'blog_publishing_permissions',
      'IDX_blog_permissions_teacher',
    );

    // Eliminar tabla
    await queryRunner.dropTable('blog_publishing_permissions');

    console.log('✅ Blog publishing permissions table dropped successfully');
  }
}
