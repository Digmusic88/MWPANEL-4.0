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
import { ClassGroup } from '../../students/entities/class-group.entity';

@Entity('calendar_event_groups')
@Unique(['eventId', 'classGroupId'])
export class CalendarEventGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => CalendarEvent, (event) => event.eventGroups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'eventId' })
  event: CalendarEvent;

  @Column({ type: 'uuid' })
  classGroupId: string;

  @ManyToOne(() => ClassGroup, { eager: true })
  @JoinColumn({ name: 'classGroupId' })
  classGroup: ClassGroup;

  @CreateDateColumn()
  createdAt: Date;
}