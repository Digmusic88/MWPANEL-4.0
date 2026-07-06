import { MigrationInterface, QueryRunner } from "typeorm";

export class AddArchivedFieldToLessonWorkspaces1753186842000 implements MigrationInterface {
    name = 'AddArchivedFieldToLessonWorkspaces1753186842000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lesson_workspaces" ADD "is_archived" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lesson_workspaces" DROP COLUMN "is_archived"`);
    }
}