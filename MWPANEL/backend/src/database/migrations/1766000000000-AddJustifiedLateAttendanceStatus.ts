import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJustifiedLateAttendanceStatus1766000000000 implements MigrationInterface {
  name = 'AddJustifiedLateAttendanceStatus1766000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'justified_late' value to the attendance_records_status_enum
    await queryRunner.query(`
      ALTER TYPE "attendance_records_status_enum" ADD VALUE IF NOT EXISTS 'justified_late'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL does not support removing values from enums directly
    // To rollback, you would need to:
    // 1. Create a new enum type without 'justified_late'
    // 2. Update all columns to use the new type
    // 3. Drop the old type
    // 4. Rename the new type
    // This is intentionally left as a warning since it's a complex operation
    console.warn('Rolling back enum value addition requires manual intervention');
    console.warn('justified_late value cannot be removed automatically from attendance_records_status_enum');
  }
}
