import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCommunicationConfigSystem1757962800000 implements MigrationInterface {
  name = 'CreateCommunicationConfigSystem1757962800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla communication_configs
    await queryRunner.createTable(
      new Table({
        name: 'communication_configs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
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
            isNullable: true,
          },
          {
            name: 'studentId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'familyId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'isEnabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'configType',
            type: 'enum',
            enum: ['class_group', 'student', 'family'],
            default: "'class_group'",
          },
          {
            name: 'adminNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'configuredByUserId',
            type: 'uuid',
            isNullable: true,
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
        foreignKeys: [
          {
            name: 'FK_communication_configs_teacher',
            columnNames: ['teacherId'],
            referencedTableName: 'teachers',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_communication_configs_class_group',
            columnNames: ['classGroupId'],
            referencedTableName: 'class_groups',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_communication_configs_student',
            columnNames: ['studentId'],
            referencedTableName: 'students',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_communication_configs_family',
            columnNames: ['familyId'],
            referencedTableName: 'families',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_communication_configs_configured_by',
            columnNames: ['configuredByUserId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    // Crear índices únicos para evitar duplicados
    await queryRunner.createIndex(
      'communication_configs',
      new TableIndex({
        name: 'IDX_communication_configs_teacher_class_group',
        columnNames: ['teacherId', 'classGroupId'],
        isUnique: true,
        where: 'classGroupId IS NOT NULL AND studentId IS NULL AND familyId IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'communication_configs',
      new TableIndex({
        name: 'IDX_communication_configs_teacher_student',
        columnNames: ['teacherId', 'studentId'],
        isUnique: true,
        where: 'studentId IS NOT NULL AND classGroupId IS NULL AND familyId IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'communication_configs',
      new TableIndex({
        name: 'IDX_communication_configs_teacher_family',
        columnNames: ['teacherId', 'familyId'],
        isUnique: true,
        where: 'familyId IS NOT NULL AND classGroupId IS NULL AND studentId IS NULL',
      }),
    );

    // Índices para rendimiento
    await queryRunner.createIndex(
      'communication_configs',
      new TableIndex({
        name: 'IDX_communication_configs_teacher_enabled',
        columnNames: ['teacherId', 'isEnabled'],
      }),
    );

    await queryRunner.createIndex(
      'communication_configs',
      new TableIndex({
        name: 'IDX_communication_configs_config_type',
        columnNames: ['configType'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar tabla
    await queryRunner.dropTable('communication_configs');
  }
}