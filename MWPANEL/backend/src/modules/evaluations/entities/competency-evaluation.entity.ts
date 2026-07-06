import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Evaluation } from './evaluation.entity';
import { Competency } from '../../competencies/entities/competency.entity';

@Entity('competency_evaluations')
export class CompetencyEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Evaluation, (evaluation) => evaluation.competencyEvaluations)
  evaluation: Evaluation;

  @ManyToOne(() => Competency)
  competency: Competency;

  @Column({ type: 'decimal', precision: 3, scale: 1 })
  score: number; // 1-5 scale for radar chart (supports half stars: 1.0, 1.5, 2.0, etc.)

  @Column({ type: 'text', nullable: true })
  observations: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // Permite desactivar competencias específicas en evaluaciones

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}