import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type UnreadCounterType = 'messages' | 'notifications';

/**
 * Contador materializado de no leídos por usuario y tipo.
 *
 * Redis es la fuente primaria (< 1ms).
 * Esta tabla es el fallback persistente para cuando Redis reinicia
 * o el contador Redis expira.
 *
 * Clave primaria compuesta (userId, type) para lookup O(1).
 */
@Entity('unread_counters')
export class UnreadCounter {
  @PrimaryColumn({ name: 'userId', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @PrimaryColumn({ type: 'varchar', length: 20 })
  type: UnreadCounterType;

  @Column({ type: 'integer', default: 0 })
  count: number;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamptz' })
  updatedAt: Date;
}
