import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateBlogPostViews1764300000000 implements MigrationInterface {
  name = 'CreateBlogPostViews1764300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create blog_post_views table
    await queryRunner.createTable(
      new Table({
        name: 'blog_post_views',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'postId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'viewedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add unique constraint for post-user combination
    await queryRunner.query(`
      ALTER TABLE blog_post_views
      ADD CONSTRAINT "UQ_blog_post_views_post_user"
      UNIQUE ("postId", "userId")
    `);

    // Add foreign key to blog_posts
    await queryRunner.query(`
      ALTER TABLE blog_post_views
      ADD CONSTRAINT "FK_blog_post_views_post"
      FOREIGN KEY ("postId") REFERENCES blog_posts(id) ON DELETE CASCADE
    `);

    // Add foreign key to users
    await queryRunner.query(`
      ALTER TABLE blog_post_views
      ADD CONSTRAINT "FK_blog_post_views_user"
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
    `);

    // Create indexes for faster queries
    await queryRunner.createIndex(
      'blog_post_views',
      new TableIndex({
        name: 'IDX_blog_post_views_postId',
        columnNames: ['postId'],
      }),
    );

    await queryRunner.createIndex(
      'blog_post_views',
      new TableIndex({
        name: 'IDX_blog_post_views_userId',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'blog_post_views',
      new TableIndex({
        name: 'IDX_blog_post_views_viewedAt',
        columnNames: ['viewedAt'],
      }),
    );

    await queryRunner.createIndex(
      'blog_post_views',
      new TableIndex({
        name: 'IDX_blog_post_views_user_viewedAt',
        columnNames: ['userId', 'viewedAt'],
      }),
    );

    console.log('Created blog_post_views table with indexes');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('blog_post_views', 'IDX_blog_post_views_user_viewedAt');
    await queryRunner.dropIndex('blog_post_views', 'IDX_blog_post_views_viewedAt');
    await queryRunner.dropIndex('blog_post_views', 'IDX_blog_post_views_userId');
    await queryRunner.dropIndex('blog_post_views', 'IDX_blog_post_views_postId');

    // Drop foreign keys
    await queryRunner.query(`ALTER TABLE blog_post_views DROP CONSTRAINT IF EXISTS "FK_blog_post_views_user"`);
    await queryRunner.query(`ALTER TABLE blog_post_views DROP CONSTRAINT IF EXISTS "FK_blog_post_views_post"`);

    // Drop unique constraint
    await queryRunner.query(`ALTER TABLE blog_post_views DROP CONSTRAINT IF EXISTS "UQ_blog_post_views_post_user"`);

    // Drop table
    await queryRunner.dropTable('blog_post_views');

    console.log('Dropped blog_post_views table');
  }
}
