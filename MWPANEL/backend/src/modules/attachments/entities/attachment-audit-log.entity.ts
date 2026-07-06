import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TaskAttachment } from './task-attachment.entity';

export type AuditAction = 'view' | 'download' | 'upload' | 'delete' | 'restore' | 'share' | 'comment' | 'move' | 'rename';

export interface AuditLogDetails {
  ip?: string;
  userAgent?: string;
  previousValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  fileName?: string;
  fileSize?: number;
  targetPath?: string;
  shareToken?: string;
  commentId?: string;
  [key: string]: any;
}

@Entity('attachment_audit_logs')
export class AttachmentAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  attachmentId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'varchar',
    enum: ['view', 'download', 'upload', 'delete', 'restore', 'share', 'comment', 'move', 'rename'],
  })
  action: AuditAction;

  @Column({ type: 'jsonb', nullable: true })
  details: AuditLogDetails;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => TaskAttachment, (attachment) => attachment.auditLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attachmentId' })
  attachment: TaskAttachment;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Virtual fields
  get actionDisplayName(): string {
    const actionNames: Record<AuditAction, string> = {
      view: 'Visualizado',
      download: 'Descargado',
      upload: 'Subido',
      delete: 'Eliminado',
      restore: 'Restaurado',
      share: 'Compartido',
      comment: 'Comentado',
      move: 'Movido',
      rename: 'Renombrado',
    };
    return actionNames[this.action] || this.action;
  }

  get isSecurityRelevant(): boolean {
    return ['delete', 'share', 'move'].includes(this.action);
  }
}