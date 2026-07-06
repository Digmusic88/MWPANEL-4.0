/**
 * @archivo: family-alert.entity.ts
 * @módulo: Families (Alertas Familiares)
 * @función: Sistema de avisos importantes para familias
 * @crítico: SÍ - Alertas automáticas de situaciones académicas relevantes
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Family } from '../../users/entities/family.entity';
import { Student } from '../../students/entities/student.entity';

export enum AlertType {
  PENDING_TASKS = 'pending_tasks',
  LOW_SUBJECT_GRADE = 'low_subject_grade',
  LOW_TASK_GRADE = 'low_task_grade',
  UNJUSTIFIED_ABSENCE = 'unjustified_absence',
  UPCOMING_EXAM = 'upcoming_exam',
  STUDENT_ABSENT = 'student_absent',
  STUDENT_LATE = 'student_late',
  PATTERN_ABSENCES = 'pattern_absences',
  PATTERN_TARDINESS = 'pattern_tardiness',
  HOMEWORK_NOT_DONE = 'homework_not_done',
  HOMEWORK_PARTIAL = 'homework_partial',
}

export enum AlertPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

@Entity('family_alerts')
@Index(['family', 'isViewed', 'isActive'])
@Index(['student', 'alertType', 'isActive'])
export class FamilyAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Family, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_id' })
  family: Family;

  @Column({ name: 'family_id' })
  familyId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({
    type: 'enum',
    enum: AlertType,
    name: 'alert_type'
  })
  alertType: AlertType;

  @Column({
    type: 'enum',
    enum: AlertPriority,
    default: AlertPriority.MEDIUM
  })
  priority: AlertPriority;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    subjectId?: string;
    subjectName?: string;
    taskId?: string;
    taskName?: string;
    grade?: number;
    dueDate?: Date;
    attendanceDate?: Date;
    threshold?: number;
  };

  @Column({ name: 'is_viewed', default: false })
  isViewed: boolean;

  @Column({ name: 'viewed_at', type: 'timestamp', nullable: true })
  viewedAt: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}