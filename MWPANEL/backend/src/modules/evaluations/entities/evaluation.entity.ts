import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Subject } from '../../students/entities/subject.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { EvaluationPeriod } from './evaluation-period.entity';
import { CompetencyEvaluation } from './competency-evaluation.entity';
import { AcademicYear } from '../../students/entities/academic-year.entity';

export enum EvaluationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  REVIEWED = 'reviewed',
  FINALIZED = 'finalized',
}

@Entity('evaluations')
export class Evaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, (student) => student.evaluations)
  student: Student;

  @ManyToOne(() => Subject)
  subject: Subject;

  @ManyToOne(() => Teacher, (teacher) => teacher.evaluations)
  teacher: Teacher;

  @ManyToOne(() => EvaluationPeriod)
  period: EvaluationPeriod;

  @Column({
    type: 'enum',
    enum: EvaluationStatus,
    default: EvaluationStatus.DRAFT,
  })
  status: EvaluationStatus;

  @Column({ type: 'text', nullable: true })
  generalObservations: string;

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  overallScore: number;

  @OneToMany(() => CompetencyEvaluation, (ce) => ce.evaluation, { cascade: true })
  competencyEvaluations: CompetencyEvaluation[];

  @Column('uuid', { nullable: true })
  academicYearId: string | null;

  @ManyToOne(() => AcademicYear, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'academicYearId' })
  academicYear?: AcademicYear;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}