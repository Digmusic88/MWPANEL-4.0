import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRubricSystem1750813300000 implements MigrationInterface {
  name = 'CreateRubricSystem1750813300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear enum para estado de rúbricas
    await queryRunner.query(`
      CREATE TYPE "rubrics_status_enum" AS ENUM('draft', 'active', 'archived')
    `);

    // Crear tabla de rúbricas
    await queryRunner.query(`
      CREATE TABLE "rubrics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "status" "rubrics_status_enum" NOT NULL DEFAULT 'draft',
        "isTemplate" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "isVisibleToFamilies" boolean NOT NULL DEFAULT false,
        "criteriaCount" integer NOT NULL,
        "levelsCount" integer NOT NULL,
        "maxScore" numeric(5,2) NOT NULL DEFAULT '100',
        "importSource" text,
        "originalImportData" text,
        "teacherId" uuid NOT NULL,
        "subjectAssignmentId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rubrics" PRIMARY KEY ("id")
      )
    `);

    // Crear tabla de criterios de rúbrica
    await queryRunner.query(`
      CREATE TABLE "rubric_criteria" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "order" integer NOT NULL,
        "weight" numeric(5,2) NOT NULL DEFAULT '1',
        "isActive" boolean NOT NULL DEFAULT true,
        "rubricId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rubric_criteria" PRIMARY KEY ("id")
      )
    `);

    // Crear tabla de niveles de rúbrica
    await queryRunner.query(`
      CREATE TABLE "rubric_levels" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "order" integer NOT NULL,
        "scoreValue" numeric(5,2) NOT NULL,
        "color" character varying(7) NOT NULL DEFAULT '#FF4C4C',
        "isActive" boolean NOT NULL DEFAULT true,
        "rubricId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rubric_levels" PRIMARY KEY ("id")
      )
    `);

    // Crear tabla de celdas de rúbrica
    await queryRunner.query(`
      CREATE TABLE "rubric_cells" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "content" text NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "rubricId" uuid NOT NULL,
        "criterionId" uuid NOT NULL,
        "levelId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rubric_cells" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_rubric_cells_unique" UNIQUE ("rubricId", "criterionId", "levelId")
      )
    `);

    // Crear tabla de evaluaciones con rúbrica
    await queryRunner.query(`
      CREATE TABLE "rubric_assessments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "totalScore" numeric(5,2) NOT NULL,
        "maxPossibleScore" numeric(5,2) NOT NULL,
        "percentage" numeric(5,2) NOT NULL,
        "comments" text,
        "isComplete" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "activityAssessmentId" uuid NOT NULL,
        "rubricId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rubric_assessments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_rubric_assessments_unique" UNIQUE ("activityAssessmentId", "rubricId", "studentId")
      )
    `);

    // Crear tabla de criterios evaluados
    await queryRunner.query(`
      CREATE TABLE "rubric_assessment_criteria" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "score" numeric(5,2) NOT NULL,
        "weightedScore" numeric(5,2) NOT NULL,
        "comments" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "rubricAssessmentId" uuid NOT NULL,
        "criterionId" uuid NOT NULL,
        "levelId" uuid NOT NULL,
        "cellId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rubric_assessment_criteria" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_rubric_assessment_criteria_unique" UNIQUE ("rubricAssessmentId", "criterionId")
      )
    `);

    // Agregar columna rubricId a la tabla activities
    await queryRunner.query(`
      ALTER TABLE "activities" 
      ADD COLUMN "rubric_id" uuid
    `);

    // Agregar el nuevo valor al enum de tipo de valoración
    await queryRunner.query(`
      ALTER TYPE "activities_valuationtype_enum" 
      ADD VALUE 'rubric'
    `);

    // Crear índices para optimizar consultas
    await queryRunner.query(`
      CREATE INDEX "IDX_rubrics_teacher" ON "rubrics" ("teacherId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rubrics_subject_assignment" ON "rubrics" ("subjectAssignmentId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rubric_criteria_rubric" ON "rubric_criteria" ("rubricId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rubric_levels_rubric" ON "rubric_levels" ("rubricId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rubric_cells_rubric" ON "rubric_cells" ("rubricId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rubric_assessments_activity" ON "rubric_assessments" ("activityAssessmentId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rubric_assessments_student" ON "rubric_assessments" ("studentId")
    `);

    // Crear claves foráneas
    await queryRunner.query(`
      ALTER TABLE "rubrics" 
      ADD CONSTRAINT "FK_rubrics_teacher" 
      FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "rubrics" 
      ADD CONSTRAINT "FK_rubrics_subject_assignment" 
      FOREIGN KEY ("subjectAssignmentId") REFERENCES "subject_assignments"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "rubric_criteria" 
      ADD CONSTRAINT "FK_rubric_criteria_rubric" 
      FOREIGN KEY ("rubricId") REFERENCES "rubrics"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "rubric_levels" 
      ADD CONSTRAINT "FK_rubric_levels_rubric" 
      FOREIGN KEY ("rubricId") REFERENCES "rubrics"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "rubric_cells" 
      ADD CONSTRAINT "FK_rubric_cells_rubric" 
      FOREIGN KEY ("rubricId") REFERENCES "rubrics"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "rubric_cells" 
      ADD CONSTRAINT "FK_rubric_cells_criterion" 
      FOREIGN KEY ("criterionId") REFERENCES "rubric_criteria"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "rubric_cells" 
      ADD CONSTRAINT "FK_rubric_cells_level" 
      FOREIGN KEY ("levelId") REFERENCES "rubric_levels"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "rubric_assessments" 
      ADD CONSTRAINT "FK_rubric_assessments_activity" 
      FOREIGN KEY ("activityAssessmentId") REFERENCES "activity_assessments"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "rubric_assessments" 
      ADD CONSTRAINT "FK_rubric_assessments_rubric" 
      FOREIGN KEY ("rubricId") REFERENCES "rubrics"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "rubric_assessments" 
      ADD CONSTRAINT "FK_rubric_assessments_student" 
      FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "rubric_assessment_criteria" 
      ADD CONSTRAINT "FK_rubric_assessment_criteria_assessment" 
      FOREIGN KEY ("rubricAssessmentId") REFERENCES "rubric_assessments"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "rubric_assessment_criteria" 
      ADD CONSTRAINT "FK_rubric_assessment_criteria_criterion" 
      FOREIGN KEY ("criterionId") REFERENCES "rubric_criteria"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "rubric_assessment_criteria" 
      ADD CONSTRAINT "FK_rubric_assessment_criteria_level" 
      FOREIGN KEY ("levelId") REFERENCES "rubric_levels"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "rubric_assessment_criteria" 
      ADD CONSTRAINT "FK_rubric_assessment_criteria_cell" 
      FOREIGN KEY ("cellId") REFERENCES "rubric_cells"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "activities" 
      ADD CONSTRAINT "FK_activities_rubric" 
      FOREIGN KEY ("rubric_id") REFERENCES "rubrics"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar claves foráneas
    await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_rubric"`);
    await queryRunner.query(`ALTER TABLE "rubric_assessment_criteria" DROP CONSTRAINT "FK_rubric_assessment_criteria_cell"`);
    await queryRunner.query(`ALTER TABLE "rubric_assessment_criteria" DROP CONSTRAINT "FK_rubric_assessment_criteria_level"`);
    await queryRunner.query(`ALTER TABLE "rubric_assessment_criteria" DROP CONSTRAINT "FK_rubric_assessment_criteria_criterion"`);
    await queryRunner.query(`ALTER TABLE "rubric_assessment_criteria" DROP CONSTRAINT "FK_rubric_assessment_criteria_assessment"`);
    await queryRunner.query(`ALTER TABLE "rubric_assessments" DROP CONSTRAINT "FK_rubric_assessments_student"`);
    await queryRunner.query(`ALTER TABLE "rubric_assessments" DROP CONSTRAINT "FK_rubric_assessments_rubric"`);
    await queryRunner.query(`ALTER TABLE "rubric_assessments" DROP CONSTRAINT "FK_rubric_assessments_activity"`);
    await queryRunner.query(`ALTER TABLE "rubric_cells" DROP CONSTRAINT "FK_rubric_cells_level"`);
    await queryRunner.query(`ALTER TABLE "rubric_cells" DROP CONSTRAINT "FK_rubric_cells_criterion"`);
    await queryRunner.query(`ALTER TABLE "rubric_cells" DROP CONSTRAINT "FK_rubric_cells_rubric"`);
    await queryRunner.query(`ALTER TABLE "rubric_levels" DROP CONSTRAINT "FK_rubric_levels_rubric"`);
    await queryRunner.query(`ALTER TABLE "rubric_criteria" DROP CONSTRAINT "FK_rubric_criteria_rubric"`);
    await queryRunner.query(`ALTER TABLE "rubrics" DROP CONSTRAINT "FK_rubrics_subject_assignment"`);
    await queryRunner.query(`ALTER TABLE "rubrics" DROP CONSTRAINT "FK_rubrics_teacher"`);

    // Eliminar índices
    await queryRunner.query(`DROP INDEX "IDX_rubric_assessments_student"`);
    await queryRunner.query(`DROP INDEX "IDX_rubric_assessments_activity"`);
    await queryRunner.query(`DROP INDEX "IDX_rubric_cells_rubric"`);
    await queryRunner.query(`DROP INDEX "IDX_rubric_levels_rubric"`);
    await queryRunner.query(`DROP INDEX "IDX_rubric_criteria_rubric"`);
    await queryRunner.query(`DROP INDEX "IDX_rubrics_subject_assignment"`);
    await queryRunner.query(`DROP INDEX "IDX_rubrics_teacher"`);

    // Eliminar columna de activities
    await queryRunner.query(`ALTER TABLE "activities" DROP COLUMN "rubric_id"`);

    // Eliminar tablas
    await queryRunner.query(`DROP TABLE "rubric_assessment_criteria"`);
    await queryRunner.query(`DROP TABLE "rubric_assessments"`);
    await queryRunner.query(`DROP TABLE "rubric_cells"`);
    await queryRunner.query(`DROP TABLE "rubric_levels"`);
    await queryRunner.query(`DROP TABLE "rubric_criteria"`);
    await queryRunner.query(`DROP TABLE "rubrics"`);

    // Eliminar enum
    await queryRunner.query(`DROP TYPE "rubrics_status_enum"`);
  }
}