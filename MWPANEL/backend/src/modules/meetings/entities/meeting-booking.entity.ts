import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MeetingSlot } from './meeting-slot.entity';
import { Family } from '../../users/entities/family.entity';
import { Student } from '../../students/entities/student.entity';
import { MeetingPeriod } from './meeting-period.entity';
import { CalendarEvent } from '../../calendar/entities/calendar-event.entity';
import { MeetingSpace } from './meeting-space.entity';

export enum MeetingBookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

@Entity('meeting_bookings')
export class MeetingBooking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  slotId: string;

  @ManyToOne(() => MeetingSlot, (slot) => slot.bookings)
  @JoinColumn({ name: 'slotId' })
  slot: MeetingSlot;

  @Column({ type: 'uuid' })
  familyId: string;

  @ManyToOne(() => Family)
  @JoinColumn({ name: 'familyId' })
  family: Family;

  @Column({ type: 'uuid', nullable: true })
  studentId: string;

  @ManyToOne(() => Student, { nullable: true })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ type: 'uuid', nullable: true })
  periodId: string;

  @ManyToOne(() => MeetingPeriod, (period) => period.bookings)
  @JoinColumn({ name: 'periodId' })
  period: MeetingPeriod;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  bookingDate: Date;

  @Column({
    type: 'enum',
    enum: MeetingBookingStatus,
    default: MeetingBookingStatus.CONFIRMED,
  })
  status: MeetingBookingStatus;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'text', nullable: true })
  cancelReason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', nullable: true })
  calendarEventId: string;

  @ManyToOne(() => CalendarEvent, { nullable: true })
  @JoinColumn({ name: 'calendarEventId' })
  calendarEvent: CalendarEvent;

  @Column({ type: 'uuid', nullable: true })
  spaceId: string;

  @ManyToOne(() => MeetingSpace, (space) => space.bookings, { nullable: true })
  @JoinColumn({ name: 'spaceId' })
  space: MeetingSpace;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Métodos de utilidad
  isActive(): boolean {
    return this.status === MeetingBookingStatus.CONFIRMED;
  }

  isCancellable(): boolean {
    if (this.status !== MeetingBookingStatus.CONFIRMED) {
      return false;
    }

    // Permitir cancelación hasta 24 horas antes de la reunión
    const twentyFourHoursBeforeMeeting = new Date(this.slot.startDatetime);
    twentyFourHoursBeforeMeeting.setHours(twentyFourHoursBeforeMeeting.getHours() - 24);
    
    return new Date() < twentyFourHoursBeforeMeeting;
  }

  cancel(reason?: string): void {
    this.status = MeetingBookingStatus.CANCELLED;
    this.cancelledAt = new Date();
    this.cancelReason = reason;
  }

  getFormattedBookingInfo(): string {
    const date = new Date(this.slot.startDatetime).toLocaleDateString('es-ES');
    const timeSlot = this.slot.getFormattedTimeSlot();
    return `${date} - ${timeSlot}`;
  }
}