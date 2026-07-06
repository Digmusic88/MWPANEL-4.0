import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDailyHomeworkSystem1753500000000 implements MigrationInterface {
  name = 'CreateDailyHomeworkSystem1753500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tabla de registros de actividades diarias
    await queryRunner.query(`
      CREATE TYPE "daily_homework_status_enum" AS ENUM ('completed', 'partial', 'not_done')
    `);

    await queryRunner.query(`
      CREATE TABLE "daily_homework_records" (
        "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "student_id"            UUID NOT NULL,
        "class_group_id"        UUID NOT NULL,
        "subject_assignment_id" UUID,
        "date"                  DATE NOT NULL,
        "status"                "daily_homework_status_enum" NOT NULL DEFAULT 'completed',
        "recorded_by_teacher_id" UUID NOT NULL,
        "notes"                 TEXT,
        "notification_sent_at"  TIMESTAMP,
        "created_at"            TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_dhr_student"       FOREIGN KEY ("student_id")             REFERENCES "students"("id")              ON DELETE CASCADE,
        CONSTRAINT "fk_dhr_class_group"   FOREIGN KEY ("class_group_id")         REFERENCES "class_groups"("id")          ON DELETE CASCADE,
        CONSTRAINT "fk_dhr_subject_asn"   FOREIGN KEY ("subject_assignment_id")  REFERENCES "subject_assignments"("id")   ON DELETE SET NULL,
        CONSTRAINT "fk_dhr_teacher"       FOREIGN KEY ("recorded_by_teacher_id") REFERENCES "teachers"("id")              ON DELETE RESTRICT,
        CONSTRAINT "uq_dhr_unique_record" UNIQUE ("student_id","class_group_id","date","subject_assignment_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_dhr_class_group_date" ON "daily_homework_records" ("class_group_id","date")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_dhr_student_date" ON "daily_homework_records" ("student_id","date")
    `);

    // Tabla de notificaciones
    await queryRunner.query(`
      CREATE TYPE "dhnotif_channel_enum" AS ENUM ('IN_APP','EMAIL')
    `);
    await queryRunner.query(`
      CREATE TYPE "dhnotif_status_enum" AS ENUM ('PENDING','SENT','FAILED','SKIPPED')
    `);

    await queryRunner.query(`
      CREATE TABLE "daily_homework_notifications" (
        "id"                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "record_id"               UUID NOT NULL,
        "student_id"              UUID NOT NULL,
        "guardian_user_id"        UUID,
        "channel"                 "dhnotif_channel_enum" NOT NULL,
        "status"                  "dhnotif_status_enum" NOT NULL DEFAULT 'PENDING',
        "reason"                  TEXT,
        "sent_at"                 TIMESTAMP,
        "error_message"           TEXT,
        "record_status_snapshot"  VARCHAR(20),
        "created_at"              TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_dhn_record"  FOREIGN KEY ("record_id")  REFERENCES "daily_homework_records"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_dhn_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_dhn_user"    FOREIGN KEY ("guardian_user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_dhn_record_id" ON "daily_homework_notifications" ("record_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_dhn_student_id" ON "daily_homework_notifications" ("student_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_homework_notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_homework_records"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "dhnotif_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "dhnotif_channel_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "daily_homework_status_enum"`);
  }
}
