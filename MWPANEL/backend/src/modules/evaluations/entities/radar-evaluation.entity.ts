import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { EvaluationPeriod } from './evaluation-period.entity';

@Entity('radar_evaluations')
export class RadarEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student)
  student: Student;

  @ManyToOne(() => EvaluationPeriod)
  period: EvaluationPeriod;

  @Column({ type: 'jsonb' })
  data: {
    competencies: Array<{
      code: string;
      name: string;
      score: number;
      maxScore: number;
      observations?: string;
    }>;
    overallScore: number;
    date: Date;
  };

  @CreateDateColumn()
  generatedAt: Date;
}