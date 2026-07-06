/**
 * @archivo: staff-task-comment.entity.ts
 * @modulo: Staff (Claustro)
 * @funcion: Comentarios en tareas del claustro
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

@Entity('staff_task_comments')
export class StaffTaskComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => StaffTask, task => task.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: StaffTask;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id' })
  authorId: string;

  @CreateDateColumn()
  createdAt: Date;
}
