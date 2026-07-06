import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailAutomationSystem1752420000000 implements MigrationInterface {
    name = 'CreateEmailAutomationSystem1752420000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Crear tabla email_automations
        await queryRunner.query(`
            CREATE TABLE "email_automations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "eventType" character varying NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "templateId" uuid NOT NULL,
                "recipientType" character varying NOT NULL,
                "reminderDaysBefore" integer,
                "reminderTime" character varying,
                "conditions" text,
                "sendOnlyOnce" boolean NOT NULL DEFAULT false,
                "maxEmailsPerDay" integer,
                "totalEmailsSent" integer NOT NULL DEFAULT 0,
                "createdById" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_email_automations_name" UNIQUE ("name"),
                CONSTRAINT "PK_email_automations" PRIMARY KEY ("id")
            )
        `);

        // Crear índices para mejorar rendimiento
        await queryRunner.query(`CREATE INDEX "IDX_email_automations_eventType" ON "email_automations" ("eventType")`);
        await queryRunner.query(`CREATE INDEX "IDX_email_automations_isActive" ON "email_automations" ("isActive")`);
        await queryRunner.query(`CREATE INDEX "IDX_email_automations_recipientType" ON "email_automations" ("recipientType")`);

        // Crear foreign keys
        await queryRunner.query(`
            ALTER TABLE "email_automations" 
            ADD CONSTRAINT "FK_email_automations_templateId" 
            FOREIGN KEY ("templateId") REFERENCES "email_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "email_automations" 
            ADD CONSTRAINT "FK_email_automations_createdById" 
            FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        console.log('✅ Email Automation System tables created successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar foreign keys
        await queryRunner.query(`ALTER TABLE "email_automations" DROP CONSTRAINT "FK_email_automations_createdById"`);
        await queryRunner.query(`ALTER TABLE "email_automations" DROP CONSTRAINT "FK_email_automations_templateId"`);

        // Eliminar índices
        await queryRunner.query(`DROP INDEX "IDX_email_automations_recipientType"`);
        await queryRunner.query(`DROP INDEX "IDX_email_automations_isActive"`);
        await queryRunner.query(`DROP INDEX "IDX_email_automations_eventType"`);

        // Eliminar tabla
        await queryRunner.query(`DROP TABLE "email_automations"`);

        console.log('✅ Email Automation System tables dropped successfully');
    }
}