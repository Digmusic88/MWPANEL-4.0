import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum GenerationStatus { DRAFT = 'draft', APPLIED = 'applied', DISCARDED = 'discarded' }
export enum GenerationScopeType { CYCLE = 'cycle', COURSE = 'course' }

@Entity('curriculum_generation')
@Index('IDX_curriculum_generation_subject_scope', ['subjectName', 'scopeType', 'scopeId'])
export class CurriculumGeneration {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() subjectName: string;
  @Column('uuid') educationalLevelId: string;
  @Column({ type: 'enum', enum: GenerationScopeType }) scopeType: GenerationScopeType;
  @Column('uuid') scopeId: string;
  @Column({ type: 'enum', enum: GenerationStatus, default: GenerationStatus.DRAFT }) status: GenerationStatus;
  @Column({ nullable: true }) model: string;
  @Column({ type: 'jsonb' }) payload: any;
  @Column('uuid', { nullable: true }) createdBy: string | null;
  @Column('uuid', { nullable: true }) appliedBy: string | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) appliedAt: Date | null;
}
