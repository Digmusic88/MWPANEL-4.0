/**
 * @archivo: custom-tab.entity.ts
 * @módulo: Tasks - Custom Tabs
 * @función: Entidad para pestañas personalizadas de Test Yourself
 * @crítico: SÍ - Permite organización de pestañas virtuales por profesores
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Teacher } from '../../../teachers/entities/teacher.entity';
import { Task } from '../../entities/task.entity';

@Entity('custom_tabs')
export class CustomTab {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 7, default: '#1890ff' })
  color: string;

  @Column({ type: 'varchar', length: 50, default: 'FolderOutlined' })
  icon: string;

  @Column({ name: 'order_index', type: 'integer', default: 0 })
  orderIndex: number;

  @Column({ name: 'teacher_id', type: 'uuid' })
  teacherId: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @OneToMany(() => Task, task => task.customTab)
  tasks: Task[];

  // Campos calculados
  get taskCount(): number {
    return this.tasks?.length || 0;
  }
}