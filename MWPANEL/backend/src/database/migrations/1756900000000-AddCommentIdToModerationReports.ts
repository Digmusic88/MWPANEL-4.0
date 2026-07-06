import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddCommentIdToModerationReports1756900000000 implements MigrationInterface {
  name = 'AddCommentIdToModerationReports1756900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 MIGRATION: Adding commentId field to moderation_reports table...');

    // Añadir la columna commentId como nullable
    await queryRunner.addColumn(
      'moderation_reports',
      new TableColumn({
        name: 'commentId',
        type: 'uuid',
        isNullable: true,
        comment: 'ID del comentario reportado (opcional, para reportes de comentarios específicos)'
      })
    );

    // Crear la foreign key hacia la tabla shared_note_comments
    await queryRunner.createForeignKey(
      'moderation_reports',
      new TableForeignKey({
        name: 'FK_moderation_reports_commentId',
        columnNames: ['commentId'],
        referencedTableName: 'shared_note_comments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE', // Si se elimina el comentario, se elimina el reporte
        onUpdate: 'CASCADE'
      })
    );

    console.log('✅ MIGRATION: commentId field added successfully to moderation_reports');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 MIGRATION: Removing commentId field from moderation_reports table...');

    // Eliminar la foreign key
    await queryRunner.dropForeignKey('moderation_reports', 'FK_moderation_reports_commentId');

    // Eliminar la columna
    await queryRunner.dropColumn('moderation_reports', 'commentId');

    console.log('✅ MIGRATION: commentId field removed successfully from moderation_reports');
  }
}