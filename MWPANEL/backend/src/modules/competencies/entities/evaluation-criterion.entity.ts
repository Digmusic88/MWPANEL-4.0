import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { SpecificCompetency } from './specific-competency.entity';
import { Cycle } from '../../students/entities/cycle.entity';
import { Course } from '../../students/entities/course.entity';

/**
 * Criterios de Evaluación
 * Son los referentes para valorar el grado de adquisición
 * de las competencias específicas
 * Se establecen por ciclo (Infantil/Primaria) o curso (ESO)
 */
@Entity('evaluation_criteria')
export class EvaluationCriterion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string; // ej: "1.1", "2.3"

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @ManyToOne(() => SpecificCompetency, (competency) => competency.evaluationCriteria)
  @JoinColumn({ name: 'specificCompetencyId' })
  specificCompetency: SpecificCompetency;

  @Column('uuid')
  specificCompetencyId: string;

  // Para Infantil y Primaria - por ciclo
  @ManyToOne(() => Cycle, { nullable: true })
  @JoinColumn({ name: 'cycleId' })
  cycle: Cycle;

  @Column('uuid', { nullable: true })
  cycleId: string;

  // Para ESO - por curso
  @ManyToOne(() => Course, { nullable: true })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column('uuid', { nullable: true })
  courseId: string;

  // Para evaluación formativa - indicadores observables
  @Column('text', { array: true, nullable: true })
  observableIndicators: string[];

  // Para DUA - múltiples formas de evaluación
  @Column('text', { array: true, nullable: true })
  assessmentMethods: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}