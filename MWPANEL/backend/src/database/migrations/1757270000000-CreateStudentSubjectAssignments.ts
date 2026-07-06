import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateStudentSubjectAssignments1757270000000 implements MigrationInterface {
  name = 'CreateStudentSubjectAssignments1757270000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'student_subject_assignments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'teacherId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'subjectId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'classGroupId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'studentId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'academicYearId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'weeklyHours',
            type: 'int',
            default: 0,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['teacherId'],
            referencedTableName: 'teachers',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['subjectId'],
            referencedTableName: 'subjects',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['classGroupId'],
            referencedTableName: 'class_groups',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['studentId'],
            referencedTableName: 'students',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['academicYearId'],
            referencedTableName: 'academic_years',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create unique index for student-subject-academicYear combination
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_student_subject_assignments_unique" 
      ON "student_subject_assignments" ("studentId", "subjectId", "academicYearId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_student_subject_assignments_unique"`);
    await queryRunner.dropTable('student_subject_assignments');
  }
}