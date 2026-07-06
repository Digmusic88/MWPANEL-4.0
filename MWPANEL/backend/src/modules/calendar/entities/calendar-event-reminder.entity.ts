import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { CalendarEvent } from './calendar-event.entity';
import { User } from '../../users/entities/user.entity';

@Entity('calendar_event_reminders')
@Index(['reminderTime'])
@Index(['isSent'])
export class CalendarEventReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => CalendarEvent, (event) => event.reminders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'eventId' })
  event: CalendarEvent;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'timestamp' })
  reminderTime: Date;

  @Column({ type: 'boolean', default: false })
  isSent: boolean;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'varchar', default: 'notification' })
  type: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;
}