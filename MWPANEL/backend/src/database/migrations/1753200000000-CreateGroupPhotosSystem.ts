import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateGroupPhotosSystem1753200000000 implements MigrationInterface {
  name = 'CreateGroupPhotosSystem1753200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear tabla para fotos grupales
    await queryRunner.createTable(
      new Table({
        name: 'group_photos',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'originalFilename',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'originalUrl',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'uploadDate',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'uploadedById',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'classGroupId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'processingStatus',
            type: 'enum',
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: "'pending'",
          },
          {
            name: 'facesDetected',
            type: 'integer',
            default: 0,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            comment: 'Metadata adicional como dimensiones, tamaño, etc.',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 2. Crear tabla para detecciones faciales
    await queryRunner.createTable(
      new Table({
        name: 'face_detections',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'groupPhotoId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'faceCoordinates',
            type: 'jsonb',
            isNullable: false,
            comment: 'Coordenadas del rostro: {x, y, width, height}',
          },
          {
            name: 'thumbnailUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'confidenceScore',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
            comment: 'Confianza de la detección facial (0.0 - 1.0)',
          },
          {
            name: 'assignedStudentId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'assignedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'assignedById',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'facialEmbedding',
            type: 'jsonb',
            isNullable: true,
            comment: 'Vector de embeddings faciales para matching automático',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 3. Crear índices para optimizar queries
    await queryRunner.createIndex(
      'group_photos',
      new TableIndex({
        name: 'IDX_GROUP_PHOTOS_UPLOADED_BY',
        columnNames: ['uploadedById'],
      }),
    );

    await queryRunner.createIndex(
      'group_photos',
      new TableIndex({
        name: 'IDX_GROUP_PHOTOS_CLASS_GROUP',
        columnNames: ['classGroupId'],
      }),
    );

    await queryRunner.createIndex(
      'group_photos',
      new TableIndex({
        name: 'IDX_GROUP_PHOTOS_STATUS',
        columnNames: ['processingStatus'],
      }),
    );

    await queryRunner.createIndex(
      'face_detections',
      new TableIndex({
        name: 'IDX_FACE_DETECTIONS_GROUP_PHOTO',
        columnNames: ['groupPhotoId'],
      }),
    );

    await queryRunner.createIndex(
      'face_detections',
      new TableIndex({
        name: 'IDX_FACE_DETECTIONS_STUDENT',
        columnNames: ['assignedStudentId'],
      }),
    );

    await queryRunner.createIndex(
      'face_detections',
      new TableIndex({
        name: 'IDX_FACE_DETECTIONS_ASSIGNED_BY',
        columnNames: ['assignedById'],
      }),
    );

    // 4. Crear foreign keys
    await queryRunner.createForeignKey(
      'group_photos',
      new TableForeignKey({
        columnNames: ['uploadedById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'group_photos',
      new TableForeignKey({
        columnNames: ['classGroupId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'class_groups',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'face_detections',
      new TableForeignKey({
        columnNames: ['groupPhotoId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'group_photos',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'face_detections',
      new TableForeignKey({
        columnNames: ['assignedStudentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'students',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'face_detections',
      new TableForeignKey({
        columnNames: ['assignedById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign keys
    const groupPhotosTable = await queryRunner.getTable('group_photos');
    const faceDetectionsTable = await queryRunner.getTable('face_detections');

    if (groupPhotosTable) {
      const foreignKeys = groupPhotosTable.foreignKeys.filter(
        (fk) => fk.columnNames.indexOf('uploadedById') !== -1 || fk.columnNames.indexOf('classGroupId') !== -1,
      );
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('group_photos', foreignKey);
      }
    }

    if (faceDetectionsTable) {
      const foreignKeys = faceDetectionsTable.foreignKeys.filter(
        (fk) =>
          fk.columnNames.indexOf('groupPhotoId') !== -1 ||
          fk.columnNames.indexOf('assignedStudentId') !== -1 ||
          fk.columnNames.indexOf('assignedById') !== -1,
      );
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('face_detections', foreignKey);
      }
    }

    // Eliminar tablas
    await queryRunner.dropTable('face_detections');
    await queryRunner.dropTable('group_photos');
  }
}