import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  Index
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LogbookEntry } from './logbook-entry.entity';

@Entity('logbook_tags')
@Unique(['ownerUserId', 'name'])
@Index(['ownerUserId'])
export class LogbookTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_user_id' })
  ownerUserId: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ name: 'color_hex', type: 'char', length: 7 })
  colorHex: string; // '#RRGGBB'

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_user_id' })
  ownerUser: User;

  @OneToMany(() => LogbookEntry, entry => entry.tag)
  entries: LogbookEntry[];
}