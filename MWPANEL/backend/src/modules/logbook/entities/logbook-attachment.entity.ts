import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LogbookEntry } from './logbook-entry.entity';

@Entity('logbook_attachments')
export class LogbookAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entry_id' })
  entryId: string;

  @Column({ name: 'owner_user_id' })
  ownerUserId: string;

  @Column({ name: 'file_name', type: 'text' })
  fileName: string;

  @Column({ name: 'mime_type', type: 'text' })
  mimeType: string;

  @Column({ name: 'byte_size', type: 'bigint' })
  byteSize: number;

  @Column({ name: 'storage_key', type: 'text' })
  storageKey: string; // ruta en el bucket

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => LogbookEntry, entry => entry.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entry_id' })
  entry: LogbookEntry;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_user_id' })
  ownerUser: User;
}