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
import { TaskAttachment } from './task-attachment.entity';

@Entity('attachment_comments')
export class AttachmentComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  attachmentId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'uuid', nullable: true })
  parentCommentId: string;

  @Column({ type: 'boolean', default: false })
  isEdited: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => TaskAttachment, (attachment) => attachment.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attachmentId' })
  attachment: TaskAttachment;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => AttachmentComment, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentCommentId' })
  parentComment: AttachmentComment;

  @OneToMany(() => AttachmentComment, (comment) => comment.parentComment)
  replies: AttachmentComment[];

  // Virtual fields
  get isReply(): boolean {
    return !!this.parentCommentId;
  }

  get hasReplies(): boolean {
    return this.replies && this.replies.length > 0;
  }

  get repliesCount(): number {
    return this.replies?.length || 0;
  }

  get formattedCreatedAt(): string {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - this.createdAt.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return 'Hace unos momentos';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} minutos`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours} horas`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Hace ${diffInDays} días`;
    
    return this.createdAt.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: this.createdAt.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}