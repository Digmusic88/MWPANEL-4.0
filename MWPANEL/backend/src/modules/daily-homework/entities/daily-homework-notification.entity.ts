import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { DailyHomeworkRecord } from './daily-homework-record.entity';
import { User } from '../../users/entities/user.entity';

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

@Entity('daily_homework_notifications')
export class DailyHomeworkNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'record_id' })
  recordId: string;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ name: 'guardian_user_id', nullable: true })
  guardianUserId: string | null;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'sent_at' })
  sentAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string | null;

  @ApiProperty({ description: 'Estado del registro al enviar' })
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'record_status_snapshot' })
  recordStatusSnapshot: string | null;

  @ManyToOne(() => DailyHomeworkRecord, (r) => r.notifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'record_id' })
  record: DailyHomeworkRecord;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'guardian_user_id' })
  guardianUser: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
