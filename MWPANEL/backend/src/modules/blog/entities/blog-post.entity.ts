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
import { BlogComment } from './blog-comment.entity';
import { BlogMedia } from './blog-media.entity';
import { BlogCategory } from './blog-category.entity';

export enum BlogPostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  SCHEDULED = 'scheduled',
}

export enum BlogPostVisibility {
  PUBLIC = 'public',              // Visible to everyone
  STAFF_ONLY = 'staff_only',      // Only staff (admin, teachers)
  STUDENTS_ONLY = 'students_only', // Only students
  FAMILIES_ONLY = 'families_only', // Only families
  CLASS_SPECIFIC = 'class_specific', // Specific class groups
  PRIVATE = 'private',            // Only author
}

@Entity('blog_posts')
@Index(['status', 'visibility'])
@Index(['publishDate'])
@Index(['featured'])
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  excerpt: string;

  @Column({ length: 255, unique: true })
  @Index()
  slug: string;

  @Column({
    type: 'enum',
    enum: BlogPostStatus,
    default: BlogPostStatus.DRAFT,
  })
  @Index()
  status: BlogPostStatus;

  @Column({
    type: 'enum',
    enum: BlogPostVisibility,
    default: BlogPostVisibility.PUBLIC,
  })
  @Index()
  visibility: BlogPostVisibility;

  @Column({ default: false })
  @Index()
  featured: boolean;

  @Column({ type: 'json', nullable: true })
  visibilitySettings: {
    classGroups?: string[];
    educationalLevels?: string[];
    subjects?: string[];
  };

  @Column({ type: 'timestamp', nullable: true })
  publishDate: Date;

  @Column({ nullable: true, length: 255 })
  featuredImage: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ default: 0 })
  views: number;

  @Column({ default: 0 })
  likes: number;

  @Column({ default: true })
  commentsEnabled: boolean;

  @Column({ type: 'json', nullable: true })
  seoData: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };

  // Author relationship
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'author_id' })
  author: User;

  // Category relationship
  @ManyToOne(() => BlogCategory, {
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: 'category_id' })
  category: BlogCategory;

  // Comments relationship
  @OneToMany(() => BlogComment, (comment) => comment.post, {
    cascade: true,
  })
  comments: BlogComment[];

  // Media attachments relationship
  @OneToMany(() => BlogMedia, (media) => media.post, {
    cascade: true,
    eager: true,
  })
  media: BlogMedia[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isPublished(): boolean {
    return (
      this.status === BlogPostStatus.PUBLISHED &&
      (!this.publishDate || this.publishDate <= new Date())
    );
  }

  get isScheduled(): boolean {
    return (
      this.status === BlogPostStatus.SCHEDULED &&
      this.publishDate &&
      this.publishDate > new Date()
    );
  }

  get commentsCount(): number {
    return this.comments ? this.comments.length : 0;
  }

  get mediaCount(): number {
    return this.media ? this.media.length : 0;
  }
}