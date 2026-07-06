import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPresentationTypeToStudentNotes1755668700000 implements MigrationInterface {
  name = 'AddPresentationTypeToStudentNotes1755668700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar el tipo 'presentation' a la enum existente
    await queryRunner.query(`
      ALTER TYPE "student_notes_type_enum" 
      ADD VALUE 'presentation'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Nota: No se puede remover valores de ENUM directamente en PostgreSQL
    // Se necesitaría recrear el tipo y actualizar todas las referencias
    // Para simplificar, se omite la operación de rollback
    console.log('Rollback for ENUM value addition not implemented');
  }
}