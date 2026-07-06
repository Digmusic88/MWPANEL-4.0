import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedEducationalLevels1751893200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert default educational levels if they don't exist
    await queryRunner.query(`
      INSERT INTO educational_levels (id, name, code, description) 
      VALUES 
        ('11111111-1111-1111-1111-111111111111', 'Educación Infantil', 'INFANTIL', 'Nivel educativo para niños de 3 a 6 años'),
        ('22222222-2222-2222-2222-222222222222', 'Educación Primaria', 'PRIMARIA', 'Nivel educativo para niños de 6 a 12 años'),
        ('33333333-3333-3333-3333-333333333333', 'Educación Secundaria', 'SECUNDARIA', 'Nivel educativo para adolescentes de 12 a 16 años')
      ON CONFLICT (code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the educational levels
    await queryRunner.query(`
      DELETE FROM educational_levels 
      WHERE code IN ('INFANTIL', 'PRIMARIA', 'SECUNDARIA');
    `);
  }
}