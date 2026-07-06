/**
 * @archivo: staff-meeting-agenda.entity.ts
 * @modulo: Staff (Claustro)
 * @funcion: Puntos del dia para reuniones de claustro
 * @relacionado_con: staff-meeting.entity.ts
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StaffMeeting } from './staff-meeting.entity';

@Entity('staff_meeting_agenda')
export class StaffMeetingAgenda {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 0 })
  orderIndex: number;

  @Column({ type: 'integer', nullable: true })
  durationMinutes: number;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => StaffMeeting, meeting => meeting.agendaItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: StaffMeeting;

  @Column({ name: 'meeting_id' })
  meetingId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
