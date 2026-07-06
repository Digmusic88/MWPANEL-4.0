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
import { Student } from '../../students/entities/student.entity';

@Entity('calendar_event_students')
@Unique(['eventId', 'studentId'])
export class CalendarEventStudent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => CalendarEvent, (event) => event.eventStudents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'eventId' })
  event: CalendarEvent;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { eager: true })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ type: 'boolean', default: true })
  isVisible: boolean;

  @CreateDateColumn()
  createdAt: Date;
}