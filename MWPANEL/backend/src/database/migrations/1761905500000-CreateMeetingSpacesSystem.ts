import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey } from 'typeorm';

export class CreateMeetingSpacesSystem1761905500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear tabla meeting_spaces
    await queryRunner.createTable(
      new Table({
        name: 'meeting_spaces',
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
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'location',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'capacity',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
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

    // 2. Añadir columna spaceId a meeting_bookings
    await queryRunner.addColumn(
      'meeting_bookings',
      new TableColumn({
        name: 'spaceId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // 3. Crear foreign key de meeting_bookings a meeting_spaces
    await queryRunner.createForeignKey(
      'meeting_bookings',
      new TableForeignKey({
        columnNames: ['spaceId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'meeting_spaces',
        onDelete: 'SET NULL',
      }),
    );

    // 4. Insertar espacios por defecto
    await queryRunner.query(`
      INSERT INTO meeting_spaces (id, name, type, location, capacity, color, "isActive")
      VALUES
        (uuid_generate_v4(), 'Oficina Principal', 'office', 'Planta 1', 4, '#3B82F6', true),
        (uuid_generate_v4(), 'Biblioteca', 'library', 'Planta 2', 10, '#10B981', true),
        (uuid_generate_v4(), 'Sala de Reuniones 1', 'meeting_room', 'Planta 1', 8, '#F59E0B', true),
        (uuid_generate_v4(), 'Sala de Reuniones 2', 'meeting_room', 'Planta 2', 6, '#EF4444', true),
        (uuid_generate_v4(), 'Aula Polivalente', 'classroom', 'Planta Baja', 20, '#8B5CF6', true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Eliminar foreign key
    const table = await queryRunner.getTable('meeting_bookings');
    const foreignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('spaceId') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('meeting_bookings', foreignKey);
    }

    // 2. Eliminar columna spaceId
    await queryRunner.dropColumn('meeting_bookings', 'spaceId');

    // 3. Eliminar tabla meeting_spaces
    await queryRunner.dropTable('meeting_spaces');
  }
}
