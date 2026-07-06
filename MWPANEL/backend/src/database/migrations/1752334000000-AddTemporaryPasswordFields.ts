import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTemporaryPasswordFields1752334000000 implements MigrationInterface {
    name = 'AddTemporaryPasswordFields1752334000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "temporaryPasswordHash" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "isPasswordTemporary" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isPasswordTemporary"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "temporaryPasswordHash"`);
    }
}