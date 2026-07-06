import {
  Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, Unique, Index,
} from 'typeorm';
import { EvaluationCriterion } from '../../competencies/entities/evaluation-criterion.entity';
import { BasicKnowledge } from '../../competencies/entities/basic-knowledge.entity';

export enum CriterionKnowledgeStatus {
  SUGGESTED = 'suggested',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
}

export enum CriterionKnowledgeSource {
  AI = 'ai',
  MANUAL = 'manual',
}

@Entity('criterion_basic_knowledge')
@Unique('UQ_criterion_knowledge_pair', ['evaluationCriterionId', 'basicKnowledgeId'])
@Index('IDX_criterion_knowledge_criterion', ['evaluationCriterionId'])
@Index('IDX_criterion_knowledge_status', ['status'])
export class CriterionBasicKnowledge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  evaluationCriterionId: string;

  @ManyToOne(() => EvaluationCriterion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluationCriterionId' })
  evaluationCriterion: EvaluationCriterion;

  @Column('uuid')
  basicKnowledgeId: string;

  @ManyToOne(() => BasicKnowledge, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'basicKnowledgeId' })
  basicKnowledge: BasicKnowledge;

  @Column({ type: 'enum', enum: CriterionKnowledgeStatus, default: CriterionKnowledgeStatus.SUGGESTED })
  status: CriterionKnowledgeStatus;

  @Column({ type: 'enum', enum: CriterionKnowledgeSource, default: CriterionKnowledgeSource.AI })
  source: CriterionKnowledgeSource;

  @Column({ type: 'decimal', precision: 4, scale: 3, nullable: true })
  confidence: number | null;

  @Column('uuid', { nullable: true })
  createdBy: string | null;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
