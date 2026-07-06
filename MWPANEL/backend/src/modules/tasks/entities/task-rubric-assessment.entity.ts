import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { TaskSubmission } from './task-submission.entity';
import { Rubric } from '../../activities/entities/rubric.entity';
import { Student } from '../../students/entities/student.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { TaskRubricAssessmentCriterion } from './task-rubric-assessment-criterion.entity';

@Entity('task_rubric_assessments')
@Unique(['taskSubmissionId', 'rubricId', 'studentId'])
export class TaskRubricAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  totalScore: number; // Puntuación total calculada

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  maxPossibleScore: number; // Puntuación máxima posible

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  percentage: number; // Porcentaje obtenido

  @Column({ type: 'text', nullable: true })
  feedback: string; // Comentarios generales del profesor

  @Column({ default: true })
  isComplete: boolean; // Si se han evaluado todos los criterios

  @Column({ default: true })
  isActive: boolean;

  // Relaciones
  @ManyToOne(() => TaskSubmission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskSubmissionId' })
  taskSubmission: TaskSubmission;

  @Column('uuid')
  taskSubmissionId: string;

  @ManyToOne(() => Rubric, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rubricId' })
  rubric: Rubric;

  @Column('uuid')
  rubricId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column('uuid')
  studentId: string;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @Column('uuid')
  teacherId: string;

  @OneToMany(() => TaskRubricAssessmentCriterion, criterion => criterion.taskRubricAssessment, { cascade: true })
  criterionAssessments: TaskRubricAssessmentCriterion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}