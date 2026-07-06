import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateExamGradeRubricScores1753850000000 implements MigrationInterface {
  name = 'CreateExamGradeRubricScores1753850000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla exam_grade_rubric_scores para almacenar scores de rúbrica en Test Yourself
    await queryRunner.createTable(
      new Table({
        name: 'exam_grade_rubric_scores',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'exam_grade_id',
            type: 'uuid',
            isNullable: false,
            comment: 'ID de la calificación exam_grade',
          },
          {
            name: 'criterion_id',
            type: 'uuid',
            isNullable: false,
            comment: 'ID del criterio de la rúbrica',
          },
          {
            name: 'criterion_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
            comment: 'Nombre del criterio (cache para reportes)',
          },
          {
            name: 'level_id',
            type: 'uuid',
            isNullable: false,
            comment: 'ID del nivel seleccionado',
          },
          {
            name: 'level_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
            comment: 'Nombre del nivel (cache para reportes)',
          },
          {
            name: 'points',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
            comment: 'Puntos otorgados para este criterio',
          },
          {
            name: 'weight',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: false,
            comment: 'Peso del criterio en la rúbrica (ej: 0.25 para 25%)',
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            comment: 'Fecha de creación del score',
          },
        ],
        comment: 'Scores individuales de rúbrica para calificaciones Test Yourself',
      }),
      true
    );

    // Crear índices
    await queryRunner.createIndex(
      'exam_grade_rubric_scores',
      new TableIndex({
        name: 'IDX_exam_grade_rubric_scores_exam_grade_id',
        columnNames: ['exam_grade_id'],
      })
    );

    await queryRunner.createIndex(
      'exam_grade_rubric_scores',
      new TableIndex({
        name: 'IDX_exam_grade_rubric_scores_criterion_id',
        columnNames: ['criterion_id'],
      })
    );

    await queryRunner.createIndex(
      'exam_grade_rubric_scores',
      new TableIndex({
        name: 'IDX_exam_grade_rubric_scores_level_id',
        columnNames: ['level_id'],
      })
    );

    // Índice único para evitar duplicados por criterio en la misma calificación
    await queryRunner.createIndex(
      'exam_grade_rubric_scores',
      new TableIndex({
        name: 'UQ_exam_grade_rubric_scores_grade_criterion',
        columnNames: ['exam_grade_id', 'criterion_id'],
        isUnique: true,
      })
    );

    // Crear claves foráneas
    await queryRunner.createForeignKey(
      'exam_grade_rubric_scores',
      new TableForeignKey({
        columnNames: ['exam_grade_id'],
        referencedTableName: 'exam_grades',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'exam_grade_rubric_scores',
      new TableForeignKey({
        columnNames: ['criterion_id'],
        referencedTableName: 'rubric_criteria',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'exam_grade_rubric_scores',
      new TableForeignKey({
        columnNames: ['level_id'],
        referencedTableName: 'rubric_levels',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    console.log('✅ Migración CreateExamGradeRubricScores completada');
    console.log('📋 Tabla exam_grade_rubric_scores creada con:');
    console.log('   - Relación con exam_grades');
    console.log('   - Scores individuales por criterio');
    console.log('   - Cache de nombres para reportes');
    console.log('   - Restricción única por criterio/calificación');
    console.log('   - Índices optimizados para consultas');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar tabla (las foreign keys se eliminan automáticamente)
    await queryRunner.dropTable('exam_grade_rubric_scores');

    console.log('❌ Migración CreateExamGradeRubricScores revertida');
    console.log('📋 Tabla exam_grade_rubric_scores eliminada');
  }
}