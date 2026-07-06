import { Entity, Column, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

export type LomloeGradeMode = 'parallel' | 'derive' | 'replace';

@Entity('subject_lomloe_grade_modes')
@Unique('UQ_lomloe_grade_mode_sa_period', ['subjectAssignmentId', 'gradePeriod'])
export class SubjectLomloeGradeMode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  subjectAssignmentId: string;

  @Column({ type: 'varchar', length: 20 })
  gradePeriod: string; // GradePeriod: first_trimester|second_trimester|third_trimester

  @Column({ type: 'varchar', length: 16, default: 'parallel' })
  mode: LomloeGradeMode;

  @Column({ type: 'uuid', nullable: true })
  updatedById: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
