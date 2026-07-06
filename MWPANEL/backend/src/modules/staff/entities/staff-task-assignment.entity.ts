/**
 * @archivo: staff-task-assignment.entity.ts
 * @modulo: Staff (Claustro)
 * @funcion: Asignaciones de tareas a usuarios (relacion M:N con estado)
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

@Entity('staff_task_assignments')
export class StaffTaskAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => StaffTask, task => task.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: StaffTask;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User;

  @Column({ name: 'assigned_to_id' })
  assignedToId: string;

  @Column({ default: false })
  accepted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
