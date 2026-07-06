import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddCalendarEventIdToMeetingBookings1730450000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add calendarEventId column to meeting_bookings table
    await queryRunner.addColumn(
      'meeting_bookings',
      new TableColumn({
        name: 'calendarEventId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'meeting_bookings',
      new TableForeignKey({
        columnNames: ['calendarEventId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'calendar_events',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable('meeting_bookings');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('calendarEventId') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('meeting_bookings', foreignKey);
    }

    // Drop column
    await queryRunner.dropColumn('meeting_bookings', 'calendarEventId');
  }
}
