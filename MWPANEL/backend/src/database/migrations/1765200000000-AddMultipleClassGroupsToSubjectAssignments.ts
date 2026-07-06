import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddMultipleClassGroupsToSubjectAssignments1765200000000 implements MigrationInterface {
  name = 'AddMultipleClassGroupsToSubjectAssignments1765200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create junction table for many-to-many relationship
    await queryRunner.createTable(
      new Table({
        name: 'subject_assignment_class_groups',
        columns: [
          {
            name: 'subjectAssignmentId',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'classGroupId',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 2. Add foreign key to subject_assignments
    await queryRunner.createForeignKey(
      'subject_assignment_class_groups',
      new TableForeignKey({
        name: 'FK_subject_assignment_class_groups_assignment',
        columnNames: ['subjectAssignmentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'subject_assignments',
        onDelete: 'CASCADE',
      }),
    );

    // 3. Add foreign key to class_groups
    await queryRunner.createForeignKey(
      'subject_assignment_class_groups',
      new TableForeignKey({
        name: 'FK_subject_assignment_class_groups_classgroup',
        columnNames: ['classGroupId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'class_groups',
        onDelete: 'CASCADE',
      }),
    );

    // 4. Create indexes for faster queries
    await queryRunner.createIndex(
      'subject_assignment_class_groups',
      new TableIndex({
        name: 'IDX_subject_assignment_class_groups_assignment',
        columnNames: ['subjectAssignmentId'],
      }),
    );

    await queryRunner.createIndex(
      'subject_assignment_class_groups',
      new TableIndex({
        name: 'IDX_subject_assignment_class_groups_classgroup',
        columnNames: ['classGroupId'],
      }),
    );

    // 5. Migrate existing data from classGroupId to junction table
    await queryRunner.query(`
      INSERT INTO subject_assignment_class_groups ("subjectAssignmentId", "classGroupId", "createdAt")
      SELECT id, "classGroupId", "createdAt"
      FROM subject_assignments
      WHERE "classGroupId" IS NOT NULL
    `);

    console.log('Created subject_assignment_class_groups junction table and migrated existing data');

    // 6. Make classGroupId nullable (for backward compatibility during transition)
    await queryRunner.query(`
      ALTER TABLE subject_assignments
      ALTER COLUMN "classGroupId" DROP NOT NULL
    `);

    console.log('Made classGroupId nullable for backward compatibility');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Restore NOT NULL constraint on classGroupId
    // First, ensure all assignments have at least one class group
    await queryRunner.query(`
      UPDATE subject_assignments sa
      SET "classGroupId" = (
        SELECT "classGroupId"
        FROM subject_assignment_class_groups sacg
        WHERE sacg."subjectAssignmentId" = sa.id
        LIMIT 1
      )
      WHERE sa."classGroupId" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE subject_assignments
      ALTER COLUMN "classGroupId" SET NOT NULL
    `);

    // 2. Drop indexes
    await queryRunner.dropIndex('subject_assignment_class_groups', 'IDX_subject_assignment_class_groups_classgroup');
    await queryRunner.dropIndex('subject_assignment_class_groups', 'IDX_subject_assignment_class_groups_assignment');

    // 3. Drop foreign keys
    await queryRunner.dropForeignKey('subject_assignment_class_groups', 'FK_subject_assignment_class_groups_classgroup');
    await queryRunner.dropForeignKey('subject_assignment_class_groups', 'FK_subject_assignment_class_groups_assignment');

    // 4. Drop junction table
    await queryRunner.dropTable('subject_assignment_class_groups');

    console.log('Reverted subject_assignment_class_groups migration');
  }
}
