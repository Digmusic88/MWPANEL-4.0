import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BlogPost } from './blog-post.entity';

@Entity('blog_categories')
@Index(['slug'])
export class BlogCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255, unique: true })
  @Index()
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 7, default: '#3B82F6' })
  color: string; // Hex color for category display

  @Column({ length: 50, nullable: true })
  icon: string; // Icon class or name

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  // Posts relationship - temporarily removed to avoid circular dependency
  // @OneToMany(() => BlogPost, (post) => post.category)
  // posts: BlogPost[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  // get postsCount(): number {
  //   return this.posts ? this.posts.length : 0;
  // }
}