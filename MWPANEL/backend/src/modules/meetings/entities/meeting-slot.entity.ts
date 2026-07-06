import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { MeetingPeriod } from './meeting-period.entity';
import { MeetingBooking } from './meeting-booking.entity';

@Entity('meeting_slots')
export class MeetingSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  periodId: string;

  @ManyToOne(() => MeetingPeriod, (period) => period.slots)
  @JoinColumn({ name: 'periodId' })
  period: MeetingPeriod;

  @Column({ type: 'uuid' })
  teacherId: string;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @Column({ type: 'timestamp' })
  startDatetime: Date;

  @Column({ type: 'int', default: 30 })
  durationMinutes: number;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => MeetingBooking, (booking) => booking.slot)
  bookings: MeetingBooking[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Métodos de utilidad
  getEndDatetime(): Date {
    const endTime = new Date(this.startDatetime);
    endTime.setMinutes(endTime.getMinutes() + this.durationMinutes);
    return endTime;
  }

  isBookable(): boolean {
    const now = new Date();
    return this.isAvailable && this.startDatetime > now && !this.hasActiveBooking();
  }

  hasActiveBooking(): boolean {
    return this.bookings?.some(booking =>
      booking.status === 'confirmed' || booking.status === 'pending'
    ) || false;
  }

  getFormattedTimeSlot(): string {
    const start = new Date(this.startDatetime);
    const end = this.getEndDatetime();
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    };
    
    return `${formatTime(start)} - ${formatTime(end)}`;
  }
}