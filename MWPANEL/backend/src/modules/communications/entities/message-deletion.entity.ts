import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Message } from './message.entity';

@Entity('message_deletions')
@Unique(['messageId', 'userId']) // Un usuario solo puede eliminar un mensaje una vez
export class MessageDeletion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Message, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: Message;

  @Column()
  messageId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  deletedAt: Date;
}