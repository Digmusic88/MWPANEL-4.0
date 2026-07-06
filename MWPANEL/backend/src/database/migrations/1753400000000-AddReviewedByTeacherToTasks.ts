import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewedByTeacherToTasks1753400000000 implements MigrationInterface {
  name = 'AddReviewedByTeacherToTasks1753400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" ADD "isReviewedByTeacher" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "isReviewedByTeacher"`);
  }
}