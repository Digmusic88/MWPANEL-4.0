import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeStudentIdNullableInMeetingBookings1692345600000 implements MigrationInterface {
    name = 'MakeStudentIdNullableInMeetingBookings1692345600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Make studentId nullable to allow family-wide meetings without specific student
        await queryRunner.query(`ALTER TABLE "meeting_bookings" ALTER COLUMN "studentId" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert studentId to NOT NULL (caution: this may fail if there are null values)
        await queryRunner.query(`ALTER TABLE "meeting_bookings" ALTER COLUMN "studentId" SET NOT NULL`);
    }
}