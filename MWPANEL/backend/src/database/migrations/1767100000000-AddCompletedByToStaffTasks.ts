/**
 * @archivo: 1767100000000-AddCompletedByToStaffTasks.ts
 * @modulo: Staff (Claustro)
 * @funcion: Añadir campo completed_by_id para registrar quien completo cada tarea
 */

import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddCompletedByToStaffTasks1767100000000 implements MigrationInterface {
  name = 'AddCompletedByToStaffTasks1767100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar si la tabla staff_tasks existe
    const tableExists = await queryRunner.hasTable('staff_tasks');
    if (!tableExists) {
      console.log('Tabla staff_tasks no existe, saltando migracion');
      return;
    }

    // Verificar si la columna ya existe
    const columnExists = await queryRunner.hasColumn('staff_tasks', 'completed_by_id');
    if (columnExists) {
      console.log('Columna completed_by_id ya existe, saltando migracion');
      return;
    }

    // Añadir columna completed_by_id
    await queryRunner.addColumn(
      'staff_tasks',
      new TableColumn({
        name: 'completed_by_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Añadir foreign key a users
    await queryRunner.createForeignKey(
      'staff_tasks',
      new TableForeignKey({
        name: 'FK_staff_tasks_completed_by',
        columnNames: ['completed_by_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    console.log('Columna completed_by_id añadida a staff_tasks');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('staff_tasks');
    if (!tableExists) {
      return;
    }

    // Eliminar foreign key
    const table = await queryRunner.getTable('staff_tasks');
    const foreignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf('completed_by_id') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('staff_tasks', foreignKey);
    }

    // Eliminar columna
    const columnExists = await queryRunner.hasColumn('staff_tasks', 'completed_by_id');
    if (columnExists) {
      await queryRunner.dropColumn('staff_tasks', 'completed_by_id');
    }
  }
}
