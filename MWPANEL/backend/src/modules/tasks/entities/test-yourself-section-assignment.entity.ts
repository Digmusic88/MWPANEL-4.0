/**
 * @archivo: test-yourself-section-assignment.entity.ts
 * @módulo: Tasks - Asignaciones Test Yourself a Secciones
 * @función: Entidad para asignar Test Yourself a secciones personalizadas
 * @crítico: SÍ - Gestiona asignación y orden dentro de secciones
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { TestYourselfSection } from './test-yourself-section.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';

@Entity('test_yourself_section_assignments')
export class TestYourselfSectionAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'section_id', type: 'uuid' })
  sectionId: string;

  @Column({ name: 'order_index', type: 'integer', default: 0 })
  orderIndex: number;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;

  @Column({ name: 'assigned_by', type: 'uuid' })
  assignedBy: string;

  // Relaciones
  @ManyToOne(() => Task)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => TestYourselfSection, section => section.assignments)
  @JoinColumn({ name: 'section_id' })
  section: TestYourselfSection;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'assigned_by' })
  assignedByTeacher: Teacher;
}