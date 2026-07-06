import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ScheduledTargetType {
  INDIVIDUAL = 'individual',
  GROUPS = 'groups',
  ALL = 'all',
}

export enum ScheduledMessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

/**
 * Mensaje programado (estilo Gmail): se envía automáticamente a la fecha/hora elegida.
 * El cron de ScheduledMessagesService lo despacha cuando llega su momento.
 */
@Entity('scheduled_messages')
@Index(['status', 'scheduledFor'])
export class ScheduledMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'sender_id' })
  senderId: string;

  @Column()
  subject: string;

  @Column('text')
  content: string;

  @Column({ name: 'content_type', default: 'html' })
  contentType: string;

  @Column({ default: 'normal' })
  priority: string;

  @Column({
    type: 'enum',
    enum: ScheduledTargetType,
    name: 'target_type',
  })
  targetType: ScheduledTargetType;

  // Para targetType = individual
  @Column({ name: 'recipient_id', nullable: true })
  recipientId?: string;

  // Para targetType = groups (IDs de grupos de clase)
  @Column('text', { array: true, nullable: true, name: 'class_group_ids' })
  classGroupIds?: string[];

  @Column({ type: 'timestamptz', name: 'scheduled_for' })
  @Index()
  scheduledFor: Date;

  @Column({
    type: 'enum',
    enum: ScheduledMessageStatus,
    default: ScheduledMessageStatus.PENDING,
  })
  status: ScheduledMessageStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'sent_at' })
  sentAt?: Date;

  @Column({ type: 'int', default: 0, name: 'recipients_count' })
  recipientsCount: number;

  @Column('text', { nullable: true })
  error?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
