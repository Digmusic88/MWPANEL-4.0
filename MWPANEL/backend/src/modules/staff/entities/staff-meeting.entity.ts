/**
 * @archivo: staff-meeting.entity.ts
 * @modulo: Staff (Claustro)
 * @funcion: Reuniones del claustro con agenda propia
 * @relacionado_con: staff-meeting-agenda.entity.ts, staff-task.entity.ts
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { StaffMeetingAgenda } from './staff-meeting-agenda.entity';
import { StaffTask } from './staff-task.entity';

export enum StaffMeetingStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('staff_meetings')
export class StaffMeeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp' })
  scheduledDate: Date;

  @Column({ nullable: true })
  location: string;

  @Column({
    type: 'enum',
    enum: StaffMeetingStatus,
    default: StaffMeetingStatus.SCHEDULED,
  })
  status: StaffMeetingStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @OneToMany(() => StaffMeetingAgenda, agenda => agenda.meeting, { cascade: true })
  agendaItems: StaffMeetingAgenda[];

  @OneToMany(() => StaffTask, task => task.meeting)
  tasks: StaffTask[];

  @ManyToMany(() => User)
  @JoinTable({
    name: 'staff_meeting_attendees',
    joinColumn: { name: 'meeting_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  attendees: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
