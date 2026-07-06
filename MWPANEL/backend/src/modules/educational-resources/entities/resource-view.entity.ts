import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { EducationalResource } from './educational-resource.entity';
import { User } from '../../users/entities/user.entity';

@Entity('resource_views')
export class ResourceView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  resourceId: string;

  @Column()
  userId: string;

  @CreateDateColumn()
  @Index('IDX_resource_views_viewedAt')
  viewedAt: Date;

  @Column({ nullable: true })
  duration: number; // in seconds

  @Column({ nullable: true })
  completionPercentage: number;

  @Column({ default: 'web' })
  viewType: string; // 'web', 'download', 'embed'

  // Relations
  @ManyToOne(() => EducationalResource, resource => resource.resourceViews, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resourceId' })
  resource: EducationalResource;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}