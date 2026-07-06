import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn,
} from 'typeorm';

@Entity('work_basic_knowledge_assessments')
@Unique('UQ_wbka_student_saber_work_period', ['studentId', 'basicKnowledgeId', 'workId', 'evaluationPeriodId'])
@Index('IDX_wbka_work', ['workId', 'workType'])
@Index('IDX_wbka_student_period', ['studentId', 'evaluationPeriodId'])
export class WorkBasicKnowledgeAssessment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') studentId: string;
  @Column('uuid') basicKnowledgeId: string;
  @Column('uuid') workId: string;
  @Column({ type: 'varchar', length: 16 }) workType: string; // 'activity' | 'task' | 'test'
  @Column('uuid') subjectAssignmentId: string;
  @Column('uuid') evaluationPeriodId: string;
  @Column('uuid') teacherId: string;
  @Column({ type: 'varchar', length: 16 }) levelValue: string; // NOT_ACHIEVED | IN_PROGRESS | ACHIEVED
  @Column({ type: 'timestamptz' }) assessedAt: Date;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
