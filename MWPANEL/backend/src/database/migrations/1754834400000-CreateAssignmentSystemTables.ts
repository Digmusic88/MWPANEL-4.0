/**
 * @migration: CreateAssignmentSystemTables
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Avanzado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Migración que crea todas las tablas necesarias para el nuevo sistema de asignaciones.
 * Incluye las 5 tablas principales y sus índices optimizados.
 * 
 * TABLAS CREADAS:
 * - assignment_campaigns: Campañas de asignación
 * - campaign_resources: Recursos por campaña
 * - campaign_targets: Targets multi-tipo
 * - assignment_progress: Progreso individual
 * - assignment_conditions: Condiciones y reglas
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 1.3
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAssignmentSystemTables1754834400000 implements MigrationInterface {
    name = 'CreateAssignmentSystemTables1754834400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // === 1. CREAR ENUMS ===
        
        await queryRunner.query(`
            CREATE TYPE "assignment_campaign_type_enum" AS ENUM(
                'SINGLE', 'BULK', 'RECURRING', 'CONDITIONAL'
            )
        `);

        await queryRunner.query(`
            CREATE TYPE "assignment_campaign_status_enum" AS ENUM(
                'DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED'
            )
        `);

        await queryRunner.query(`
            CREATE TYPE "campaign_target_type_enum" AS ENUM(
                'INDIVIDUAL', 'CLASS', 'SUBJECT', 'GRADE_LEVEL', 'CUSTOM_GROUP'
            )
        `);

        await queryRunner.query(`
            CREATE TYPE "campaign_target_status_enum" AS ENUM(
                'PENDING', 'ACTIVE', 'COMPLETED', 'SKIPPED'
            )
        `);

        await queryRunner.query(`
            CREATE TYPE "assignment_progress_status_enum" AS ENUM(
                'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED', 'SKIPPED'
            )
        `);

        await queryRunner.query(`
            CREATE TYPE "assignment_condition_type_enum" AS ENUM(
                'PREREQUISITE', 'PERFORMANCE', 'DATE', 'COMPLETION', 'CUSTOM'
            )
        `);

        await queryRunner.query(`
            CREATE TYPE "assignment_condition_apply_to_enum" AS ENUM(
                'ALL', 'INDIVIDUAL', 'GROUP'
            )
        `);

        // === 2. TABLA PRINCIPAL: assignment_campaigns ===
        
        await queryRunner.query(`
            CREATE TABLE "assignment_campaigns" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(200) NOT NULL,
                "description" text,
                "campaignType" "assignment_campaign_type_enum" NOT NULL DEFAULT 'SINGLE',
                "createdById" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "startDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "endDate" TIMESTAMP,
                "dueDate" TIMESTAMP,
                "status" "assignment_campaign_status_enum" NOT NULL DEFAULT 'DRAFT',
                "priority" integer NOT NULL DEFAULT 0,
                "autoAssignment" boolean NOT NULL DEFAULT false,
                "allowLateSubmission" boolean NOT NULL DEFAULT true,
                "sendReminders" boolean NOT NULL DEFAULT true,
                "totalTargets" integer NOT NULL DEFAULT 0,
                "completionRate" numeric(5,2) NOT NULL DEFAULT 0,
                "avgTimeToComplete" numeric(10,2),
                "effectivenessScore" numeric(3,2),
                CONSTRAINT "PK_assignment_campaigns" PRIMARY KEY ("id")
            )
        `);

        // === 3. TABLA: campaign_resources ===
        
        await queryRunner.query(`
            CREATE TABLE "campaign_resources" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "campaignId" uuid NOT NULL,
                "resourceId" uuid NOT NULL,
                "isRequired" boolean NOT NULL DEFAULT true,
                "orderIndex" integer NOT NULL DEFAULT 0,
                "estimatedTime" integer,
                "instructions" text,
                "viewsCount" integer NOT NULL DEFAULT 0,
                "completionsCount" integer NOT NULL DEFAULT 0,
                "avgRating" numeric(3,2),
                "avgTimeSpent" numeric(10,2),
                "completionRate" numeric(5,2) NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_campaign_resources" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_campaign_resource" UNIQUE ("campaignId", "resourceId")
            )
        `);

        // === 4. TABLA: campaign_targets ===
        
        await queryRunner.query(`
            CREATE TABLE "campaign_targets" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "campaignId" uuid NOT NULL,
                "targetType" "campaign_target_type_enum" NOT NULL,
                "targetId" uuid NOT NULL,
                "targetMetadata" jsonb,
                "personalizedInstructions" text,
                "customDueDate" TIMESTAMP,
                "difficultyAdjustment" numeric(3,2) NOT NULL DEFAULT 1.0,
                "status" "campaign_target_status_enum" NOT NULL DEFAULT 'PENDING',
                "assignedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "progressPercentage" numeric(5,2) NOT NULL DEFAULT 0,
                "timeSpent" integer NOT NULL DEFAULT 0,
                "lastActivity" TIMESTAMP,
                "completedAt" TIMESTAMP,
                "totalIndividuals" integer NOT NULL DEFAULT 0,
                "completedIndividuals" integer NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_campaign_targets" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_campaign_target" UNIQUE ("campaignId", "targetType", "targetId")
            )
        `);

        // === 5. TABLA: assignment_progress ===
        
        await queryRunner.query(`
            CREATE TABLE "assignment_progress" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "campaignId" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "resourceId" uuid,
                "status" "assignment_progress_status_enum" NOT NULL DEFAULT 'NOT_STARTED',
                "startedAt" TIMESTAMP,
                "completedAt" TIMESTAMP,
                "lastAccessedAt" TIMESTAMP,
                "reviewedAt" TIMESTAMP,
                "timeSpent" integer NOT NULL DEFAULT 0,
                "viewCount" integer NOT NULL DEFAULT 0,
                "interactionCount" integer NOT NULL DEFAULT 0,
                "downloadCount" integer NOT NULL DEFAULT 0,
                "selfRating" integer,
                "teacherRating" integer,
                "feedback" text,
                "teacherNotes" text,
                "engagementScore" numeric(3,2),
                "difficultyPerceived" integer,
                "learningOutcomeAchieved" boolean,
                "completionPercentage" numeric(5,2) NOT NULL DEFAULT 0,
                "contextData" jsonb,
                "interactionEvents" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_assignment_progress" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_user_campaign_resource" UNIQUE ("userId", "campaignId", "resourceId"),
                CONSTRAINT "CHK_ratings_range" CHECK ("selfRating" BETWEEN 1 AND 5 AND "teacherRating" BETWEEN 1 AND 5),
                CONSTRAINT "CHK_difficulty_range" CHECK ("difficultyPerceived" BETWEEN 1 AND 5),
                CONSTRAINT "CHK_engagement_score" CHECK ("engagementScore" BETWEEN 0 AND 1)
            )
        `);

        // === 6. TABLA: assignment_conditions ===
        
        await queryRunner.query(`
            CREATE TABLE "assignment_conditions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "campaignId" uuid NOT NULL,
                "conditionType" "assignment_condition_type_enum" NOT NULL,
                "conditionConfig" jsonb NOT NULL,
                "applyTo" "assignment_condition_apply_to_enum" NOT NULL DEFAULT 'ALL',
                "targetFilter" jsonb,
                "description" text,
                "failureMessage" text,
                "priority" integer NOT NULL DEFAULT 0,
                "isActive" boolean NOT NULL DEFAULT true,
                "activatesAt" TIMESTAMP,
                "expiresAt" TIMESTAMP,
                "evaluationCount" integer NOT NULL DEFAULT 0,
                "successCount" integer NOT NULL DEFAULT 0,
                "failureCount" integer NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_assignment_conditions" PRIMARY KEY ("id")
            )
        `);

        // === 7. CREAR ÍNDICES OPTIMIZADOS ===
        
        // Índices para assignment_campaigns
        await queryRunner.query(`CREATE INDEX "IDX_campaign_created_by_date" ON "assignment_campaigns" ("createdById", "createdAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_campaign_status_priority" ON "assignment_campaigns" ("status", "priority")`);
        await queryRunner.query(`CREATE INDEX "IDX_campaign_dates" ON "assignment_campaigns" ("startDate", "endDate", "dueDate")`);
        await queryRunner.query(`CREATE INDEX "IDX_assignment_campaigns_createdById" ON "assignment_campaigns" ("createdById")`);

        // Índices para campaign_resources
        await queryRunner.query(`CREATE INDEX "IDX_campaign_resources_campaign_order" ON "campaign_resources" ("campaignId", "orderIndex")`);
        await queryRunner.query(`CREATE INDEX "IDX_campaign_resources_campaignId" ON "campaign_resources" ("campaignId")`);
        await queryRunner.query(`CREATE INDEX "IDX_campaign_resources_resourceId" ON "campaign_resources" ("resourceId")`);

        // Índices para campaign_targets
        await queryRunner.query(`CREATE INDEX "IDX_campaign_targets_type_id" ON "campaign_targets" ("targetType", "targetId")`);
        await queryRunner.query(`CREATE INDEX "IDX_campaign_targets_campaign_status" ON "campaign_targets" ("campaignId", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_campaign_targets_campaignId" ON "campaign_targets" ("campaignId")`);

        // Índices para assignment_progress
        await queryRunner.query(`CREATE INDEX "IDX_assignment_progress_user_status" ON "assignment_progress" ("userId", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_assignment_progress_campaign_completion" ON "assignment_progress" ("campaignId", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_assignment_progress_resource_progress" ON "assignment_progress" ("resourceId", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_assignment_progress_campaignId" ON "assignment_progress" ("campaignId")`);
        await queryRunner.query(`CREATE INDEX "IDX_assignment_progress_userId" ON "assignment_progress" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_assignment_progress_resourceId" ON "assignment_progress" ("resourceId")`);

        // Índices para assignment_conditions
        await queryRunner.query(`CREATE INDEX "IDX_assignment_conditions_campaign_type" ON "assignment_conditions" ("campaignId", "conditionType")`);
        await queryRunner.query(`CREATE INDEX "IDX_assignment_conditions_active" ON "assignment_conditions" ("isActive")`);
        await queryRunner.query(`CREATE INDEX "IDX_assignment_conditions_campaignId" ON "assignment_conditions" ("campaignId")`);

        // === 8. CREAR FOREIGN KEYS ===
        
        // Foreign keys para assignment_campaigns
        await queryRunner.query(`
            ALTER TABLE "assignment_campaigns" 
            ADD CONSTRAINT "FK_assignment_campaigns_createdById" 
            FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        // Foreign keys para campaign_resources
        await queryRunner.query(`
            ALTER TABLE "campaign_resources" 
            ADD CONSTRAINT "FK_campaign_resources_campaignId" 
            FOREIGN KEY ("campaignId") REFERENCES "assignment_campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "campaign_resources" 
            ADD CONSTRAINT "FK_campaign_resources_resourceId" 
            FOREIGN KEY ("resourceId") REFERENCES "educational_resources"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        // Foreign keys para campaign_targets
        await queryRunner.query(`
            ALTER TABLE "campaign_targets" 
            ADD CONSTRAINT "FK_campaign_targets_campaignId" 
            FOREIGN KEY ("campaignId") REFERENCES "assignment_campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // Foreign keys para assignment_progress
        await queryRunner.query(`
            ALTER TABLE "assignment_progress" 
            ADD CONSTRAINT "FK_assignment_progress_campaignId" 
            FOREIGN KEY ("campaignId") REFERENCES "assignment_campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "assignment_progress" 
            ADD CONSTRAINT "FK_assignment_progress_userId" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "assignment_progress" 
            ADD CONSTRAINT "FK_assignment_progress_resourceId" 
            FOREIGN KEY ("resourceId") REFERENCES "educational_resources"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        // Foreign keys para assignment_conditions
        await queryRunner.query(`
            ALTER TABLE "assignment_conditions" 
            ADD CONSTRAINT "FK_assignment_conditions_campaignId" 
            FOREIGN KEY ("campaignId") REFERENCES "assignment_campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        console.log('✅ Assignment System Tables created successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // === ROLLBACK: ELIMINAR EN ORDEN INVERSO ===
        
        // 1. Eliminar Foreign Keys
        await queryRunner.query(`ALTER TABLE "assignment_conditions" DROP CONSTRAINT "FK_assignment_conditions_campaignId"`);
        await queryRunner.query(`ALTER TABLE "assignment_progress" DROP CONSTRAINT "FK_assignment_progress_resourceId"`);
        await queryRunner.query(`ALTER TABLE "assignment_progress" DROP CONSTRAINT "FK_assignment_progress_userId"`);
        await queryRunner.query(`ALTER TABLE "assignment_progress" DROP CONSTRAINT "FK_assignment_progress_campaignId"`);
        await queryRunner.query(`ALTER TABLE "campaign_targets" DROP CONSTRAINT "FK_campaign_targets_campaignId"`);
        await queryRunner.query(`ALTER TABLE "campaign_resources" DROP CONSTRAINT "FK_campaign_resources_resourceId"`);
        await queryRunner.query(`ALTER TABLE "campaign_resources" DROP CONSTRAINT "FK_campaign_resources_campaignId"`);
        await queryRunner.query(`ALTER TABLE "assignment_campaigns" DROP CONSTRAINT "FK_assignment_campaigns_createdById"`);

        // 2. Eliminar Índices
        await queryRunner.query(`DROP INDEX "IDX_assignment_conditions_campaignId"`);
        await queryRunner.query(`DROP INDEX "IDX_assignment_conditions_active"`);
        await queryRunner.query(`DROP INDEX "IDX_assignment_conditions_campaign_type"`);
        await queryRunner.query(`DROP INDEX "IDX_assignment_progress_resourceId"`);
        await queryRunner.query(`DROP INDEX "IDX_assignment_progress_userId"`);
        await queryRunner.query(`DROP INDEX "IDX_assignment_progress_campaignId"`);
        await queryRunner.query(`DROP INDEX "IDX_assignment_progress_resource_progress"`);
        await queryRunner.query(`DROP INDEX "IDX_assignment_progress_campaign_completion"`);
        await queryRunner.query(`DROP INDEX "IDX_assignment_progress_user_status"`);
        await queryRunner.query(`DROP INDEX "IDX_campaign_targets_campaignId"`);
        await queryRunner.query(`DROP INDEX "IDX_campaign_targets_campaign_status"`);
        await queryRunner.query(`DROP INDEX "IDX_campaign_targets_type_id"`);
        await queryRunner.query(`DROP INDEX "IDX_campaign_resources_resourceId"`);
        await queryRunner.query(`DROP INDEX "IDX_campaign_resources_campaignId"`);
        await queryRunner.query(`DROP INDEX "IDX_campaign_resources_campaign_order"`);
        await queryRunner.query(`DROP INDEX "IDX_assignment_campaigns_createdById"`);
        await queryRunner.query(`DROP INDEX "IDX_campaign_dates"`);
        await queryRunner.query(`DROP INDEX "IDX_campaign_status_priority"`);
        await queryRunner.query(`DROP INDEX "IDX_campaign_created_by_date"`);

        // 3. Eliminar Tablas
        await queryRunner.query(`DROP TABLE "assignment_conditions"`);
        await queryRunner.query(`DROP TABLE "assignment_progress"`);
        await queryRunner.query(`DROP TABLE "campaign_targets"`);
        await queryRunner.query(`DROP TABLE "campaign_resources"`);
        await queryRunner.query(`DROP TABLE "assignment_campaigns"`);

        // 4. Eliminar Enums
        await queryRunner.query(`DROP TYPE "assignment_condition_apply_to_enum"`);
        await queryRunner.query(`DROP TYPE "assignment_condition_type_enum"`);
        await queryRunner.query(`DROP TYPE "assignment_progress_status_enum"`);
        await queryRunner.query(`DROP TYPE "campaign_target_status_enum"`);
        await queryRunner.query(`DROP TYPE "campaign_target_type_enum"`);
        await queryRunner.query(`DROP TYPE "assignment_campaign_status_enum"`);
        await queryRunner.query(`DROP TYPE "assignment_campaign_type_enum"`);

        console.log('✅ Assignment System Tables rollback completed');
    }
}