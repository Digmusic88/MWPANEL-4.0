import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Task } from '../../tasks/entities/task.entity';
import { CalendarEventGroup } from './calendar-event-group.entity';
import { CalendarEventSubject } from './calendar-event-subject.entity';
import { CalendarEventStudent } from './calendar-event-student.entity';
import { CalendarEventReminder } from './calendar-event-reminder.entity';
import { DateTransformer, ReadOnlyDateTransformer } from '../../../common/transformers/date.transformer';

export enum CalendarEventType {
  ACTIVITY = 'activity',
  EVALUATION = 'evaluation',
  TEST_YOURSELF = 'test_yourself',
  GENERAL_EVENT = 'general_event',
  HOLIDAY = 'holiday',
  MEETING = 'meeting',
  EXCURSION = 'excursion',
  FESTIVAL = 'festival',
  DEADLINE = 'deadline',
  REMINDER = 'reminder',
}

export enum CalendarEventVisibility {
  PUBLIC = 'public',
  TEACHERS_ONLY = 'teachers_only',
  STUDENTS_ONLY = 'students_only',
  FAMILIES_ONLY = 'families_only',
  ADMIN_ONLY = 'admin_only',
  CLASS_SPECIFIC = 'class_specific',
  SUBJECT_SPECIFIC = 'subject_specific',
  PRIVATE = 'private',
}

export enum CalendarEventRecurrence {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Entity('calendar_events')
@Index(['startDate'])
@Index(['endDate'])
@Index(['type'])
@Index(['visibility'])
@Index(['createdById'])
@Index(['isActive'])
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp', nullable: false, transformer: new DateTransformer() })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: false, transformer: new DateTransformer() })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: CalendarEventType,
    default: CalendarEventType.GENERAL_EVENT,
  })
  type: CalendarEventType;

  @Column({
    type: 'enum',
    enum: CalendarEventVisibility,
    default: CalendarEventVisibility.PUBLIC,
  })
  visibility: CalendarEventVisibility;

  @Column({ type: 'varchar', length: 7, default: '#1890ff' })
  color: string;

  @Column({ type: 'boolean', default: false })
  isAllDay: boolean;

  @Column({ type: 'varchar', nullable: true })
  location: string;

  @Column({ type: 'boolean', default: false })
  isRecurrent: boolean;

  @Column({
    type: 'enum',
    enum: CalendarEventRecurrence,
    default: CalendarEventRecurrence.NONE,
    nullable: true,
  })
  recurrenceType: CalendarEventRecurrence;

  @Column({ type: 'timestamp', nullable: true, transformer: new DateTransformer() })
  recurrenceEnd: Date;

  @Column({ type: 'text', array: true, default: [] })
  attachments: string[];

  @Column({ type: 'text', array: true, default: [] })
  links: string[];

  @Column({ type: 'varchar', array: true, default: [] })
  tags: string[];

  @Column({ type: 'integer', default: 1 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 60 })
  notifyBefore: number;

  @Column({ type: 'boolean', default: true })
  autoNotify: boolean;

  // Relaciones
  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ type: 'uuid', nullable: true })
  lastModifiedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'lastModifiedById' })
  lastModifiedBy: User;

  @Column({ type: 'uuid', nullable: true })
  relatedTaskId: string;

  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'relatedTaskId' })
  relatedTask: Task;

  @Column({ type: 'uuid', nullable: true })
  relatedEvaluationId: string;

  // Relaciones uno a muchos
  @OneToMany(() => CalendarEventGroup, (eventGroup) => eventGroup.event, {
    cascade: true,
  })
  eventGroups: CalendarEventGroup[];

  @OneToMany(() => CalendarEventSubject, (eventSubject) => eventSubject.event, {
    cascade: true,
  })
  eventSubjects: CalendarEventSubject[];

  @OneToMany(() => CalendarEventStudent, (eventStudent) => eventStudent.event, {
    cascade: true,
  })
  eventStudents: CalendarEventStudent[];

  @OneToMany(() => CalendarEventReminder, (reminder) => reminder.event, {
    cascade: true,
  })
  reminders: CalendarEventReminder[];

  @CreateDateColumn({ transformer: new ReadOnlyDateTransformer() })
  createdAt: Date;

  @UpdateDateColumn({ transformer: new ReadOnlyDateTransformer() })
  updatedAt: Date;
}