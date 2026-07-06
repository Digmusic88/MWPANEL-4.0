import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LessonResource } from './lesson-resource.entity';
import { User } from '../../users/entities/user.entity';

@Entity('lesson_resource_shares')
export class LessonResourceShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'resource_id' })
  resourceId: string;

  @Column({ name: 'shared_with_id' })
  sharedWithId: string;

  @Column({ name: 'shared_by_id' })
  sharedById: string;

  @Column({ name: 'permission_level', default: 'view' })
  permissionLevel: string;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relaciones
  @ManyToOne(() => LessonResource, resource => resource.shares, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resource_id' })
  resource: LessonResource;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shared_with_id' })
  sharedWith: User;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'shared_by_id' })
  sharedBy: User;

  // Computed properties
  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get isActive(): boolean {
    return !this.isExpired;
  }
}