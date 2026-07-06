import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateBackupTypesForTimeMachine1752997200000 implements MigrationInterface {
    name = 'UpdateBackupTypesForTimeMachine1752997200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new time-machine backup types to the enum
        await queryRunner.query(`
            ALTER TYPE "backup_records_type_enum" ADD VALUE 'time-machine-hourly';
        `);
        
        await queryRunner.query(`
            ALTER TYPE "backup_records_type_enum" ADD VALUE 'time-machine-daily';
        `);
        
        await queryRunner.query(`
            ALTER TYPE "backup_records_type_enum" ADD VALUE 'time-machine-weekly';
        `);
        
        await queryRunner.query(`
            ALTER TYPE "backup_records_type_enum" ADD VALUE 'time-machine-monthly';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: PostgreSQL doesn't allow removing enum values directly
        // This would require recreating the enum and updating the table
        // For production, you might want to create a new enum and migrate data
        await queryRunner.query(`
            -- Remove enum values (this is a placeholder - actual implementation would be complex)
            -- ALTER TYPE "backup_records_type_enum" DROP VALUE 'time-machine-hourly';
            -- PostgreSQL doesn't support DROP VALUE for enum types
        `);
    }
}