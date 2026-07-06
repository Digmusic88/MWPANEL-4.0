import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { SharedNote } from './shared-note.entity';
import { User } from '../../users/entities/user.entity';

@Entity('shared_note_comments')
export class SharedNoteComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sharedNoteId: string;

  @Column()
  userId: string;

  @Column('text')
  content: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => SharedNote, (sharedNote) => sharedNote.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sharedNoteId' })
  sharedNote: SharedNote;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}