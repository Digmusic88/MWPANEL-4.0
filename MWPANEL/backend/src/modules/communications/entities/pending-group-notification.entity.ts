/**
 * @archivo: pending-group-notification.entity.ts
 * @módulo: Communications - Pending Group Notifications
 * @función: Entidad para almacenar notificaciones de grupo pendientes de enviar
 * @creado_por: Sistema de Grupos MW Panel 2.0
 * @fecha: 2025-12-16
 * @propósito: Reemplazar almacenamiento en memoria por persistencia en BD para digest horario
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';

@Entity('pending_group_notifications')
@Index(['recipientId', 'processed'])
export class PendingGroupNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipient_id' })
  recipientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ name: 'group_id' })
  groupId: string;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Conversation;

  @Column({ name: 'message_id' })
  messageId: string;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: Message;

  @Column({ name: 'sender_id' })
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'group_title' })
  groupTitle: string;

  @Column({ name: 'sender_name' })
  senderName: string;

  @Column({ name: 'content_preview', type: 'text' })
  contentPreview: string;

  @Column({ name: 'message_created_at', type: 'timestamptz' })
  messageCreatedAt: Date;

  @Column({ default: false })
  processed: boolean;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
