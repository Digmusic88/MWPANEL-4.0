import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique, Index } from 'typeorm';

// Fuente de verdad del marcado por saber (SP-B2). Escala fija de 3 estados.
@Entity('basic_knowledge_assessments')
@Unique('UQ_bka_student_saber_period', ['studentId', 'basicKnowledgeId', 'evaluationPeriodId'])
@Index('IDX_bka_assignment_period', ['subjectAssignmentId', 'evaluationPeriodId'])
export class BasicKnowledgeAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column('uuid')
  basicKnowledgeId: string;

  @Column('uuid')
  subjectAssignmentId: string;

  @Column('uuid')
  evaluationPeriodId: string;

  @Column('uuid')
  teacherId: string;

  @Column({ type: 'varchar', length: 16 })
  levelValue: string; // NOT_ACHIEVED | IN_PROGRESS | ACHIEVED

  @Column({ type: 'timestamptz' })
  assessedAt: Date;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
