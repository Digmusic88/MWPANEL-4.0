import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAcademicYearArchive1790400000000 implements MigrationInterface {
  name = 'AddAcademicYearArchive1790400000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "academic_years" ADD COLUMN IF NOT EXISTS "isArchived" boolean NOT NULL DEFAULT false;`);
    await q.query(`ALTER TABLE "academic_years" ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz;`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_academic_year_current" ON "academic_years" ("isCurrent") WHERE "isCurrent" = true;`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "UQ_academic_year_current";`);
    await q.query(`ALTER TABLE "academic_years" DROP COLUMN IF EXISTS "archivedAt";`);
    await q.query(`ALTER TABLE "academic_years" DROP COLUMN IF EXISTS "isArchived";`);
  }
}
