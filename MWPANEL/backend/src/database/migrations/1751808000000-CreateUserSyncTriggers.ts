import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserSyncTriggers1751808000000 implements MigrationInterface {
    name = 'CreateUserSyncTriggers1751808000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create function to automatically create TypeQuest profile when user is created
        await queryRunner.query(`
            RETURNS TRIGGER AS $$
            DECLARE
                user_age_group VARCHAR;
                user_coins INTEGER;
                user_avatar JSONB;
            BEGIN
                -- Determine age group based on role
                CASE NEW.role
                    WHEN 'student' THEN user_age_group := 'explorer';
                    WHEN 'teacher' THEN user_age_group := 'master';
                    WHEN 'admin' THEN user_age_group := 'expert';
                    WHEN 'family' THEN user_age_group := 'guardian';
                    ELSE user_age_group := 'explorer';
                END CASE;

                -- Set initial coins based on role
                CASE NEW.role
                    WHEN 'student' THEN user_coins := 100;
                    WHEN 'teacher' THEN user_coins := 500;
                    WHEN 'admin' THEN user_coins := 1000;
                    WHEN 'family' THEN user_coins := 200;
                    ELSE user_coins := 100;
                END CASE;

                -- Create default avatar configuration
                CASE NEW.role
                    WHEN 'student' THEN user_avatar := '{"base": "child", "hair": "default", "clothes": "uniform", "accessories": "none"}';
                    WHEN 'teacher' THEN user_avatar := '{"base": "adult", "hair": "professional", "clothes": "business", "accessories": "glasses"}';
                    WHEN 'admin' THEN user_avatar := '{"base": "adult", "hair": "formal", "clothes": "suit", "accessories": "badge"}';
                    WHEN 'family' THEN user_avatar := '{"base": "adult", "hair": "casual", "clothes": "casual", "accessories": "none"}';
                    ELSE user_avatar := '{"base": "default", "hair": "default", "clothes": "default", "accessories": "none"}';
                END CASE;

                -- Insert TypeQuest profile
                    user_id,
                    level,
                    xp,
                    total_time_played,
                    accuracy_average,
                    wpm_average,
                    current_streak,
                    coins,
                    age_group,
                    preferred_language,
                    avatar_config
                ) VALUES (
                    NEW.id,
                    1,
                    0,
                    0,
                    100.00,
                    0.00,
                    0,
                    user_coins,
                    user_age_group,
                    'es',
                    user_avatar
                );

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Create trigger for new user creation
        await queryRunner.query(`
                AFTER INSERT ON users
                FOR EACH ROW
                WHEN (NEW."isActive" = true)
        `);

        // Create function to sync user profile updates
        await queryRunner.query(`
            RETURNS TRIGGER AS $$
            BEGIN
                -- Update TypeQuest profile when user role changes
                IF OLD.role != NEW.role THEN
                    SET 
                        age_group = CASE NEW.role
                            WHEN 'student' THEN 'explorer'
                            WHEN 'teacher' THEN 'master'
                            WHEN 'admin' THEN 'expert'
                            WHEN 'family' THEN 'guardian'
                            ELSE 'explorer'
                        END,
                        updated_at = now()
                    WHERE user_id = NEW.id;
                END IF;

                -- If user is deactivated, we don't delete the profile but could mark it
                -- This preserves game progress while respecting data privacy
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Create trigger for user updates
        await queryRunner.query(`
                AFTER UPDATE ON users
                FOR EACH ROW
        `);

        // Create function to update daily stats when session ends
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_daily_stats_trigger()
            RETURNS TRIGGER AS $$
            DECLARE
                session_date DATE;
                existing_stats RECORD;
            BEGIN
                -- Only process completed sessions
                IF NEW.completed = true AND NEW.end_time IS NOT NULL THEN
                    session_date := NEW.end_time::DATE;
                    
                    -- Check if daily stats record exists
                    SELECT * INTO existing_stats 
                    WHERE user_id = NEW.user_id AND date = session_date;
                    
                    IF existing_stats IS NOT NULL THEN
                        -- Update existing daily stats
                            time_played = time_played + NEW.duration,
                            sessions_count = sessions_count + 1,
                            best_wpm = GREATEST(best_wpm, NEW.wpm_average),
                            best_accuracy = GREATEST(best_accuracy, NEW.accuracy),
                            xp_earned = xp_earned + NEW.xp_earned,
                            coins_earned = coins_earned + NEW.coins_earned,
                            games_completed = games_completed + 1,
                            updated_at = now()
                        WHERE user_id = NEW.user_id AND date = session_date;
                    ELSE
                        -- Create new daily stats record
                            user_id,
                            date,
                            time_played,
                            sessions_count,
                            best_wpm,
                            best_accuracy,
                            xp_earned,
                            coins_earned,
                            games_completed,
                            lessons_completed,
                            achievements_unlocked,
                            daily_challenge_completed
                        ) VALUES (
                            NEW.user_id,
                            session_date,
                            NEW.duration,
                            1,
                            NEW.wpm_average,
                            NEW.accuracy,
                            NEW.xp_earned,
                            NEW.coins_earned,
                            1,
                            0,
                            0,
                            false
                        );
                    END IF;
                    
                    -- Update user profile totals
                        total_time_played = total_time_played + NEW.duration,
                        xp = xp + NEW.xp_earned,
                        coins = coins + NEW.coins_earned,
                        wpm_average = (
                            SELECT ROUND(AVG(wmp_average), 2) 
                            WHERE user_id = NEW.user_id AND completed = true
                        ),
                        accuracy_average = (
                            SELECT ROUND(AVG(accuracy), 2) 
                            WHERE user_id = NEW.user_id AND completed = true
                        ),
                        last_played_at = NEW.end_time,
                        updated_at = now()
                    WHERE user_id = NEW.user_id;
                END IF;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Create trigger for session completion
        await queryRunner.query(`
            CREATE TRIGGER trigger_update_daily_stats
                FOR EACH ROW
                WHEN (NEW.completed = true AND OLD.completed = false)
                EXECUTE FUNCTION update_daily_stats_trigger();
        `);

        // Create indexes for performance optimization
        await queryRunner.query(`
        `);
        
        await queryRunner.query(`
        `);
        
        await queryRunner.query(`
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop triggers

        // Drop functions
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_daily_stats_trigger();`);

        // Drop indexes
    }
}