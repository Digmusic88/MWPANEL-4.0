import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';
import { Subject } from '../../students/entities/subject.entity';
import { SpecificCompetency } from './specific-competency.entity';
import { LearningSituationAssessment } from './learning-situation-assessment.entity';

export enum LearningSituationStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Situaciones de Aprendizaje
 * Son situaciones y actividades que implican el despliegue de competencias
 * clave y específicas y contribuyen a su adquisición y desarrollo
 * Deben ser significativas, relevantes, contextualizadas y respetuosas
 * con las experiencias del alumnado
 */
@Entity('learning_situations')
export class LearningSituation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  // Contexto y relevancia
  @Column({ type: 'text' })
  context: string; // Contexto real y significativo

  @Column({ type: 'text' })
  challenge: string; // Reto o problema a resolver

  // Temporalización
  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'int' })
  estimatedSessions: number;

  @Column({
    type: 'enum',
    enum: LearningSituationStatus,
    default: LearningSituationStatus.DRAFT,
  })
  status: LearningSituationStatus;

  // Metodología
  @Column('text', { array: true })
  methodologies: string[]; // Trabajo cooperativo, ABP, etc.

  @Column('text', { array: true })
  resources: string[]; // Recursos necesarios

  @Column('text', { array: true })
  spaces: string[]; // Espacios de aprendizaje

  // Productos finales esperados
  @Column('text', { array: true })
  expectedProducts: string[];

  // DUA - Diseño Universal para el Aprendizaje
  @Column({ type: 'jsonb', nullable: true })
  duaAdaptations: {
    multipleRepresentations: string[]; // Formas de presentar la información
    multipleActions: string[]; // Formas de expresión del aprendizaje
    multipleEngagements: string[]; // Formas de motivación e implicación
  };

  // Evaluación
  @Column('text', { array: true })
  assessmentTools: string[]; // Herramientas de evaluación

  @Column({ type: 'jsonb', nullable: true })
  successCriteria: {
    criterion: string;
    weight: number;
  }[];

  // Relaciones
  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @Column('uuid')
  teacherId: string;

  @ManyToOne(() => ClassGroup)
  @JoinColumn({ name: 'classGroupId' })
  classGroup: ClassGroup;

  @Column('uuid')
  classGroupId: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @Column('uuid')
  subjectId: string;

  // Competencias específicas trabajadas
  @ManyToMany(() => SpecificCompetency)
  @JoinTable({
    name: 'learning_situation_competencies',
    joinColumn: { name: 'learningSituationId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'specificCompetencyId', referencedColumnName: 'id' },
  })
  specificCompetencies: SpecificCompetency[];

  @OneToMany(() => LearningSituationAssessment, (assessment) => assessment.learningSituation)
  assessments: LearningSituationAssessment[];

  // Compartir con otros profesores
  @Column('text', { array: true, nullable: true })
  sharedWith: string[]; // IDs de profesores

  @Column({ default: false })
  isTemplate: boolean; // Si es una plantilla reutilizable

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}