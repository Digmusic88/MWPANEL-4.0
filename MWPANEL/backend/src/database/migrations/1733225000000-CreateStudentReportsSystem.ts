import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudentReportsSystem1733225000000 implements MigrationInterface {
  name = 'CreateStudentReportsSystem1733225000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== CREAR TABLA student_general_reports =====
    await queryRunner.query(`
      CREATE TABLE "student_general_reports" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "studentId" uuid NOT NULL,
        "authorTeacherId" uuid NOT NULL,
        "academicYearId" uuid NOT NULL,
        "subjectId" uuid,
        "customTag" varchar(100),
        "content" text NOT NULL,
        "title" varchar(200),
        "priority" int NOT NULL DEFAULT 2,
        "visibleToFamily" boolean NOT NULL DEFAULT false,
        "isArchived" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_student_general_reports" PRIMARY KEY ("id")
      )
    `);

    // Foreign Keys para student_general_reports
    await queryRunner.query(`
      ALTER TABLE "student_general_reports"
      ADD CONSTRAINT "FK_student_general_reports_student"
      FOREIGN KEY ("studentId") REFERENCES "students"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "student_general_reports"
      ADD CONSTRAINT "FK_student_general_reports_teacher"
      FOREIGN KEY ("authorTeacherId") REFERENCES "teachers"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "student_general_reports"
      ADD CONSTRAINT "FK_student_general_reports_academic_year"
      FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "student_general_reports"
      ADD CONSTRAINT "FK_student_general_reports_subject"
      FOREIGN KEY ("subjectId") REFERENCES "subjects"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Índices para student_general_reports
    await queryRunner.query(`
      CREATE INDEX "IDX_student_general_reports_student_year"
      ON "student_general_reports" ("studentId", "academicYearId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_student_general_reports_teacher_year"
      ON "student_general_reports" ("authorTeacherId", "academicYearId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_student_general_reports_subject"
      ON "student_general_reports" ("subjectId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_student_general_reports_custom_tag"
      ON "student_general_reports" ("customTag")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_student_general_reports_created_at"
      ON "student_general_reports" ("createdAt")
    `);

    // ===== CREAR TABLA teacher_student_access =====
    await queryRunner.query(`
      CREATE TYPE "teacher_student_access_access_type_enum" AS ENUM ('read', 'write', 'full')
    `);

    await queryRunner.query(`
      CREATE TYPE "teacher_student_access_reason_enum" AS ENUM (
        'tutor', 'support', 'coordinator', 'counselor',
        'substitute', 'special_needs', 'admin_override', 'other'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "teacher_student_access" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "teacherId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "academicYearId" uuid NOT NULL,
        "accessType" "teacher_student_access_access_type_enum" NOT NULL DEFAULT 'write',
        "reason" "teacher_student_access_reason_enum" NOT NULL DEFAULT 'admin_override',
        "notes" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "expiresAt" TIMESTAMP,
        "grantedById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_teacher_student_access" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_teacher_student_access" UNIQUE ("teacherId", "studentId", "academicYearId")
      )
    `);

    // Foreign Keys para teacher_student_access
    await queryRunner.query(`
      ALTER TABLE "teacher_student_access"
      ADD CONSTRAINT "FK_teacher_student_access_teacher"
      FOREIGN KEY ("teacherId") REFERENCES "teachers"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "teacher_student_access"
      ADD CONSTRAINT "FK_teacher_student_access_student"
      FOREIGN KEY ("studentId") REFERENCES "students"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "teacher_student_access"
      ADD CONSTRAINT "FK_teacher_student_access_academic_year"
      FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "teacher_student_access"
      ADD CONSTRAINT "FK_teacher_student_access_granted_by"
      FOREIGN KEY ("grantedById") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Índices para teacher_student_access
    await queryRunner.query(`
      CREATE INDEX "IDX_teacher_student_access_teacher_year"
      ON "teacher_student_access" ("teacherId", "academicYearId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_teacher_student_access_student_year"
      ON "teacher_student_access" ("studentId", "academicYearId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_teacher_student_access_active"
      ON "teacher_student_access" ("isActive")
    `);

    console.log('✅ Migration CreateStudentReportsSystem completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop teacher_student_access
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_teacher_student_access_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_teacher_student_access_student_year"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_teacher_student_access_teacher_year"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "teacher_student_access"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "teacher_student_access_reason_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "teacher_student_access_access_type_enum"`);

    // Drop student_general_reports
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_student_general_reports_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_student_general_reports_custom_tag"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_student_general_reports_subject"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_student_general_reports_teacher_year"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_student_general_reports_student_year"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_general_reports"`);

    console.log('✅ Migration CreateStudentReportsSystem reverted successfully');
  }
}
