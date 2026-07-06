import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { BlogPost } from './blog-post.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Entity to track which blog posts each user has viewed.
 * Used for showing unread post badges in the navigation menu.
 */
@Entity('blog_post_views')
@Unique(['postId', 'userId']) // Each user can only have one view record per post
@Index(['userId', 'viewedAt'])
export class BlogPostView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index('IDX_blog_post_views_postId')
  postId: string;

  @Column()
  @Index('IDX_blog_post_views_userId')
  userId: string;

  @CreateDateColumn()
  @Index('IDX_blog_post_views_viewedAt')
  viewedAt: Date;

  // Relations
  @ManyToOne(() => BlogPost, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'postId' })
  post: BlogPost;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;
}
