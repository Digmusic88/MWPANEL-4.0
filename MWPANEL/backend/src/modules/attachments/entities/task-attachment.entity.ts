import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Activity } from '../../activities/entities/activity.entity';
import { AttachmentVersion } from './attachment-version.entity';
import { AttachmentAuditLog } from './attachment-audit-log.entity';
import { AttachmentComment } from './attachment-comment.entity';

export interface TaskAttachmentMetadata {
  version: number;
  isStudentSubmission: boolean;
  isTeacherMaterial: boolean;
  submittedAt?: Date;
  gradeLevel?: string;
  subject?: string;
  academicYear?: string;
  tags?: string[];
  description?: string;
  [key: string]: any;
}

@Entity('new_task_attachments')
export class TaskAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  taskId: string;

  @Column({ type: 'uuid', nullable: true })
  activityId: string;

  @Column({ type: 'uuid' })
  uploadedById: string;

  @Column({ type: 'varchar' })
  driveFileId: string;

  @Column({ type: 'varchar' })
  driveFolderId: string;

  @Column({ type: 'varchar' })
  fileName: string;

  @Column({ type: 'varchar' })
  originalFileName: string;

  @Column({ type: 'varchar' })
  mimeType: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column({ type: 'varchar', nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'varchar', nullable: true })
  webViewLink: string;

  @Column({ type: 'varchar', nullable: true })
  downloadLink: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: TaskAttachmentMetadata;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @ManyToOne(() => Activity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activityId' })
  activity: Activity;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @OneToMany(() => AttachmentVersion, (version) => version.attachment, {
    cascade: true,
  })
  versions: AttachmentVersion[];

  @OneToMany(() => AttachmentAuditLog, (auditLog) => auditLog.attachment, {
    cascade: true,
  })
  auditLogs: AttachmentAuditLog[];

  @OneToMany(() => AttachmentComment, (comment) => comment.attachment, {
    cascade: true,
  })
  comments: AttachmentComment[];

  // Virtual fields
  get currentVersion(): number {
    return this.metadata?.version || 1;
  }

  get isStudentSubmission(): boolean {
    return this.metadata?.isStudentSubmission || false;
  }

  get isTeacherMaterial(): boolean {
    return this.metadata?.isTeacherMaterial || false;
  }

  get commentsCount(): number {
    return this.comments?.length || 0;
  }

  get versionsCount(): number {
    return this.versions?.length || 0;
  }
}