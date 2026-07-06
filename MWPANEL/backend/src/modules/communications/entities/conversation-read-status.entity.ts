/**
 * @archivo: conversation-read-status.entity.ts
 * @módulo: Communications - Tracking de Lectura por Usuario
 * @función: Entidad para trackear última lectura de cada usuario en cada grupo
 * @creado_por: Sistema de Grupos MW Panel 2.0
 * @fecha: 2025-12-16
 * @propósito: Permitir que cada usuario tenga su propio estado de lectura en grupos
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Conversation } from './conversation.entity';

@Entity('conversation_read_status')
@Unique(['userId', 'conversationId'])
@Index(['userId', 'conversationId'])
export class ConversationReadStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'last_read_at', type: 'timestamptz' })
  lastReadAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
