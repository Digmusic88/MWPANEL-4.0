import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeacherStudentAccess1767200000000 implements MigrationInterface {
  name = 'CreateTeacherStudentAccess1767200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "teacher_student_access" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "teacherId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "academicYearId" uuid NOT NULL,
        "accessType" character varying NOT NULL DEFAULT 'read',
        "reason" character varying NOT NULL DEFAULT 'admin_override',
        "notes" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "expiresAt" TIMESTAMP,
        "grantedById" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_teacher_student_access" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_teacher_student_access_unique" UNIQUE ("teacherId", "studentId", "academicYearId"),
        CONSTRAINT "FK_tsa_teacher" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tsa_student" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tsa_academic_year" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tsa_granted_by" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_tsa_teacher" ON "teacher_student_access" ("teacherId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_tsa_student" ON "teacher_student_access" ("studentId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_tsa_academic_year" ON "teacher_student_access" ("academicYearId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "teacher_student_access"`);
  }
}
