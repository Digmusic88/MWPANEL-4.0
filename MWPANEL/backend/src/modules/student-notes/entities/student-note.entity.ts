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
import { Subject } from '../../students/entities/subject.entity';
import { EducationalResource } from '../../educational-resources/entities/educational-resource.entity';
import { SharedNote } from './shared-note.entity';

@Entity('student_notes')
@Index('IDX_student_notes_author_subject', ['authorId', 'subjectId'])
@Index('IDX_student_notes_created_at', ['createdAt'])
export class StudentNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: ['text', 'voice', 'drawing', 'presentation', 'mixed', 'mindmap'],
    default: 'text',
  })
  type: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  @Index('IDX_student_notes_relatedResourceId')
  relatedResourceId: string;

  @ManyToOne(() => EducationalResource, { nullable: true })
  @JoinColumn({ name: 'relatedResourceId' })
  relatedResource: EducationalResource;

  @Column()
  @Index('IDX_student_notes_authorId')
  authorId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ nullable: true })
  @Index('IDX_student_notes_subjectId')
  subjectId: string;

  @ManyToOne(() => Subject, { eager: true, nullable: true })
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @Column({ type: 'text', nullable: true })
  tags: string;

  @Column({ nullable: true })
  driveFileId: string;

  @Column({ nullable: true, length: 500 })
  webViewLink: string;

  @Column({ nullable: true, length: 500 })
  webContentLink: string;

  @Column({ default: true })
  isPrivate: boolean;

  @Column({ default: false })
  isFavorite: boolean;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones con apuntes compartidos
  @OneToMany(() => SharedNote, (sharedNote) => sharedNote.note)
  sharedNotes: SharedNote[];

  // Virtual properties
  get tagsArray(): string[] {
    return this.tags ? this.tags.split(',').map((tag) => tag.trim()) : [];
  }

  set tagsArray(tags: string[]) {
    this.tags = tags.join(', ');
  }

  get hasAttachment(): boolean {
    return !!this.driveFileId;
  }

  get isAudio(): boolean {
    return this.type === 'voice';
  }

  get isDrawing(): boolean {
    return this.type === 'drawing';
  }

  get isMindMap(): boolean {
    return this.type === 'mindmap';
  }

  get duration(): number | null {
    return this.metadata?.duration || null;
  }

  get fileName(): string | null {
    return this.metadata?.originalFileName || null;
  }

  get isShared(): boolean {
    return this.sharedNotes && this.sharedNotes.length > 0;
  }

  get shareCount(): number {
    return this.sharedNotes ? this.sharedNotes.filter(sn => sn.status === 'active').length : 0;
  }
}