import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixStudentNoteTypeEnum1755920900000 implements MigrationInterface {
  name = 'FixStudentNoteTypeEnum1755920900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear el tipo enum con todos los valores incluyendo mindmap
    await queryRunner.query(`
      CREATE TYPE "student_notes_type_enum" AS ENUM (
        'text', 
        'voice', 
        'drawing', 
        'presentation', 
        'mixed', 
        'mindmap'
      )
    `);

    // 2. Cambiar la columna type de varchar a enum
    await queryRunner.query(`
      ALTER TABLE "student_notes" 
      ALTER COLUMN "type" TYPE "student_notes_type_enum" 
      USING "type"::"student_notes_type_enum"
    `);

    // 3. Establecer el valor por defecto
    await queryRunner.query(`
      ALTER TABLE "student_notes" 
      ALTER COLUMN "type" SET DEFAULT 'text'
    `);

    console.log('✅ Fixed student_notes type column to use proper enum with mindmap support');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir a varchar
    await queryRunner.query(`
      ALTER TABLE "student_notes" 
      ALTER COLUMN "type" TYPE character varying
    `);

    // Eliminar el tipo enum
    await queryRunner.query(`DROP TYPE "student_notes_type_enum"`);

    console.log('⬇️ Reverted student_notes type column to varchar');
  }
}