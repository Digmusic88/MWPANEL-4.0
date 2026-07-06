/**
 * Migration: CreateDuaSystem
 * Descripción: Crea las tablas del sistema DUA (Diseño Universal para el Aprendizaje)
 * - dua_profiles: Perfiles DUA de estudiantes
 * - dua_accommodations: Acomodaciones por estudiante
 * - accommodation_effectiveness: Seguimiento de efectividad
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDuaSystem1752668800000 implements MigrationInterface {
  name = 'CreateDuaSystem1752668800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear tabla dua_profiles
    await queryRunner.query(`
      CREATE TABLE "dua_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "student_id" uuid NOT NULL,
        "evaluated_by" uuid NOT NULL,
        "learning_styles" jsonb,
        "multiple_intelligences" jsonb,
        "barriers_identified" text[],
        "strengths" text[],
        "challenges" text[],
        "goals" text[],
        "recommended_accommodations" text[],
        "assessment_date" TIMESTAMP NOT NULL DEFAULT now(),
        "notes" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dua_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_dua_profiles_student" UNIQUE ("student_id")
      )
    `);

    // 2. Crear tabla dua_accommodations
    await queryRunner.query(`
      CREATE TYPE "dua_accommodation_type_enum" AS ENUM(
        'PRESENTATION',
        'RESPONSE', 
        'TIMING',
        'SETTING',
        'ASSISTIVE_TECHNOLOGY',
        'OTHER'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "dua_accommodation_status_enum" AS ENUM(
        'PENDING',
        'APPROVED',
        'REJECTED',
        'IMPLEMENTED',
        'DISCONTINUED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "dua_accommodations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "student_id" uuid NOT NULL,
        "type" "dua_accommodation_type_enum" NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "application_guidelines" text,
        "subject_id" uuid,
        "status" "dua_accommodation_status_enum" NOT NULL DEFAULT 'PENDING',
        "requested_by" uuid NOT NULL,
        "approved_by" uuid,
        "implementation_date" TIMESTAMP,
        "start_date" TIMESTAMP NOT NULL DEFAULT now(),
        "end_date" TIMESTAMP,
        "is_active" boolean NOT NULL DEFAULT true,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dua_accommodations" PRIMARY KEY ("id")
      )
    `);

    // 3. Crear tabla accommodation_effectiveness
    await queryRunner.query(`
      CREATE TABLE "accommodation_effectiveness" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "accommodation_id" uuid NOT NULL,
        "evaluation_date" TIMESTAMP NOT NULL DEFAULT now(),
        "effectiveness_rating" integer NOT NULL DEFAULT 1,
        "student_feedback" text,
        "teacher_feedback" text,
        "adjustments_needed" text,
        "evidence" text,
        "evaluated_by" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_accommodation_effectiveness" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_effectiveness_rating" CHECK ("effectiveness_rating" >= 1 AND "effectiveness_rating" <= 5)
      )
    `);

    // 4. Crear índices para optimización
    await queryRunner.query(`
      CREATE INDEX "IDX_dua_profiles_student" ON "dua_profiles" ("student_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_dua_accommodations_student" ON "dua_accommodations" ("student_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_dua_accommodations_status" ON "dua_accommodations" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_dua_accommodations_type" ON "dua_accommodations" ("type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_dua_accommodations_subject" ON "dua_accommodations" ("subject_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_accommodation_effectiveness_accommodation" ON "accommodation_effectiveness" ("accommodation_id")
    `);

    // 5. Crear foreign keys
    await queryRunner.query(`
      ALTER TABLE "dua_profiles" 
      ADD CONSTRAINT "FK_dua_profiles_student" 
      FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "dua_profiles" 
      ADD CONSTRAINT "FK_dua_profiles_evaluator" 
      FOREIGN KEY ("evaluated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "dua_accommodations" 
      ADD CONSTRAINT "FK_dua_accommodations_student" 
      FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "dua_accommodations" 
      ADD CONSTRAINT "FK_dua_accommodations_subject" 
      FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "dua_accommodations" 
      ADD CONSTRAINT "FK_dua_accommodations_requested_by" 
      FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "dua_accommodations" 
      ADD CONSTRAINT "FK_dua_accommodations_approved_by" 
      FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "accommodation_effectiveness" 
      ADD CONSTRAINT "FK_accommodation_effectiveness_accommodation" 
      FOREIGN KEY ("accommodation_id") REFERENCES "dua_accommodations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "accommodation_effectiveness" 
      ADD CONSTRAINT "FK_accommodation_effectiveness_evaluator" 
      FOREIGN KEY ("evaluated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign keys
    await queryRunner.query(`ALTER TABLE "accommodation_effectiveness" DROP CONSTRAINT "FK_accommodation_effectiveness_evaluator"`);
    await queryRunner.query(`ALTER TABLE "accommodation_effectiveness" DROP CONSTRAINT "FK_accommodation_effectiveness_accommodation"`);
    await queryRunner.query(`ALTER TABLE "dua_accommodations" DROP CONSTRAINT "FK_dua_accommodations_approved_by"`);
    await queryRunner.query(`ALTER TABLE "dua_accommodations" DROP CONSTRAINT "FK_dua_accommodations_requested_by"`);
    await queryRunner.query(`ALTER TABLE "dua_accommodations" DROP CONSTRAINT "FK_dua_accommodations_subject"`);
    await queryRunner.query(`ALTER TABLE "dua_accommodations" DROP CONSTRAINT "FK_dua_accommodations_student"`);
    await queryRunner.query(`ALTER TABLE "dua_profiles" DROP CONSTRAINT "FK_dua_profiles_evaluator"`);
    await queryRunner.query(`ALTER TABLE "dua_profiles" DROP CONSTRAINT "FK_dua_profiles_student"`);

    // Eliminar índices
    await queryRunner.query(`DROP INDEX "IDX_accommodation_effectiveness_accommodation"`);
    await queryRunner.query(`DROP INDEX "IDX_dua_accommodations_subject"`);
    await queryRunner.query(`DROP INDEX "IDX_dua_accommodations_type"`);
    await queryRunner.query(`DROP INDEX "IDX_dua_accommodations_status"`);
    await queryRunner.query(`DROP INDEX "IDX_dua_accommodations_student"`);
    await queryRunner.query(`DROP INDEX "IDX_dua_profiles_student"`);

    // Eliminar tablas
    await queryRunner.query(`DROP TABLE "accommodation_effectiveness"`);
    await queryRunner.query(`DROP TABLE "dua_accommodations"`);
    await queryRunner.query(`DROP TABLE "dua_profiles"`);

    // Eliminar enums
    await queryRunner.query(`DROP TYPE "dua_accommodation_status_enum"`);
    await queryRunner.query(`DROP TYPE "dua_accommodation_type_enum"`);
  }
}