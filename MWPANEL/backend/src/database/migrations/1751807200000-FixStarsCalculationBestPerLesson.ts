import { MigrationInterface, QueryRunner } from "typeorm";

export class FixStarsCalculationBestPerLesson1751807200000 implements MigrationInterface {
    name = 'FixStarsCalculationBestPerLesson1751807200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Fix total_stars calculation to use best score per lesson instead of accumulating all attempts
        await queryRunner.query(`
            SET "total_stars" = COALESCE((
                SELECT SUM(best_stars.max_stars)
                FROM (
                    SELECT 
                        "lesson_id",
                        MAX(CAST(COALESCE(
                            CASE 
                                WHEN "session_data" ? 'starsEarned' 
                                THEN CAST("session_data"->>'starsEarned' AS INTEGER)
                                ELSE 0 
                            END, 0) AS INTEGER)) as max_stars
                    AND "completed" = true
                    AND "lesson_id" IS NOT NULL
                    GROUP BY "lesson_id"
                ) best_stars
            ), 0)
        `);
        
        // Add helpful logging to understand the fix
        console.log('✅ Fixed total_stars calculation to use best score per lesson');
        console.log('📊 Now shows realistic star counts (max 3 stars per lesson, max 540 total)');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert to the original (incorrect) calculation that sums all session stars
        await queryRunner.query(`
            SET "total_stars" = COALESCE((
                SELECT SUM(CAST(COALESCE(
                    CASE 
                        WHEN "session_data" ? 'starsEarned' 
                        THEN CAST("session_data"->>'starsEarned' AS INTEGER)
                        ELSE 0 
                    END, 0) AS INTEGER))
                AND "completed" = true
            ), 0)
        `);
    }
}