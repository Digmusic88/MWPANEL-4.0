import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSharedWithToRubrics1735130000000 implements MigrationInterface {
    name = 'AddSharedWithToRubrics1735130000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "rubrics" 
            ADD COLUMN "sharedWith" text[] DEFAULT NULL
        `);
        
        // Crear índice para mejorar las consultas de rúbricas compartidas
        await queryRunner.query(`
            CREATE INDEX "IDX_rubrics_shared_with" 
            ON "rubrics" USING GIN ("sharedWith")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_rubrics_shared_with"`);
        await queryRunner.query(`ALTER TABLE "rubrics" DROP COLUMN "sharedWith"`);
    }
}