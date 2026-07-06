import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { SubjectAssignment } from './subject-assignment.entity';
import { Classroom } from './classroom.entity';
import { TimeSlot } from './time-slot.entity';
import { AcademicYear } from './academic-year.entity';

export enum DayOfWeek {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
}

@Entity('schedule_sessions')
@Index(['subjectAssignment', 'dayOfWeek', 'timeSlot', 'academicYear'], { unique: true })
@Index(['classroom', 'dayOfWeek', 'timeSlot', 'academicYear'], { unique: true })
export class ScheduleSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SubjectAssignment, { nullable: false })
  subjectAssignment: SubjectAssignment;

  @ManyToOne(() => Classroom, { nullable: false })
  classroom: Classroom;

  @ManyToOne(() => TimeSlot, { nullable: false })
  timeSlot: TimeSlot;

  @Column({
    type: 'enum',
    enum: DayOfWeek,
  })
  dayOfWeek: DayOfWeek;

  @ManyToOne(() => AcademicYear, { nullable: false })
  academicYear: AcademicYear;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}