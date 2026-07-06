import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCalendarSystem1735057000000 implements MigrationInterface {
  name = 'CreateCalendarSystem1735057000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enum para tipos de eventos
    await queryRunner.query(`
      CREATE TYPE "calendar_event_type_enum" AS ENUM (
        'activity', 
        'evaluation', 
        'test_yourself', 
        'general_event', 
        'holiday', 
        'meeting', 
        'excursion', 
        'festival', 
        'deadline', 
        'reminder'
      )
    `);

    // Enum para nivel de visibilidad
    await queryRunner.query(`
      CREATE TYPE "calendar_event_visibility_enum" AS ENUM (
        'public', 
        'teachers_only', 
        'students_only', 
        'families_only', 
        'admin_only',
        'class_specific',
        'subject_specific',
        'private'
      )
    `);

    // Enum para recurrencia
    await queryRunner.query(`
      CREATE TYPE "calendar_event_recurrence_enum" AS ENUM (
        'none', 
        'daily', 
        'weekly', 
        'monthly', 
        'yearly'
      )
    `);

    // Tabla principal de eventos
    await queryRunner.query(`
      CREATE TABLE "calendar_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text,
        "startDate" TIMESTAMP NOT NULL,
        "endDate" TIMESTAMP NOT NULL,
        "type" "calendar_event_type_enum" NOT NULL DEFAULT 'general_event',
        "visibility" "calendar_event_visibility_enum" NOT NULL DEFAULT 'public',
        "color" character varying(7) DEFAULT '#1890ff',
        "isAllDay" boolean NOT NULL DEFAULT false,
        "location" character varying,
        "isRecurrent" boolean NOT NULL DEFAULT false,
        "recurrenceType" "calendar_event_recurrence_enum" DEFAULT 'none',
        "recurrenceEnd" TIMESTAMP,
        "attachments" text[],
        "links" text[],
        "tags" character varying[],
        "priority" integer NOT NULL DEFAULT 1,
        "isActive" boolean NOT NULL DEFAULT true,
        "notifyBefore" integer DEFAULT 60,
        "autoNotify" boolean NOT NULL DEFAULT true,
        "createdById" uuid NOT NULL,
        "lastModifiedById" uuid,
        "relatedTaskId" uuid,
        "relatedEvaluationId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_calendar_events" PRIMARY KEY ("id")
      )
    `);

    // Tabla de asignaciones de eventos a grupos
    await queryRunner.query(`
      CREATE TABLE "calendar_event_groups" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "eventId" uuid NOT NULL,
        "classGroupId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_calendar_event_groups" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_calendar_event_groups" UNIQUE ("eventId", "classGroupId")
      )
    `);

    // Tabla de asignaciones de eventos a asignaturas
    await queryRunner.query(`
      CREATE TABLE "calendar_event_subjects" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "eventId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_calendar_event_subjects" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_calendar_event_subjects" UNIQUE ("eventId", "subjectId")
      )
    `);

    // Tabla de asignaciones de eventos a estudiantes específicos
    await queryRunner.query(`
      CREATE TABLE "calendar_event_students" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "eventId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "isVisible" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_calendar_event_students" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_calendar_event_students" UNIQUE ("eventId", "studentId")
      )
    `);

    // Tabla de recordatorios de eventos
    await queryRunner.query(`
      CREATE TABLE "calendar_event_reminders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "eventId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "reminderTime" TIMESTAMP NOT NULL,
        "isSent" boolean NOT NULL DEFAULT false,
        "message" text,
        "type" character varying DEFAULT 'notification',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "sentAt" TIMESTAMP,
        CONSTRAINT "PK_calendar_event_reminders" PRIMARY KEY ("id")
      )
    `);

    // Foreign Keys
    await queryRunner.query(`
      ALTER TABLE "calendar_events" 
      ADD CONSTRAINT "FK_calendar_events_createdBy" 
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "calendar_events" 
      ADD CONSTRAINT "FK_calendar_events_lastModifiedBy" 
      FOREIGN KEY ("lastModifiedById") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "calendar_events" 
      ADD CONSTRAINT "FK_calendar_events_relatedTask" 
      FOREIGN KEY ("relatedTaskId") REFERENCES "tasks"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "calendar_event_groups" 
      ADD CONSTRAINT "FK_calendar_event_groups_event" 
      FOREIGN KEY ("eventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "calendar_event_groups" 
      ADD CONSTRAINT "FK_calendar_event_groups_classGroup" 
      FOREIGN KEY ("classGroupId") REFERENCES "class_groups"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "calendar_event_subjects" 
      ADD CONSTRAINT "FK_calendar_event_subjects_event" 
      FOREIGN KEY ("eventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "calendar_event_subjects" 
      ADD CONSTRAINT "FK_calendar_event_subjects_subject" 
      FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "calendar_event_students" 
      ADD CONSTRAINT "FK_calendar_event_students_event" 
      FOREIGN KEY ("eventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "calendar_event_students" 
      ADD CONSTRAINT "FK_calendar_event_students_student" 
      FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "calendar_event_reminders" 
      ADD CONSTRAINT "FK_calendar_event_reminders_event" 
      FOREIGN KEY ("eventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "calendar_event_reminders" 
      ADD CONSTRAINT "FK_calendar_event_reminders_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    // Índices para optimización
    await queryRunner.query(`CREATE INDEX "IDX_calendar_events_startDate" ON "calendar_events" ("startDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_calendar_events_endDate" ON "calendar_events" ("endDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_calendar_events_type" ON "calendar_events" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_calendar_events_visibility" ON "calendar_events" ("visibility")`);
    await queryRunner.query(`CREATE INDEX "IDX_calendar_events_createdBy" ON "calendar_events" ("createdById")`);
    await queryRunner.query(`CREATE INDEX "IDX_calendar_events_isActive" ON "calendar_events" ("isActive")`);
    await queryRunner.query(`CREATE INDEX "IDX_calendar_event_reminders_reminderTime" ON "calendar_event_reminders" ("reminderTime")`);
    await queryRunner.query(`CREATE INDEX "IDX_calendar_event_reminders_isSent" ON "calendar_event_reminders" ("isSent")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "calendar_event_reminders"`);
    await queryRunner.query(`DROP TABLE "calendar_event_students"`);
    await queryRunner.query(`DROP TABLE "calendar_event_subjects"`);
    await queryRunner.query(`DROP TABLE "calendar_event_groups"`);
    await queryRunner.query(`DROP TABLE "calendar_events"`);
    await queryRunner.query(`DROP TYPE "calendar_event_recurrence_enum"`);
    await queryRunner.query(`DROP TYPE "calendar_event_visibility_enum"`);
    await queryRunner.query(`DROP TYPE "calendar_event_type_enum"`);
  }
}