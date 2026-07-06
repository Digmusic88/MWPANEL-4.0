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
import { RubricAssessment } from './rubric-assessment.entity';
import { RubricCriterion } from './rubric-criterion.entity';
import { RubricLevel } from './rubric-level.entity';
import { RubricCell } from './rubric-cell.entity';

@Entity('rubric_assessment_criteria')
@Unique(['rubricAssessmentId', 'criterionId'])
export class RubricAssessmentCriterion {
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
  @ManyToOne(() => RubricAssessment, assessment => assessment.criterionAssessments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rubricAssessmentId' })
  rubricAssessment: RubricAssessment;

  @Column('uuid')
  rubricAssessmentId: string;

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

  @ManyToOne(() => RubricCell, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cellId' })
  selectedCell: RubricCell;

  @Column('uuid')
  cellId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}