import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { TaskRubricAssessment } from './task-rubric-assessment.entity';
import { RubricCriterion } from '../../activities/entities/rubric-criterion.entity';
import { RubricLevel } from '../../activities/entities/rubric-level.entity';

@Entity('task_rubric_assessment_criteria')
@Unique(['taskRubricAssessmentId', 'criterionId'])
export class TaskRubricAssessmentCriterion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  score: number; // Puntuación obtenida en este criterio

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  weightedScore: number; // Puntuación ponderada (score * weight)

  @Column({ type: 'text', nullable: true })
  comments: string; // Comentarios específicos del criterio

  @Column({ default: true })
  isActive: boolean;

  // Relaciones
  @ManyToOne(() => TaskRubricAssessment, assessment => assessment.criterionAssessments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskRubricAssessmentId' })
  taskRubricAssessment: TaskRubricAssessment;

  @Column('uuid')
  taskRubricAssessmentId: string;

  @ManyToOne(() => RubricCriterion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'criterionId' })
  criterion: RubricCriterion;

  @Column('uuid')
  criterionId: string;

  @ManyToOne(() => RubricLevel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'levelId' })
  selectedLevel: RubricLevel;

  @Column('uuid')
  levelId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}