import {
  Entity,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Conversation } from './conversation.entity';

@Entity('conversation_admins')
@Unique(['conversationId', 'userId'])
export class ConversationAdmin {
  @PrimaryColumn({ type: 'uuid' })
  conversationId: string;

  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;
}
