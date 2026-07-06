import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BlogPost } from './blog-post.entity';

export enum CommentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SPAM = 'spam',
}

@Entity('blog_comments')
@Index(['status'])
@Index(['createdAt'])
export class BlogComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: CommentStatus,
    default: CommentStatus.PENDING,
  })
  @Index()
  status: CommentStatus;

  @Column({ default: 0 })
  likes: number;

  @Column({ default: 0 })
  dislikes: number;

  @Column({ type: 'json', nullable: true })
  moderationData: {
    moderatedBy?: string;
    moderationReason?: string;
    moderationDate?: Date;
  };

  // Author relationship
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column('uuid', { name: 'author_id' })
  authorId: string;

  // Post relationship
  @ManyToOne(() => BlogPost, (post) => post.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'post_id' })
  post: BlogPost;

  @Column('uuid', { name: 'post_id' })
  postId: string;

  // Parent comment for replies (self-referencing)
  @ManyToOne(() => BlogComment, (comment) => comment.replies, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: BlogComment;

  @Column('uuid', { name: 'parent_id', nullable: true })
  parentId: string;

  // Child comments (replies)
  @OneToMany(() => BlogComment, (comment) => comment.parent, {
    cascade: true,
  })
  replies: BlogComment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isApproved(): boolean {
    return this.status === CommentStatus.APPROVED;
  }

  get repliesCount(): number {
    return this.replies ? this.replies.length : 0;
  }

  get totalScore(): number {
    return this.likes - this.dislikes;
  }
}