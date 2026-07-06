/**
 * @archivo: staff-task.entity.ts
 * @modulo: Staff (Claustro)
 * @funcion: Tareas administrativas del claustro con asignaciones multiples
 * @relacionado_con: staff-task-assignment.entity.ts, staff-task-comment.entity.ts, staff-meeting.entity.ts
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
import { StaffTag } from './staff-tag.entity';
import { StaffMeeting } from './staff-meeting.entity';
import { StaffTaskAssignment } from './staff-task-assignment.entity';
import { StaffTaskComment } from './staff-task-comment.entity';
import { StaffTaskAttachment } from './staff-task-attachment.entity';
import { StaffTaskHistory } from './staff-task-history.entity';

export enum StaffTaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum StaffTaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity('staff_tasks')
export class StaffTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: StaffTaskStatus,
    default: StaffTaskStatus.PENDING,
  })
  status: StaffTaskStatus;

  @Column({
    type: 'enum',
    enum: StaffTaskPriority,
    nullable: true,
  })
  priority: StaffTaskPriority;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @ManyToOne(() => StaffMeeting, meeting => meeting.tasks, { nullable: true })
  @JoinColumn({ name: 'meeting_id' })
  meeting: StaffMeeting;

  @Column({ name: 'meeting_id', nullable: true })
  meetingId: string;

  @OneToMany(() => StaffTaskAssignment, assignment => assignment.task, { cascade: true, eager: true })
  assignments: StaffTaskAssignment[];

  @ManyToMany(() => StaffTag, tag => tag.tasks, { eager: true })
  @JoinTable({
    name: 'staff_task_tags',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: StaffTag[];

  @OneToMany(() => StaffTaskComment, comment => comment.task, { cascade: true })
  comments: StaffTaskComment[];

  @OneToMany(() => StaffTaskAttachment, attachment => attachment.task, { cascade: true })
  attachments: StaffTaskAttachment[];

  @OneToMany(() => StaffTaskHistory, history => history.task, { cascade: true })
  history: StaffTaskHistory[];

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  // Usuario que completo la tarea (para sistema de archivo)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'completed_by_id' })
  completedBy: User;

  @Column({ name: 'completed_by_id', nullable: true })
  completedById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
