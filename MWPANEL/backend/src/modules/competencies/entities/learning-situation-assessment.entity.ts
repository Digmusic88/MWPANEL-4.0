import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { LearningSituation } from './learning-situation.entity';
import { Student } from '../../students/entities/student.entity';
import { SpecificCompetency } from './specific-competency.entity';

/**
 * Evaluación de Situaciones de Aprendizaje
 * Registra el desempeño del estudiante en cada competencia específica
 * dentro de una situación de aprendizaje
 */
@Entity('learning_situation_assessments')
export class LearningSituationAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => LearningSituation, (situation) => situation.assessments)
  @JoinColumn({ name: 'learningSituationId' })
  learningSituation: LearningSituation;

  @Column('uuid')
  learningSituationId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column('uuid')
  studentId: string;

  @ManyToOne(() => SpecificCompetency)
  @JoinColumn({ name: 'specificCompetencyId' })
  specificCompetency: SpecificCompetency;

  @Column('uuid')
  specificCompetencyId: string;

  // Nivel de desempeño alcanzado
  @Column({
    type: 'enum',
    enum: ['NOT_INITIATED', 'IN_PROCESS', 'ACHIEVED', 'EXCEEDED'],
  })
  performanceLevel: 'NOT_INITIATED' | 'IN_PROCESS' | 'ACHIEVED' | 'EXCEEDED';

  // Evidencias de aprendizaje
  @Column({ type: 'text', nullable: true })
  evidences: string;

  // Observaciones del proceso
  @Column({ type: 'text', nullable: true })
  observations: string;

  // Autoevaluación del estudiante
  @Column({ type: 'text', nullable: true })
  selfAssessment: string;

  @Column({ type: 'int', nullable: true })
  selfScore: number; // 1-10

  // Coevaluación (evaluación entre pares)
  @Column({ type: 'jsonb', nullable: true })
  peerAssessments: {
    studentId: string;
    comment: string;
    score: number;
  }[];

  // Fecha de evaluación
  @Column({ type: 'date' })
  assessmentDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}