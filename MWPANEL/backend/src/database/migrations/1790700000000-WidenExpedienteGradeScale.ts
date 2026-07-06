import { MigrationInterface, QueryRunner } from 'typeorm';

export class WidenExpedienteGradeScale1790700000000 implements MigrationInterface {
  name = 'WidenExpedienteGradeScale1790700000000';

  // Ensancha la escala del expediente de decimal(4,2) (máx 99.99) a decimal(5,2)
  // (máx 999.99) para admitir un 100.00 perfecto. Idempotente: el ALTER TYPE es
  // repetible sin daño y no trunca datos (solo amplía la precisión).
  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "academic_record_entries" ALTER COLUMN "numericValue" TYPE numeric(5,2);`,
    );
    await q.query(
      `ALTER TABLE "academic_records" ALTER COLUMN "finalGPA" TYPE numeric(5,2);`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    // Reducir a (4,2) podría fallar si ya hay valores >= 100; se deja como mejor
    // esfuerzo. No se ejecuta en prod.
    await q.query(
      `ALTER TABLE "academic_records" ALTER COLUMN "finalGPA" TYPE numeric(4,2);`,
    );
    await q.query(
      `ALTER TABLE "academic_record_entries" ALTER COLUMN "numericValue" TYPE numeric(4,2);`,
    );
  }
}
