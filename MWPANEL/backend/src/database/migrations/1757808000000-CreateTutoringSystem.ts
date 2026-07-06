import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTutoringSystem1757808000000 implements MigrationInterface {
  name = 'CreateTutoringSystem1757808000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla de grupos de tutoría
    await queryRunner.query(`
      CREATE TABLE "tutoring_groups" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying,
        "tutorId" uuid NOT NULL,
        "academicYearId" uuid NOT NULL,
        "educationalLevelId" uuid,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tutoring_groups" PRIMARY KEY ("id")
      )
    `);

    // Crear tabla de estudiantes en tutoría
    await queryRunner.query(`
      CREATE TABLE "tutoring_students" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tutoringGroupId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "notes" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tutoring_students" PRIMARY KEY ("id")
      )
    `);

    // Crear índices únicos para evitar duplicados
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_tutoring_student_unique_active"
      ON "tutoring_students" ("tutoringGroupId", "studentId")
      WHERE "isActive" = true
    `);

    // Crear foreign keys para tutoring_groups
    await queryRunner.query(`
      ALTER TABLE "tutoring_groups"
      ADD CONSTRAINT "FK_tutoring_groups_tutor"
      FOREIGN KEY ("tutorId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "tutoring_groups"
      ADD CONSTRAINT "FK_tutoring_groups_academic_year"
      FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "tutoring_groups"
      ADD CONSTRAINT "FK_tutoring_groups_educational_level"
      FOREIGN KEY ("educationalLevelId") REFERENCES "educational_levels"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Crear foreign keys para tutoring_students
    await queryRunner.query(`
      ALTER TABLE "tutoring_students"
      ADD CONSTRAINT "FK_tutoring_students_group"
      FOREIGN KEY ("tutoringGroupId") REFERENCES "tutoring_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "tutoring_students"
      ADD CONSTRAINT "FK_tutoring_students_student"
      FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Crear índices para mejorar rendimiento
    await queryRunner.query(`CREATE INDEX "IDX_tutoring_groups_tutor" ON "tutoring_groups" ("tutorId")`);
    await queryRunner.query(`CREATE INDEX "IDX_tutoring_groups_academic_year" ON "tutoring_groups" ("academicYearId")`);
    await queryRunner.query(`CREATE INDEX "IDX_tutoring_groups_active" ON "tutoring_groups" ("isActive")`);
    await queryRunner.query(`CREATE INDEX "IDX_tutoring_students_group" ON "tutoring_students" ("tutoringGroupId")`);
    await queryRunner.query(`CREATE INDEX "IDX_tutoring_students_student" ON "tutoring_students" ("studentId")`);
    await queryRunner.query(`CREATE INDEX "IDX_tutoring_students_active" ON "tutoring_students" ("isActive")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign keys
    await queryRunner.query(`ALTER TABLE "tutoring_students" DROP CONSTRAINT "FK_tutoring_students_student"`);
    await queryRunner.query(`ALTER TABLE "tutoring_students" DROP CONSTRAINT "FK_tutoring_students_group"`);
    await queryRunner.query(`ALTER TABLE "tutoring_groups" DROP CONSTRAINT "FK_tutoring_groups_educational_level"`);
    await queryRunner.query(`ALTER TABLE "tutoring_groups" DROP CONSTRAINT "FK_tutoring_groups_academic_year"`);
    await queryRunner.query(`ALTER TABLE "tutoring_groups" DROP CONSTRAINT "FK_tutoring_groups_tutor"`);

    // Eliminar índices
    await queryRunner.query(`DROP INDEX "IDX_tutoring_students_active"`);
    await queryRunner.query(`DROP INDEX "IDX_tutoring_students_student"`);
    await queryRunner.query(`DROP INDEX "IDX_tutoring_students_group"`);
    await queryRunner.query(`DROP INDEX "IDX_tutoring_groups_active"`);
    await queryRunner.query(`DROP INDEX "IDX_tutoring_groups_academic_year"`);
    await queryRunner.query(`DROP INDEX "IDX_tutoring_groups_tutor"`);
    await queryRunner.query(`DROP INDEX "IDX_tutoring_student_unique_active"`);

    // Eliminar tablas
    await queryRunner.query(`DROP TABLE "tutoring_students"`);
    await queryRunner.query(`DROP TABLE "tutoring_groups"`);
  }
}