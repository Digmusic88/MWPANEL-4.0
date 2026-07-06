import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Column,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Message } from './message.entity';
import { MessageGroup } from './message-group.entity';

@Entity('message_read_status')
@Unique(['userId', 'messageId'])
@Index(['userId', 'messageId'])
@Index(['messageId'])
export class MessageReadStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'message_id' })
  messageId: string;

  @ManyToOne(() => Message, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'message_id' })
  message: Message;

  // nullable: mensajes directos no tienen grupo
  @Column({ name: 'group_id', nullable: true })
  groupId: string | null;

  @ManyToOne(() => MessageGroup, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: MessageGroup | null;

  /** Momento exacto en que el mensaje fue leído por este usuario. */
  @CreateDateColumn({ name: 'read_at', type: 'timestamptz' })
  readAt: Date;

  /** Número de veces que el usuario ha visto este mensaje. */
  @Column({ name: 'view_count', type: 'int', default: 1 })
  viewCount: number;

  /** Momento en que el mensaje fue entregado al dispositivo del usuario. */
  @Column({ name: 'deliveredAt', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;
}
