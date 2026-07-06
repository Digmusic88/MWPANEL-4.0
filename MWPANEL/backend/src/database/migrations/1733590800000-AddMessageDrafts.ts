import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageDrafts1733590800000 implements MigrationInterface {
  name = 'AddMessageDrafts1733590800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add isDraft column to messages table
    await queryRunner.query(`
      ALTER TABLE "messages"
      ADD COLUMN IF NOT EXISTS "isDraft" boolean NOT NULL DEFAULT false
    `);

    // Add index for faster draft queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_messages_isDraft_senderId"
      ON "messages" ("isDraft", "senderId")
      WHERE "isDraft" = true
    `);

    console.log('✅ Migration AddMessageDrafts: isDraft column added to messages table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_messages_isDraft_senderId"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN IF EXISTS "isDraft"`);
    console.log('✅ Migration AddMessageDrafts: Reverted');
  }
}
