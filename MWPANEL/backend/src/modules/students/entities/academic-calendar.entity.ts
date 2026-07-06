import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { AcademicYear } from './academic-year.entity';

export enum CalendarEventType {
  HOLIDAY = 'holiday',
  EXAM_DAY = 'exam_day',
  SPECIAL_EVENT = 'special_event',
  NO_CLASSES = 'no_classes',
  TEACHER_MEETING = 'teacher_meeting',
  PARENT_MEETING = 'parent_meeting'
}

@Entity('academic_calendar')
export class AcademicCalendar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AcademicYear, { nullable: false })
  academicYear: AcademicYear;

  @Column({ type: 'date' })
  date: Date;

  @Column({
    type: 'enum',
    enum: CalendarEventType,
  })
  type: CalendarEventType;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ default: true })
  affectsClasses: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}