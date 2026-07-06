import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTaskRubricAssessmentTables1753700100000 implements MigrationInterface {
    name = 'CreateTaskRubricAssessmentTables1753700100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "task_rubric_assessments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "totalScore" decimal(5,2) NOT NULL,
                "maxPossibleScore" decimal(5,2) NOT NULL,
                "percentage" decimal(5,2) NOT NULL,
                "feedback" text,
                "isComplete" boolean NOT NULL DEFAULT true,
                "isActive" boolean NOT NULL DEFAULT true,
                "taskSubmissionId" uuid NOT NULL,
                "rubricId" uuid NOT NULL,
                "studentId" uuid NOT NULL,
                "teacherId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_task_rubric_assessments_unique" UNIQUE ("taskSubmissionId", "rubricId", "studentId"),
                CONSTRAINT "PK_task_rubric_assessments" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "task_rubric_assessment_criteria" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "score" decimal(5,2) NOT NULL,
                "weightedScore" decimal(5,2) NOT NULL,
                "comments" text,
                "isActive" boolean NOT NULL DEFAULT true,
                "taskRubricAssessmentId" uuid NOT NULL,
                "criterionId" uuid NOT NULL,
                "levelId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_task_rubric_assessment_criteria_unique" UNIQUE ("taskRubricAssessmentId", "criterionId"),
                CONSTRAINT "PK_task_rubric_assessment_criteria" PRIMARY KEY ("id")
            )
        `);

        // Foreign key constraints for task_rubric_assessments
        await queryRunner.query(`ALTER TABLE "task_rubric_assessments" ADD CONSTRAINT "FK_task_rubric_assessments_submission" FOREIGN KEY ("taskSubmissionId") REFERENCES "task_submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_rubric_assessments" ADD CONSTRAINT "FK_task_rubric_assessments_rubric" FOREIGN KEY ("rubricId") REFERENCES "rubrics"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_rubric_assessments" ADD CONSTRAINT "FK_task_rubric_assessments_student" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_rubric_assessments" ADD CONSTRAINT "FK_task_rubric_assessments_teacher" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        // Foreign key constraints for task_rubric_assessment_criteria
        await queryRunner.query(`ALTER TABLE "task_rubric_assessment_criteria" ADD CONSTRAINT "FK_task_rubric_assessment_criteria_assessment" FOREIGN KEY ("taskRubricAssessmentId") REFERENCES "task_rubric_assessments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_rubric_assessment_criteria" ADD CONSTRAINT "FK_task_rubric_assessment_criteria_criterion" FOREIGN KEY ("criterionId") REFERENCES "rubric_criteria"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_rubric_assessment_criteria" ADD CONSTRAINT "FK_task_rubric_assessment_criteria_level" FOREIGN KEY ("levelId") REFERENCES "rubric_levels"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_rubric_assessment_criteria" DROP CONSTRAINT "FK_task_rubric_assessment_criteria_level"`);
        await queryRunner.query(`ALTER TABLE "task_rubric_assessment_criteria" DROP CONSTRAINT "FK_task_rubric_assessment_criteria_criterion"`);
        await queryRunner.query(`ALTER TABLE "task_rubric_assessment_criteria" DROP CONSTRAINT "FK_task_rubric_assessment_criteria_assessment"`);
        await queryRunner.query(`ALTER TABLE "task_rubric_assessments" DROP CONSTRAINT "FK_task_rubric_assessments_teacher"`);
        await queryRunner.query(`ALTER TABLE "task_rubric_assessments" DROP CONSTRAINT "FK_task_rubric_assessments_student"`);
        await queryRunner.query(`ALTER TABLE "task_rubric_assessments" DROP CONSTRAINT "FK_task_rubric_assessments_rubric"`);
        await queryRunner.query(`ALTER TABLE "task_rubric_assessments" DROP CONSTRAINT "FK_task_rubric_assessments_submission"`);
        await queryRunner.query(`DROP TABLE "task_rubric_assessment_criteria"`);
        await queryRunner.query(`DROP TABLE "task_rubric_assessments"`);
    }
}