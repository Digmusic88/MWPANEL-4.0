import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Unique, Index } from 'typeorm';

export enum AchievementLevel {
  EMERGING = 'EMERGING',
  DEVELOPING = 'DEVELOPING',
  ACHIEVING = 'ACHIEVING',
  EXCEEDING = 'EXCEEDING',
}

export enum CriterionScaleType {
  LEVELS = 'levels',
  LEVELS3 = 'levels3',
  NUMERIC = 'numeric',
}

// Escala de 3 estados (LOMLOE) — SP-B
export const THREE_STATE_LEVELS = ['NOT_ACHIEVED', 'IN_PROGRESS', 'ACHIEVED'] as const;
export const LEVELS3_DEFAULT_MAPPING: Record<string, number> = { NOT_ACHIEVED: 0, IN_PROGRESS: 50, ACHIEVED: 100 };

@Entity('criterion_assessments')
@Unique('UQ_criterion_assessment_student_criterion_period', ['studentId', 'evaluationCriterionId', 'evaluationPeriodId'])
@Index('IDX_criterion_assessment_assignment_period', ['subjectAssignmentId', 'evaluationPeriodId'])
export class CriterionAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column('uuid')
  evaluationCriterionId: string;

  @Column('uuid')
  subjectAssignmentId: string;

  @Column('uuid')
  evaluationPeriodId: string;

  @Column('uuid')
  teacherId: string;

  @Column({ type: 'varchar', length: 16 })
  scaleType: CriterionScaleType;

  @Column({ type: 'varchar', length: 16, nullable: true })
  levelValue: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  numericValue: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  normalizedScore: number;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  @Column({ type: 'timestamptz' })
  assessedAt: Date;

  @Column({ type: 'varchar', length: 20, default: 'manual' })
  source: 'manual' | 'derived' | 'derived_saber';

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
