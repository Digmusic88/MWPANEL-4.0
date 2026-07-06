import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinTable,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Message } from './message.entity';
import { DateTransformer, ReadOnlyDateTransformer } from '../../../common/transformers/date.transformer';

export enum ConversationType {
  DIRECT = 'direct',     // Conversación entre dos usuarios
  GROUP = 'group',       // Conversación grupal
}

@Entity('conversations')
@Index('IDX_conversations_type', ['type'])
@Index('IDX_conversations_isArchived', ['isArchived'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  title: string; // Título de la conversación (nombre del grupo)

  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.DIRECT,
  })
  type: ConversationType;

  // Descripción del grupo (opcional)
  @Column({ type: 'text', nullable: true })
  description: string;

  // Avatar del grupo (URL)
  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string;

  // Usuario que creó el grupo
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ type: 'uuid', nullable: true })
  @Index('IDX_conversations_createdById')
  createdById: string;

  // Indica si el grupo está archivado
  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  // Participantes de la conversación
  @ManyToMany(() => User)
  @JoinTable({
    name: 'conversation_participants',
    joinColumn: { name: 'conversationId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  participants: User[];

  // Mensajes de la conversación
  @OneToMany(() => Message, (message) => message.parentMessage)
  messages: Message[];

  @Column({ nullable: true, transformer: new DateTransformer() })
  lastMessageAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ transformer: new ReadOnlyDateTransformer() })
  createdAt: Date;

  @UpdateDateColumn({ transformer: new ReadOnlyDateTransformer() })
  updatedAt: Date;
}