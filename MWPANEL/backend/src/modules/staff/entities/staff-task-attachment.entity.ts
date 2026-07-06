/**
 * @archivo: staff-task-attachment.entity.ts
 * @modulo: Staff (Claustro)
 * @funcion: Archivos adjuntos en tareas del claustro
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

@Entity('staff_task_attachments')
export class StaffTaskAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileName: string;

  @Column()
  filePath: string;

  @Column({ nullable: true })
  fileType: string;

  @Column({ type: 'integer', nullable: true })
  fileSize: number;

  @ManyToOne(() => StaffTask, task => task.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: StaffTask;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User;

  @Column({ name: 'uploaded_by_id' })
  uploadedById: string;

  @CreateDateColumn()
  createdAt: Date;
}
