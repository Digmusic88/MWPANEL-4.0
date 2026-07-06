import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddContentTypeToMessages1752500000000 implements MigrationInterface {
  name = 'AddContentTypeToMessages1752500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar columna contentType a la tabla messages
    await queryRunner.addColumn(
      'messages',
      new TableColumn({
        name: 'contentType',
        type: 'varchar',
        length: '50',
        default: "'html'",
        comment: 'Content type: text, html, markdown',
      })
    );

    // Actualizar mensajes existentes para que tengan contentType 'text' 
    // ya que no fueron creados con el editor WYSIWYG
    await queryRunner.query(`
      UPDATE messages 
      SET "contentType" = 'text' 
      WHERE "contentType" IS NULL OR "contentType" = 'html'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar columna contentType
    await queryRunner.dropColumn('messages', 'contentType');
  }
}