import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameTeachernotesToTeacherNotes1757260000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename column from teachernotes (lowercase) to teacherNotes (camelCase)
        // This fixes the mismatch between the database column name and what TypeORM expects
        await queryRunner.query(
            `ALTER TABLE tasks RENAME COLUMN teachernotes TO "teacherNotes"`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse the rename operation
        await queryRunner.query(
            `ALTER TABLE tasks RENAME COLUMN "teacherNotes" TO teachernotes`
        );
    }
}