import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Unique,
} from 'typeorm';
import { CalendarEvent } from './calendar-event.entity';
import { Subject } from '../../students/entities/subject.entity';

@Entity('calendar_event_subjects')
@Unique(['eventId', 'subjectId'])
export class CalendarEventSubject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => CalendarEvent, (event) => event.eventSubjects, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'eventId' })
  event: CalendarEvent;

  @Column({ type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => Subject, { eager: true })
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @CreateDateColumn()
  createdAt: Date;
}