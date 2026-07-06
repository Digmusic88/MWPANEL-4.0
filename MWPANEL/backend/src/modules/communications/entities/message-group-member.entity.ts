import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MessageGroup } from './message-group.entity';

export enum MessageGroupRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity('message_group_members')
@Index(['groupId'])
@Index(['userId'])
@Unique(['groupId', 'userId'])
export class MessageGroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relación con el grupo
  @ManyToOne(() => MessageGroup, group => group.members, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'groupId' })
  group: MessageGroup;

  @Column({ name: 'groupId' })
  groupId: string;

  // Relación con el usuario miembro
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ name: 'userId' })
  userId: string;

  // Rol del miembro en el grupo
  @Column({
    type: 'enum',
    enum: MessageGroupRole,
    default: MessageGroupRole.MEMBER,
  })
  role: MessageGroupRole;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  addedAt: Date;
}