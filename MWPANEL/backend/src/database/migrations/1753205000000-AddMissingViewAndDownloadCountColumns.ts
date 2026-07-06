import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissingViewAndDownloadCountColumns1753205000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add missing view_count and download_count columns to lesson_resources table
        await queryRunner.query(`
            ALTER TABLE lesson_resources 
            ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS download_count integer NOT NULL DEFAULT 0;
        `);

        // Create indexes for better performance on these columns
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_lesson_resources_view_count ON lesson_resources(view_count);
        `);
        
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_lesson_resources_download_count ON lesson_resources(download_count);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes first
        await queryRunner.query(`DROP INDEX IF EXISTS idx_lesson_resources_view_count;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_lesson_resources_download_count;`);
        
        // Remove the columns
        await queryRunner.query(`
            ALTER TABLE lesson_resources 
            DROP COLUMN IF EXISTS view_count,
            DROP COLUMN IF EXISTS download_count;
        `);
    }
}