/**
 * @archivo: test-yourself-section.entity.ts
 * @módulo: Tasks - Secciones Personalizadas Test Yourself
 * @función: Entidad para organizar Test Yourself en secciones personalizadas
 * @crítico: SÍ - Permite organización libre por profesores
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
import { Teacher } from '../../teachers/entities/teacher.entity';
import { TestYourselfSectionAssignment } from './test-yourself-section-assignment.entity';

@Entity('test_yourself_sections')
export class TestYourselfSection {
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @OneToMany(() => TestYourselfSectionAssignment, assignment => assignment.section)
  assignments: TestYourselfSectionAssignment[];

  // Campos calculados
  get taskCount(): number {
    return this.assignments?.length || 0;
  }
}