import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddViewCountToMessageReadStatus1767200000000 implements MigrationInterface {
  name = 'AddViewCountToMessageReadStatus1767200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "message_read_status"
      ADD COLUMN IF NOT EXISTS "view_count" integer NOT NULL DEFAULT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "message_read_status"
      DROP COLUMN IF EXISTS "view_count"
    `);
  }
}
