import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixMeetingBookingUniqueConstraint1763202000000 implements MigrationInterface {
  name = 'FixMeetingBookingUniqueConstraint1763202000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old constraint that applies to ALL bookings
    await queryRunner.query(
      `ALTER TABLE "meeting_bookings" DROP CONSTRAINT IF EXISTS "uq_family_student_period_booking"`,
    );

    // Create a partial unique index that only applies to active bookings (confirmed, pending)
    // This allows the same family/student/period combination if previous booking was cancelled
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_family_student_period_active_booking"
       ON "meeting_bookings" ("familyId", "studentId", "periodId")
       WHERE status IN ('confirmed', 'pending')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the partial unique index
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_family_student_period_active_booking"`,
    );

    // Recreate the old constraint
    await queryRunner.query(
      `ALTER TABLE "meeting_bookings"
       ADD CONSTRAINT "uq_family_student_period_booking"
       UNIQUE ("familyId", "studentId", "periodId")`,
    );
  }
}
