import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRubricIdToTasks1753700000000 implements MigrationInterface {
    name = 'AddRubricIdToTasks1753700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" ADD "rubricId" uuid`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_rubricId" FOREIGN KEY ("rubricId") REFERENCES "rubrics"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_rubricId"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "rubricId"`);
    }
}