import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { SpecificCompetency } from './specific-competency.entity';
import { EvaluationCriterion } from './evaluation-criterion.entity';

/**
 * Observaciones Formativas
 * Registro sistemático de observaciones para la evaluación continua y formativa
 * Principal herramienta de evaluación en Educación Infantil
 * Complemento importante en Primaria y ESO
 */
@Entity('formative_observations')
export class FormativeObservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column('uuid')
  studentId: string;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @Column('uuid')
  teacherId: string;

  @ManyToOne(() => SpecificCompetency, { nullable: true })
  @JoinColumn({ name: 'specificCompetencyId' })
  specificCompetency: SpecificCompetency;

  @Column('uuid', { nullable: true })
  specificCompetencyId: string;

  @ManyToOne(() => EvaluationCriterion, { nullable: true })
  @JoinColumn({ name: 'evaluationCriterionId' })
  evaluationCriterion: EvaluationCriterion;

  @Column('uuid', { nullable: true })
  evaluationCriterionId: string;

  // Contexto de la observación
  @Column({
    type: 'enum',
    enum: ['CLASSROOM', 'PLAYGROUND', 'LAB', 'WORKSHOP', 'FIELD_TRIP', 'OTHER'],
  })
  context: string;

  @Column({ type: 'text', nullable: true })
  contextDescription: string;

  // La observación en sí
  @Column({ type: 'text' })
  observation: string;

  // Tipo de observación
  @Column({
    type: 'enum',
    enum: ['ACHIEVEMENT', 'PROCESS', 'DIFFICULTY', 'BEHAVIOR', 'INTERACTION'],
  })
  observationType: string;

  // Para Educación Infantil - aspectos del desarrollo
  @Column({ type: 'jsonb', nullable: true })
  developmentAspects: {
    motor?: boolean;
    cognitive?: boolean;
    linguistic?: boolean;
    social?: boolean;
    emotional?: boolean;
    autonomous?: boolean;
  };

  // Indicadores de progreso
  @Column({
    type: 'enum',
    enum: ['EMERGING', 'DEVELOPING', 'ACHIEVING', 'EXCEEDING'],
    nullable: true,
  })
  progressIndicator: string;

  // Evidencias adjuntas (fotos, videos, trabajos)
  @Column('text', { array: true, nullable: true })
  attachments: string[];

  // Fecha y hora de la observación
  @Column({ type: 'timestamp' })
  observationDateTime: Date;

  // Para seguimiento longitudinal
  @Column({ type: 'boolean', default: false })
  requiresFollowUp: boolean;

  @Column({ type: 'text', nullable: true })
  followUpNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}