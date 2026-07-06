import { MigrationInterface, QueryRunner } from 'typeorm';

export class AcademicRecordYearToFk1790600000000 implements MigrationInterface {
  name = 'AcademicRecordYearToFk1790600000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "academic_records" ALTER COLUMN "academicYear" TYPE varchar USING "academicYear"::text;`);
    await q.query(`DROP TYPE IF EXISTS "academic_records_academicyear_enum";`);
    await q.query(`ALTER TABLE "academic_records" ADD COLUMN IF NOT EXISTS "academicYearId" uuid;`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_academic_records_academic_year" ON "academic_records" ("academicYearId");`);
    await q.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FK_academic_records_academic_year') THEN
      ALTER TABLE "academic_records" ADD CONSTRAINT "FK_academic_records_academic_year"
        FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE SET NULL; END IF; END $$;`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "academic_records" DROP CONSTRAINT IF EXISTS "FK_academic_records_academic_year";`);
    await q.query(`DROP INDEX IF EXISTS "IDX_academic_records_academic_year";`);
    await q.query(`ALTER TABLE "academic_records" DROP COLUMN IF EXISTS "academicYearId";`);
    // (no se recrea el enum en down: el varchar es compatible)
  }
}
