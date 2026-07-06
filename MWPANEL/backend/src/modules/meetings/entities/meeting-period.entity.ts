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
import { User } from '../../users/entities/user.entity';
import { MeetingSlot } from './meeting-slot.entity';
import { MeetingBooking } from './meeting-booking.entity';

@Entity('meeting_periods')
export class MeetingPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'date' })
  bookingDeadline: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @OneToMany(() => MeetingSlot, (slot) => slot.period)
  slots: MeetingSlot[];

  @OneToMany(() => MeetingBooking, (booking) => booking.period)
  bookings: MeetingBooking[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Métodos de utilidad
  isBookingOpen(): boolean {
    const now = new Date();
    const deadline = new Date(this.bookingDeadline);
    return this.isActive && now <= deadline;
  }

  isInPeriod(date: Date): boolean {
    const checkDate = new Date(date);
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    return checkDate >= start && checkDate <= end;
  }
}