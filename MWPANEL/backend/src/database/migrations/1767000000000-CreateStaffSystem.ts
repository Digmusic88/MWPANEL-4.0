import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Migración: Sistema de Claustro (Staff)
 * Crea las tablas para gestión de tareas y reuniones del claustro
 */
export class CreateStaffSystem1767000000000 implements MigrationInterface {
  name = 'CreateStaffSystem1767000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear tipo enum para estado de tarea
    await queryRunner.query(`
      CREATE TYPE "staff_task_status_enum" AS ENUM ('pending', 'in_progress', 'completed')
    `);

    // 2. Crear tipo enum para prioridad de tarea
    await queryRunner.query(`
      CREATE TYPE "staff_task_priority_enum" AS ENUM ('low', 'medium', 'high')
    `);

    // 3. Crear tipo enum para estado de reunión
    await queryRunner.query(`
      CREATE TYPE "staff_meeting_status_enum" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled')
    `);

    // 4. Crear tipo enum para acciones de historial
    await queryRunner.query(`
      CREATE TYPE "staff_task_history_action_enum" AS ENUM (
        'created', 'status_changed', 'assigned', 'unassigned', 'accepted',
        'priority_changed', 'due_date_changed', 'comment_added', 'attachment_added',
        'attachment_removed', 'title_changed', 'description_changed', 'tags_changed',
        'meeting_linked', 'meeting_unlinked'
      )
    `);

    // 5. Crear tabla staff_tags
    await queryRunner.createTable(
      new Table({
        name: 'staff_tags',
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
            isUnique: true,
          },
          {
            name: 'color',
            type: 'varchar',
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

    // 6. Crear tabla staff_meetings
    await queryRunner.createTable(
      new Table({
        name: 'staff_meetings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'scheduledDate',
            type: 'timestamp',
          },
          {
            name: 'location',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'staff_meeting_status_enum',
            default: "'scheduled'",
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_by_id',
            type: 'uuid',
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
      }),
      true,
    );

    // 7. Crear tabla staff_meeting_agenda
    await queryRunner.createTable(
      new Table({
        name: 'staff_meeting_agenda',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'orderIndex',
            type: 'integer',
            default: 0,
          },
          {
            name: 'durationMinutes',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'isCompleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'meeting_id',
            type: 'uuid',
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
      }),
      true,
    );

    // 8. Crear tabla staff_tasks
    await queryRunner.createTable(
      new Table({
        name: 'staff_tasks',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'staff_task_status_enum',
            default: "'pending'",
          },
          {
            name: 'priority',
            type: 'staff_task_priority_enum',
            isNullable: true,
          },
          {
            name: 'dueDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'created_by_id',
            type: 'uuid',
          },
          {
            name: 'meeting_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
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
          },
        ],
      }),
      true,
    );

    // 9. Crear tabla staff_task_assignments
    await queryRunner.createTable(
      new Table({
        name: 'staff_task_assignments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'task_id',
            type: 'uuid',
          },
          {
            name: 'assigned_to_id',
            type: 'uuid',
          },
          {
            name: 'accepted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'acceptedAt',
            type: 'timestamp',
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

    // 10. Crear tabla staff_task_comments
    await queryRunner.createTable(
      new Table({
        name: 'staff_task_comments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'task_id',
            type: 'uuid',
          },
          {
            name: 'author_id',
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

    // 11. Crear tabla staff_task_attachments
    await queryRunner.createTable(
      new Table({
        name: 'staff_task_attachments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'filename',
            type: 'varchar',
          },
          {
            name: 'originalName',
            type: 'varchar',
          },
          {
            name: 'mimeType',
            type: 'varchar',
          },
          {
            name: 'size',
            type: 'integer',
          },
          {
            name: 'path',
            type: 'varchar',
          },
          {
            name: 'task_id',
            type: 'uuid',
          },
          {
            name: 'uploaded_by_id',
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

    // 12. Crear tabla staff_task_history
    await queryRunner.createTable(
      new Table({
        name: 'staff_task_history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'action',
            type: 'staff_task_history_action_enum',
          },
          {
            name: 'oldValue',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'newValue',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'task_id',
            type: 'uuid',
          },
          {
            name: 'changed_by_id',
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

    // 13. Crear tabla staff_task_tags (relación M:N)
    await queryRunner.createTable(
      new Table({
        name: 'staff_task_tags',
        columns: [
          {
            name: 'task_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'tag_id',
            type: 'uuid',
            isPrimary: true,
          },
        ],
      }),
      true,
    );

    // 14. Crear tabla staff_meeting_attendees (relación M:N)
    await queryRunner.createTable(
      new Table({
        name: 'staff_meeting_attendees',
        columns: [
          {
            name: 'meeting_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isPrimary: true,
          },
        ],
      }),
      true,
    );

    // 15. Crear foreign keys
    // staff_meetings -> users (created_by)
    await queryRunner.createForeignKey(
      'staff_meetings',
      new TableForeignKey({
        columnNames: ['created_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // staff_meeting_agenda -> staff_meetings
    await queryRunner.createForeignKey(
      'staff_meeting_agenda',
      new TableForeignKey({
        columnNames: ['meeting_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'staff_meetings',
        onDelete: 'CASCADE',
      }),
    );

    // staff_tasks -> users (created_by)
    await queryRunner.createForeignKey(
      'staff_tasks',
      new TableForeignKey({
        columnNames: ['created_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // staff_tasks -> staff_meetings
    await queryRunner.createForeignKey(
      'staff_tasks',
      new TableForeignKey({
        columnNames: ['meeting_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'staff_meetings',
        onDelete: 'SET NULL',
      }),
    );

    // staff_task_assignments -> staff_tasks
    await queryRunner.createForeignKey(
      'staff_task_assignments',
      new TableForeignKey({
        columnNames: ['task_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'staff_tasks',
        onDelete: 'CASCADE',
      }),
    );

    // staff_task_assignments -> users
    await queryRunner.createForeignKey(
      'staff_task_assignments',
      new TableForeignKey({
        columnNames: ['assigned_to_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // staff_task_comments -> staff_tasks
    await queryRunner.createForeignKey(
      'staff_task_comments',
      new TableForeignKey({
        columnNames: ['task_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'staff_tasks',
        onDelete: 'CASCADE',
      }),
    );

    // staff_task_comments -> users
    await queryRunner.createForeignKey(
      'staff_task_comments',
      new TableForeignKey({
        columnNames: ['author_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // staff_task_attachments -> staff_tasks
    await queryRunner.createForeignKey(
      'staff_task_attachments',
      new TableForeignKey({
        columnNames: ['task_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'staff_tasks',
        onDelete: 'CASCADE',
      }),
    );

    // staff_task_attachments -> users
    await queryRunner.createForeignKey(
      'staff_task_attachments',
      new TableForeignKey({
        columnNames: ['uploaded_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // staff_task_history -> staff_tasks
    await queryRunner.createForeignKey(
      'staff_task_history',
      new TableForeignKey({
        columnNames: ['task_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'staff_tasks',
        onDelete: 'CASCADE',
      }),
    );

    // staff_task_history -> users
    await queryRunner.createForeignKey(
      'staff_task_history',
      new TableForeignKey({
        columnNames: ['changed_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // staff_task_tags -> staff_tasks
    await queryRunner.createForeignKey(
      'staff_task_tags',
      new TableForeignKey({
        columnNames: ['task_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'staff_tasks',
        onDelete: 'CASCADE',
      }),
    );

    // staff_task_tags -> staff_tags
    await queryRunner.createForeignKey(
      'staff_task_tags',
      new TableForeignKey({
        columnNames: ['tag_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'staff_tags',
        onDelete: 'CASCADE',
      }),
    );

    // staff_meeting_attendees -> staff_meetings
    await queryRunner.createForeignKey(
      'staff_meeting_attendees',
      new TableForeignKey({
        columnNames: ['meeting_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'staff_meetings',
        onDelete: 'CASCADE',
      }),
    );

    // staff_meeting_attendees -> users
    await queryRunner.createForeignKey(
      'staff_meeting_attendees',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // 16. Crear índices para optimización
    await queryRunner.createIndex(
      'staff_tasks',
      new TableIndex({
        name: 'IDX_STAFF_TASKS_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'staff_tasks',
      new TableIndex({
        name: 'IDX_STAFF_TASKS_CREATED_BY',
        columnNames: ['created_by_id'],
      }),
    );

    await queryRunner.createIndex(
      'staff_tasks',
      new TableIndex({
        name: 'IDX_STAFF_TASKS_DUE_DATE',
        columnNames: ['dueDate'],
      }),
    );

    await queryRunner.createIndex(
      'staff_meetings',
      new TableIndex({
        name: 'IDX_STAFF_MEETINGS_SCHEDULED_DATE',
        columnNames: ['scheduledDate'],
      }),
    );

    await queryRunner.createIndex(
      'staff_meetings',
      new TableIndex({
        name: 'IDX_STAFF_MEETINGS_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'staff_task_assignments',
      new TableIndex({
        name: 'IDX_STAFF_TASK_ASSIGNMENTS_ASSIGNED_TO',
        columnNames: ['assigned_to_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign keys primero (en orden inverso)
    const tables = [
      'staff_meeting_attendees',
      'staff_task_tags',
      'staff_task_history',
      'staff_task_attachments',
      'staff_task_comments',
      'staff_task_assignments',
      'staff_tasks',
      'staff_meeting_agenda',
      'staff_meetings',
    ];

    for (const table of tables) {
      const tableData = await queryRunner.getTable(table);
      if (tableData) {
        for (const foreignKey of tableData.foreignKeys) {
          await queryRunner.dropForeignKey(table, foreignKey);
        }
      }
    }

    // Eliminar índices
    await queryRunner.dropIndex('staff_task_assignments', 'IDX_STAFF_TASK_ASSIGNMENTS_ASSIGNED_TO');
    await queryRunner.dropIndex('staff_meetings', 'IDX_STAFF_MEETINGS_STATUS');
    await queryRunner.dropIndex('staff_meetings', 'IDX_STAFF_MEETINGS_SCHEDULED_DATE');
    await queryRunner.dropIndex('staff_tasks', 'IDX_STAFF_TASKS_DUE_DATE');
    await queryRunner.dropIndex('staff_tasks', 'IDX_STAFF_TASKS_CREATED_BY');
    await queryRunner.dropIndex('staff_tasks', 'IDX_STAFF_TASKS_STATUS');

    // Eliminar tablas en orden inverso
    await queryRunner.dropTable('staff_meeting_attendees');
    await queryRunner.dropTable('staff_task_tags');
    await queryRunner.dropTable('staff_task_history');
    await queryRunner.dropTable('staff_task_attachments');
    await queryRunner.dropTable('staff_task_comments');
    await queryRunner.dropTable('staff_task_assignments');
    await queryRunner.dropTable('staff_tasks');
    await queryRunner.dropTable('staff_meeting_agenda');
    await queryRunner.dropTable('staff_meetings');
    await queryRunner.dropTable('staff_tags');

    // Eliminar enums
    await queryRunner.query(`DROP TYPE "staff_task_history_action_enum"`);
    await queryRunner.query(`DROP TYPE "staff_meeting_status_enum"`);
    await queryRunner.query(`DROP TYPE "staff_task_priority_enum"`);
    await queryRunner.query(`DROP TYPE "staff_task_status_enum"`);
  }
}
