import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';
import { CriterionScaleType } from './criterion-assessment.entity';

@Entity('criterion_scale_configs')
@Unique('UQ_criterion_scale_config_assignment', ['subjectAssignmentId'])
export class CriterionScaleConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  subjectAssignmentId: string;

  @Column({ type: 'varchar', length: 16, default: CriterionScaleType.LEVELS })
  scaleType: CriterionScaleType;

  @Column({ type: 'int', default: 10 })
  numericMax: number;

  @Column({ type: 'jsonb', default: () => `'{"EMERGING":40,"DEVELOPING":60,"ACHIEVING":80,"EXCEEDING":100}'` })
  levelMapping: Record<string, number>;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
