import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGoogleDriveFieldsToTaskAttachments1753400000000 implements MigrationInterface {
    name = 'AddGoogleDriveFieldsToTaskAttachments1753400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Agregar campos de Google Drive a la tabla task_attachments
        await queryRunner.addColumns('task_attachments', [
            new TableColumn({
                name: 'driveFileId',
                type: 'varchar',
                length: '255',
                isNullable: true,
                comment: 'ID del archivo en Google Drive'
            }),
            new TableColumn({
                name: 'driveFolderId',
                type: 'varchar',
                length: '255',
                isNullable: true,
                comment: 'ID de la carpeta en Google Drive'
            }),
            new TableColumn({
                name: 'driveWebViewLink',
                type: 'varchar',
                length: '1000',
                isNullable: true,
                comment: 'URL de visualización en Google Drive'
            }),
            new TableColumn({
                name: 'driveDownloadLink',
                type: 'varchar',
                length: '1000',
                isNullable: true,
                comment: 'URL de descarga directa de Google Drive'
            }),
            new TableColumn({
                name: 'driveFolderPath',
                type: 'text',
                isNullable: true,
                comment: 'Ruta de carpetas en Google Drive (JSON array)'
            })
        ]);

        // Hacer que el campo 'path' sea nullable ya que ahora puede estar en Google Drive
        await queryRunner.changeColumn('task_attachments', 'path', new TableColumn({
            name: 'path',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'Ruta del archivo en el servidor (local, puede ser null si está en Google Drive)'
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar campos de Google Drive
        await queryRunner.dropColumn('task_attachments', 'driveFileId');
        await queryRunner.dropColumn('task_attachments', 'driveFolderId');
        await queryRunner.dropColumn('task_attachments', 'driveWebViewLink');
        await queryRunner.dropColumn('task_attachments', 'driveDownloadLink');
        await queryRunner.dropColumn('task_attachments', 'driveFolderPath');

        // Restaurar el campo 'path' como no nullable
        await queryRunner.changeColumn('task_attachments', 'path', new TableColumn({
            name: 'path',
            type: 'varchar',
            length: '500',
            isNullable: false
        }));
    }
}