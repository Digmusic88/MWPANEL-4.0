import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LogbookTag } from './logbook-tag.entity';
import { LogbookEntry, Visibility } from './logbook-entry.entity';

@Entity('logbook_series')
@Index(['ownerUserId'])
@Index(['ownerUserId', 'startDate', 'endDate'])
export class LogbookSeries {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_user_id' })
  ownerUserId: string;

  @Column({ name: 'rule_rrule', type: 'text' })
  ruleRrule: string; // RRULE format: "FREQ=WEEKLY;BYDAY=MO"

  @Column({ name: 'start_date', type: 'date' })
  startDate: string; // 'YYYY-MM-DD' - primera ocurrencia

  @Column({ name: 'end_date', type: 'date' })
  endDate: string; // 'YYYY-MM-DD' - fecha fin de curso (incluida)

  @Column({ name: 'started_at_local', type: 'time', nullable: true })
  startedAtLocal: string | null; // 'HH:mm'

  @Column({ name: 'ended_at_local', type: 'time', nullable: true })
  endedAtLocal: string | null; // 'HH:mm'

  @Column({ name: 'tag_id', nullable: true })
  tagId: string | null;

  @Column({ type: 'text', default: 'private' })
  visibility: Visibility;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_user_id' })
  ownerUser: User;

  @ManyToOne(() => LogbookTag, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tag_id' })
  tag: LogbookTag | null;

  @OneToMany(() => LogbookEntry, entry => entry.series)
  entries: LogbookEntry[];
}