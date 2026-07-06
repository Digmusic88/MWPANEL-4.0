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

@Entity('lesson_resource_access_logs')
export class LessonResourceAccessLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'resource_id' })
  resourceId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  action: string; // 'view', 'download', 'share', 'edit', 'delete'

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  @CreateDateColumn({ name: 'accessed_at' })
  accessedAt: Date;

  // Relaciones
  @ManyToOne(() => LessonResource, resource => resource.accessLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resource_id' })
  resource: LessonResource;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Métodos estáticos para crear logs
  static createViewLog(resourceId: string, userId: string, ipAddress?: string, userAgent?: string): Partial<LessonResourceAccessLog> {
    return {
      resourceId,
      userId,
      action: 'view',
      ipAddress,
      userAgent,
    };
  }

  static createDownloadLog(resourceId: string, userId: string, ipAddress?: string, userAgent?: string): Partial<LessonResourceAccessLog> {
    return {
      resourceId,
      userId,
      action: 'download',
      ipAddress,
      userAgent,
    };
  }

  static createShareLog(resourceId: string, userId: string, ipAddress?: string, userAgent?: string): Partial<LessonResourceAccessLog> {
    return {
      resourceId,
      userId,
      action: 'share',
      ipAddress,
      userAgent,
    };
  }
}