import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MessageGroupMember } from './message-group-member.entity';

export enum GroupType {
  ADMIN_BROADCAST = 'admin_broadcast',
  TEACHER_CLASS = 'teacher_class',
  TEACHER_SUBJECT = 'teacher_subject',
  CUSTOM = 'custom',
}

@Entity('message_groups')
@Index(['createdById'])
@Index(['type'])
@Index(['isActive'])
export class MessageGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: GroupType,
    default: GroupType.CUSTOM,
  })
  type: GroupType;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ type: 'text', nullable: true })
  config: string; // JSON config for automatic member inclusion

  // Relación con el usuario que creó el grupo
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ name: 'createdById' })
  createdById: string;

  // Relación con los miembros del grupo
  @OneToMany(() => MessageGroupMember, member => member.group, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  members: MessageGroupMember[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual property para contar miembros
  memberCount?: number;
}