import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateTaskSubjectAssignments1733405000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla task_subject_assignments para relación many-to-many
    await queryRunner.createTable(
      new Table({
        name: 'task_subject_assignments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'taskId',
            type: 'uuid',
          },
          {
            name: 'subjectAssignmentId',
            type: 'uuid',
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

    // Crear índice único para evitar duplicados
    await queryRunner.createIndex(
      'task_subject_assignments',
      new TableIndex({
        name: 'IDX_task_subject_assignments_unique',
        columnNames: ['taskId', 'subjectAssignmentId'],
        isUnique: true,
      }),
    );

    // Foreign key a tasks
    await queryRunner.createForeignKey(
      'task_subject_assignments',
      new TableForeignKey({
        columnNames: ['taskId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tasks',
        onDelete: 'CASCADE',
      }),
    );

    // Foreign key a subject_assignments
    await queryRunner.createForeignKey(
      'task_subject_assignments',
      new TableForeignKey({
        columnNames: ['subjectAssignmentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'subject_assignments',
        onDelete: 'CASCADE',
      }),
    );

    console.log('✅ Tabla task_subject_assignments creada exitosamente');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('task_subject_assignments');
    console.log('✅ Tabla task_subject_assignments eliminada');
  }
}
