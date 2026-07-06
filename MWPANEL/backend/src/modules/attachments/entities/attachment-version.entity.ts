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

@Entity('attachment_versions')
export class AttachmentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  attachmentId: string;

  @Column({ type: 'int' })
  versionNumber: number;

  @Column({ type: 'varchar' })
  driveFileId: string;

  @Column({ type: 'varchar' })
  fileName: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column({ type: 'text', nullable: true })
  changeDescription: string;

  @Column({ type: 'uuid' })
  uploadedById: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => TaskAttachment, (attachment) => attachment.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attachmentId' })
  attachment: TaskAttachment;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  // Virtual fields
  get formattedFileSize(): string {
    const size = Number(this.fileSize);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  get isLatestVersion(): boolean {
    return this.attachment?.currentVersion === this.versionNumber;
  }
}