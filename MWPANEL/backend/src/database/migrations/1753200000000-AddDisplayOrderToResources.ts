import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDisplayOrderToResources1753200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add displayOrder column to educational_resources table
    await queryRunner.addColumn(
      'educational_resources',
      new TableColumn({
        name: 'displayOrder',
        type: 'integer',
        default: 0,
        isNullable: false,
      })
    );

    // Initialize displayOrder for existing resources based on their creation date
    await queryRunner.query(`
      UPDATE educational_resources
      SET "displayOrder" = subquery.row_num
      FROM (
        SELECT
          id,
          ROW_NUMBER() OVER (PARTITION BY "folderId", "subjectId" ORDER BY "createdAt" ASC) - 1 as row_num
        FROM educational_resources
      ) AS subquery
      WHERE educational_resources.id = subquery.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('educational_resources', 'displayOrder');
  }
}
