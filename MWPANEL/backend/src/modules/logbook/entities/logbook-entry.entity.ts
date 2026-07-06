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
import { LogbookAttachment } from './logbook-attachment.entity';
import { LogbookSeries } from './logbook-series.entity';

export type Visibility = 'private' | 'staff' | 'admin';

@Entity('logbook_entries')
@Index(['ownerUserId', 'dateLocal'])
@Index(['ownerUserId', 'tagId', 'dateLocal'])
export class LogbookEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_user_id' })
  ownerUserId: string;

  @Column({ name: 'tag_id', nullable: true })
  tagId: string | null;

  @Column({ type: 'text' })
  title: string;

  @Column({ name: 'content_rich', type: 'jsonb' })
  contentRich: any; // TipTap doc JSON

  @Column({ name: 'content_plain', type: 'text', nullable: true })
  contentPlain: string | null;

  @Column({ name: 'date_local', type: 'date' })
  dateLocal: string; // 'YYYY-MM-DD'

  @Column({ name: 'started_at_local', type: 'time', nullable: true })
  startedAtLocal: string | null; // 'HH:mm'

  @Column({ name: 'ended_at_local', type: 'time', nullable: true })
  endedAtLocal: string | null; // 'HH:mm'

  @Column({ name: 'duration_min', type: 'int', nullable: true })
  durationMin: number | null;

  @Column({ type: 'boolean', default: false })
  pinned: boolean;

  @Column({ type: 'text', default: 'private' })
  visibility: Visibility;

  @Column({ name: 'attachments_cnt', type: 'int', default: 0 })
  attachmentsCnt: number;

  @Column({ name: 'series_id', nullable: true })
  seriesId: string | null;

  @Column({ name: 'is_placeholder', type: 'boolean', default: false })
  isPlaceholder: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_user_id' })
  ownerUser: User;

  @ManyToOne(() => LogbookTag, tag => tag.entries, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tag_id' })
  tag: LogbookTag | null;

  @OneToMany(() => LogbookAttachment, attachment => attachment.entry)
  attachments: LogbookAttachment[];

  @ManyToOne(() => LogbookSeries, series => series.entries, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'series_id' })
  series: LogbookSeries | null;
}