import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShortDescriptionToOperativeDescriptors1752700000000 implements MigrationInterface {
    name = 'AddShortDescriptionToOperativeDescriptors1752700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "operative_descriptors" 
            ADD COLUMN "shortDescription" text;
        `);
        
        await queryRunner.query(`
            COMMENT ON COLUMN "operative_descriptors"."shortDescription" IS 'Versión resumida del descriptor para interfaces de usuario';
        `);
        
        await queryRunner.query(`
            COMMENT ON COLUMN "operative_descriptors"."description" IS 'Descripción completa oficial del descriptor operativo';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "operative_descriptors" 
            DROP COLUMN "shortDescription";
        `);
    }
}