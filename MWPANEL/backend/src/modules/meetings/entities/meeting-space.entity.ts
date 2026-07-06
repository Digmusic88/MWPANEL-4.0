import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { MeetingBooking } from './meeting-booking.entity';

@Entity('meeting_spaces')
export class MeetingSpace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  type: string; // 'office', 'library', 'meeting_room', 'classroom', 'other'

  @Column({ type: 'varchar', length: 200, nullable: true })
  location: string;

  @Column({ type: 'int', nullable: true })
  capacity: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string; // Para visualización en calendario

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => MeetingBooking, (booking) => booking.space)
  bookings: MeetingBooking[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
