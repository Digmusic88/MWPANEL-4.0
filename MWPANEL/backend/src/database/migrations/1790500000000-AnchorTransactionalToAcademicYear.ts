import { MigrationInterface, QueryRunner } from 'typeorm';

export class AnchorTransactionalToAcademicYear1790500000000 implements MigrationInterface {
  name = 'AnchorTransactionalToAcademicYear1790500000000';

  private tables = ['attendance_records', 'centralized_grades', 'exam_grades', 'activities', 'tasks', 'evaluations'];

  public async up(q: QueryRunner): Promise<void> {
    for (const t of this.tables) {
      await q.query(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "academicYearId" uuid;`);
      await q.query(`CREATE INDEX IF NOT EXISTS "IDX_${t}_academic_year" ON "${t}" ("academicYearId");`);
      await q.query(`DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_${t}_academic_year') THEN
          ALTER TABLE "${t}" ADD CONSTRAINT "FK_${t}_academic_year"
            FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE SET NULL;
        END IF;
      END $$;`);
    }
    // Backfill por fecha (idempotente: solo filas con academicYearId NULL)
    await q.query(`UPDATE "attendance_records" x SET "academicYearId" = ay.id FROM "academic_years" ay
      WHERE x."academicYearId" IS NULL AND x."date" BETWEEN ay."startDate" AND ay."endDate";`);
    await q.query(`UPDATE "centralized_grades" x SET "academicYearId" = ay.id FROM "academic_years" ay
      WHERE x."academicYearId" IS NULL AND x."created_at"::date BETWEEN ay."startDate" AND ay."endDate";`);
    await q.query(`UPDATE "exam_grades" x SET "academicYearId" = ay.id FROM "academic_years" ay
      WHERE x."academicYearId" IS NULL AND x."created_at"::date BETWEEN ay."startDate" AND ay."endDate";`);
    await q.query(`UPDATE "activities" x SET "academicYearId" = ay.id FROM "academic_years" ay
      WHERE x."academicYearId" IS NULL AND x."createdAt"::date BETWEEN ay."startDate" AND ay."endDate";`);
    await q.query(`UPDATE "tasks" x SET "academicYearId" = ay.id FROM "academic_years" ay
      WHERE x."academicYearId" IS NULL AND x."createdAt"::date BETWEEN ay."startDate" AND ay."endDate";`);
    await q.query(`UPDATE "evaluations" x SET "academicYearId" = ay.id FROM "academic_years" ay
      WHERE x."academicYearId" IS NULL AND x."createdAt"::date BETWEEN ay."startDate" AND ay."endDate";`);
    // Fallback: lo no coincidente → año actual
    for (const t of this.tables) {
      await q.query(`UPDATE "${t}" SET "academicYearId" = (SELECT id FROM "academic_years" WHERE "isCurrent"=true LIMIT 1)
        WHERE "academicYearId" IS NULL;`);
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const t of this.tables) {
      await q.query(`ALTER TABLE "${t}" DROP CONSTRAINT IF EXISTS "FK_${t}_academic_year";`);
      await q.query(`DROP INDEX IF EXISTS "IDX_${t}_academic_year";`);
      await q.query(`ALTER TABLE "${t}" DROP COLUMN IF EXISTS "academicYearId";`);
    }
  }
}
