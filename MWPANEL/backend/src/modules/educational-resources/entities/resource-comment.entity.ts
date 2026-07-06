import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { EducationalResource } from './educational-resource.entity';
import { User } from '../../users/entities/user.entity';

@Entity('resource_comments')
export class ResourceComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  resourceId: string;

  @Column()
  userId: string;

  @Column('text')
  content: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => EducationalResource, resource => resource.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resourceId' })
  resource: EducationalResource;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}