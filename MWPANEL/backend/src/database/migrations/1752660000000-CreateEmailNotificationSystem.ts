/**
 * @archivo: CreateEmailNotificationSystem.ts
 * @función: Migración para crear sistema completo de notificaciones por correo
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 * @descripción: Crea tablas para plantillas, notificaciones y preferencias de email
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailNotificationSystem1752660000000 implements MigrationInterface {
  name = 'CreateEmailNotificationSystem1752660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla de plantillas de correo
    await queryRunner.query(`
      CREATE TYPE "email_template_type_enum" AS ENUM(
        'grade_notification', 'assignment_reminder', 'event_reminder', 'message_from_teacher',
        'child_grade_update', 'child_absence', 'school_event', 'teacher_message',
        'new_assignment', 'admin_message', 'system_incident',
        'system_error', 'backup_report', 'user_activity',
        'welcome', 'password_reset', 'system_maintenance'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "email_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "type" "email_template_type_enum" NOT NULL,
        "subject" character varying NOT NULL,
        "htmlContent" text NOT NULL,
        "textContent" text NOT NULL,
        "availableVariables" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "isSystem" boolean NOT NULL DEFAULT false,
        "createdById" uuid,
        "lastEditedById" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_email_templates_name" UNIQUE ("name"),
        CONSTRAINT "PK_email_templates" PRIMARY KEY ("id")
      )
    `);

    // Crear tabla de notificaciones de correo
    await queryRunner.query(`
      CREATE TYPE "email_status_enum" AS ENUM('pending', 'sending', 'sent', 'delivered', 'failed', 'bounced', 'complained')
    `);

    await queryRunner.query(`
      CREATE TYPE "email_priority_enum" AS ENUM('low', 'normal', 'high', 'urgent')
    `);

    await queryRunner.query(`
      CREATE TABLE "email_notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "recipientId" uuid NOT NULL,
        "recipientEmail" character varying NOT NULL,
        "templateId" uuid,
        "subject" character varying NOT NULL,
        "htmlContent" text NOT NULL,
        "textContent" text,
        "templateData" text,
        "status" "email_status_enum" NOT NULL DEFAULT 'pending',
        "priority" "email_priority_enum" NOT NULL DEFAULT 'normal',
        "providerMessageId" character varying,
        "providerResponse" character varying,
        "triggerEvent" character varying,
        "triggerResourceId" character varying,
        "triggerResourceType" character varying,
        "triggeredById" uuid,
        "sentAt" TIMESTAMP,
        "deliveredAt" TIMESTAMP,
        "failedAt" TIMESTAMP,
        "bouncedAt" TIMESTAMP,
        "errorMessage" character varying,
        "retryCount" integer NOT NULL DEFAULT 0,
        "nextRetryAt" TIMESTAMP,
        "isTest" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_notifications" PRIMARY KEY ("id")
      )
    `);

    // Crear tabla de preferencias de notificación
    await queryRunner.query(`
      CREATE TABLE "user_notification_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "emailNotificationsEnabled" boolean NOT NULL DEFAULT true,
        "preferredLanguage" character varying NOT NULL DEFAULT 'es',
        "enableGradeNotifications" boolean NOT NULL DEFAULT true,
        "enableAssignmentReminders" boolean NOT NULL DEFAULT true,
        "enableEventReminders" boolean NOT NULL DEFAULT true,
        "enableTeacherMessages" boolean NOT NULL DEFAULT true,
        "enableChildGradeUpdates" boolean NOT NULL DEFAULT true,
        "enableChildAbsenceAlerts" boolean NOT NULL DEFAULT true,
        "enableSchoolEvents" boolean NOT NULL DEFAULT true,
        "enableTeacherCommunications" boolean NOT NULL DEFAULT true,
        "enableNewAssignments" boolean NOT NULL DEFAULT true,
        "enableAdminMessages" boolean NOT NULL DEFAULT true,
        "enableSystemIncidents" boolean NOT NULL DEFAULT true,
        "enableClassUpdates" boolean NOT NULL DEFAULT true,
        "enableSystemErrors" boolean NOT NULL DEFAULT true,
        "enableBackupReports" boolean NOT NULL DEFAULT true,
        "enableUserActivity" boolean NOT NULL DEFAULT true,
        "enableSecurityAlerts" boolean NOT NULL DEFAULT true,
        "enableWelcomeEmails" boolean NOT NULL DEFAULT true,
        "enablePasswordResetEmails" boolean NOT NULL DEFAULT true,
        "enableMaintenanceAlerts" boolean NOT NULL DEFAULT true,
        "notificationFrequency" character varying NOT NULL DEFAULT 'immediate',
        "preferredNotificationTime" character varying NOT NULL DEFAULT '09:00',
        "enableRichHtmlEmails" boolean NOT NULL DEFAULT true,
        "enableEmailImages" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_notification_preferences_userId" UNIQUE ("userId"),
        CONSTRAINT "PK_user_notification_preferences" PRIMARY KEY ("id")
      )
    `);

    // Crear claves foráneas
    await queryRunner.query(`
      ALTER TABLE "email_templates" ADD CONSTRAINT "FK_email_templates_createdById" 
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "email_templates" ADD CONSTRAINT "FK_email_templates_lastEditedById" 
      FOREIGN KEY ("lastEditedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "email_notifications" ADD CONSTRAINT "FK_email_notifications_recipientId" 
      FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "email_notifications" ADD CONSTRAINT "FK_email_notifications_templateId" 
      FOREIGN KEY ("templateId") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "email_notifications" ADD CONSTRAINT "FK_email_notifications_triggeredById" 
      FOREIGN KEY ("triggeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "FK_user_notification_preferences_userId" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Crear índices para mejorar rendimiento
    await queryRunner.query(`CREATE INDEX "IDX_email_notifications_status" ON "email_notifications" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_email_notifications_priority" ON "email_notifications" ("priority")`);
    await queryRunner.query(`CREATE INDEX "IDX_email_notifications_createdAt" ON "email_notifications" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_email_notifications_recipientId" ON "email_notifications" ("recipientId")`);
    await queryRunner.query(`CREATE INDEX "IDX_email_templates_type" ON "email_templates" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_email_templates_isActive" ON "email_templates" ("isActive")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar índices
    await queryRunner.query(`DROP INDEX "IDX_email_templates_isActive"`);
    await queryRunner.query(`DROP INDEX "IDX_email_templates_type"`);
    await queryRunner.query(`DROP INDEX "IDX_email_notifications_recipientId"`);
    await queryRunner.query(`DROP INDEX "IDX_email_notifications_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_email_notifications_priority"`);
    await queryRunner.query(`DROP INDEX "IDX_email_notifications_status"`);

    // Eliminar claves foráneas
    await queryRunner.query(`ALTER TABLE "user_notification_preferences" DROP CONSTRAINT "FK_user_notification_preferences_userId"`);
    await queryRunner.query(`ALTER TABLE "email_notifications" DROP CONSTRAINT "FK_email_notifications_triggeredById"`);
    await queryRunner.query(`ALTER TABLE "email_notifications" DROP CONSTRAINT "FK_email_notifications_templateId"`);
    await queryRunner.query(`ALTER TABLE "email_notifications" DROP CONSTRAINT "FK_email_notifications_recipientId"`);
    await queryRunner.query(`ALTER TABLE "email_templates" DROP CONSTRAINT "FK_email_templates_lastEditedById"`);
    await queryRunner.query(`ALTER TABLE "email_templates" DROP CONSTRAINT "FK_email_templates_createdById"`);

    // Eliminar tablas
    await queryRunner.query(`DROP TABLE "user_notification_preferences"`);
    await queryRunner.query(`DROP TABLE "email_notifications"`);
    await queryRunner.query(`DROP TABLE "email_templates"`);

    // Eliminar tipos enum
    await queryRunner.query(`DROP TYPE "email_priority_enum"`);
    await queryRunner.query(`DROP TYPE "email_status_enum"`);
    await queryRunner.query(`DROP TYPE "email_template_type_enum"`);
  }
}