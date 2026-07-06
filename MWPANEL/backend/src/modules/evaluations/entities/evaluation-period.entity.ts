import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AcademicYear } from '../../students/entities/academic-year.entity';

export enum PeriodType {
  CONTINUOUS = 'continuous',
  TRIMESTER_1 = 'trimester_1',
  TRIMESTER_2 = 'trimester_2',
  TRIMESTER_3 = 'trimester_3',
  FINAL = 'final',
  EXTRAORDINARY = 'extraordinary',
}

@Entity('evaluation_periods')
export class EvaluationPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: PeriodType,
  })
  type: PeriodType;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @ManyToOne(() => AcademicYear)
  academicYear: AcademicYear;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}