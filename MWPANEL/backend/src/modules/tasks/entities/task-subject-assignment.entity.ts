/**
 * @archivo: task-subject-assignment.entity.ts
 * @módulo: Tasks (Sistema de Tareas Estudiantiles)
 * @función: Relación many-to-many entre Task y SubjectAssignment
 * @crítico: SÍ - Permite que un Test Yourself esté asociado a múltiples asignaturas
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Task } from './task.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';

@Entity('task_subject_assignments')
@Unique(['taskId', 'subjectAssignmentId'])
export class TaskSubjectAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column({ type: 'uuid' })
  subjectAssignmentId: string;

  @ManyToOne(() => SubjectAssignment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subjectAssignmentId' })
  subjectAssignment: SubjectAssignment;

  @CreateDateColumn()
  createdAt: Date;
}
