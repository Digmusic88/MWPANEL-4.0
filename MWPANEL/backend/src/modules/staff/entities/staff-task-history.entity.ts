/**
 * @archivo: staff-task-history.entity.ts
 * @modulo: Staff (Claustro)
 * @funcion: Historial de cambios en tareas del claustro
 * @relacionado_con: staff-task.entity.ts, user.entity.ts
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { StaffTask } from './staff-task.entity';

export enum StaffTaskHistoryAction {
  CREATED = 'created',
  STATUS_CHANGED = 'status_changed',
  ASSIGNED = 'assigned',
  UNASSIGNED = 'unassigned',
  ACCEPTED = 'accepted',
  PRIORITY_CHANGED = 'priority_changed',
  DUE_DATE_CHANGED = 'due_date_changed',
  COMMENT_ADDED = 'comment_added',
  ATTACHMENT_ADDED = 'attachment_added',
  ATTACHMENT_REMOVED = 'attachment_removed',
  TITLE_CHANGED = 'title_changed',
  DESCRIPTION_CHANGED = 'description_changed',
  TAGS_CHANGED = 'tags_changed',
  MEETING_LINKED = 'meeting_linked',
  MEETING_UNLINKED = 'meeting_unlinked',
}

@Entity('staff_task_history')
export class StaffTaskHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: StaffTaskHistoryAction,
  })
  action: StaffTaskHistoryAction;

  @Column({ type: 'json', nullable: true })
  oldValue: any;

  @Column({ type: 'json', nullable: true })
  newValue: any;

  @ManyToOne(() => StaffTask, task => task.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: StaffTask;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'changed_by_id' })
  changedBy: User;

  @Column({ name: 'changed_by_id' })
  changedById: string;

  @CreateDateColumn()
  createdAt: Date;
}
