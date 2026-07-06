import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSharedNoteToNotificationType1755747000000 implements MigrationInterface {
  name = 'AddSharedNoteToNotificationType1755747000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Añadir 'shared_note' al enum notifications_type_enum
    await queryRunner.query(`
      ALTER TYPE notifications_type_enum ADD VALUE 'shared_note';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Para revertir, necesitaríamos recrear el enum sin 'shared_note'
    // Esto es complejo, así que por simplicidad dejamos una advertencia
    throw new Error('Cannot revert adding enum value - this would require recreating the enum');
  }
}