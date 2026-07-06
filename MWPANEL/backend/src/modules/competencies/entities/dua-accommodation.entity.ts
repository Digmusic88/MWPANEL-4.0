import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { DuaProfile } from './dua-profile.entity';
import { Subject } from '../../students/entities/subject.entity';
import { EvaluationCriterion } from './evaluation-criterion.entity';
import { LearningSituation } from './learning-situation.entity';

/**
 * Categorías de acomodaciones según UDL
 */
export enum AccommodationCategory {
  // Principio 1: Múltiples formas de representación
  PRESENTATION = 'PRESENTATION',
  
  // Principio 2: Múltiples formas de acción y expresión
  RESPONSE = 'RESPONSE',
  
  // Principio 3: Múltiples formas de implicación
  SETTING = 'SETTING',
  
  // Tiempo y programación
  TIMING_SCHEDULING = 'TIMING_SCHEDULING',
}

/**
 * Tipos específicos de acomodaciones
 */
export enum AccommodationType {
  // Presentación
  LARGE_PRINT = 'LARGE_PRINT',
  BRAILLE = 'BRAILLE',
  AUDIO_VERSION = 'AUDIO_VERSION',
  SIGN_LANGUAGE = 'SIGN_LANGUAGE',
  SIMPLIFIED_LANGUAGE = 'SIMPLIFIED_LANGUAGE',
  VISUAL_CUES = 'VISUAL_CUES',
  HIGHLIGHTING = 'HIGHLIGHTING',
  COLOR_OVERLAYS = 'COLOR_OVERLAYS',
  
  // Respuesta
  SCRIBE = 'SCRIBE',
  SPEECH_TO_TEXT = 'SPEECH_TO_TEXT',
  WORD_PROCESSOR = 'WORD_PROCESSOR',
  CALCULATOR = 'CALCULATOR',
  SPELL_CHECKER = 'SPELL_CHECKER',
  GRAPHIC_ORGANIZERS = 'GRAPHIC_ORGANIZERS',
  ORAL_RESPONSE = 'ORAL_RESPONSE',
  
  // Entorno
  SEPARATE_LOCATION = 'SEPARATE_LOCATION',
  SMALL_GROUP = 'SMALL_GROUP',
  PREFERENTIAL_SEATING = 'PREFERENTIAL_SEATING',
  REDUCED_DISTRACTIONS = 'REDUCED_DISTRACTIONS',
  NOISE_BUFFER = 'NOISE_BUFFER',
  FIDGET_TOOLS = 'FIDGET_TOOLS',
  STANDING_DESK = 'STANDING_DESK',
  
  // Tiempo
  EXTENDED_TIME = 'EXTENDED_TIME',
  FREQUENT_BREAKS = 'FREQUENT_BREAKS',
  MULTIPLE_SESSIONS = 'MULTIPLE_SESSIONS',
  TIME_OF_DAY = 'TIME_OF_DAY',
  
  // Otros
  CUSTOM = 'CUSTOM',
}

/**
 * Estado de implementación de la acomodación
 */
export enum AccommodationStatus {
  PROPOSED = 'PROPOSED',
  APPROVED = 'APPROVED',
  IMPLEMENTED = 'IMPLEMENTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  DISCONTINUED = 'DISCONTINUED',
}

/**
 * Acomodaciones DUA
 * Representa ajustes específicos para garantizar el acceso al currículo
 * sin modificar los estándares de aprendizaje
 */
@Entity('dua_accommodations')
@Index(['duaProfileId', 'status'])
@Index(['category', 'type'])
export class DuaAccommodation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DuaProfile, profile => profile.accommodations, { nullable: false })
  @JoinColumn({ name: 'dua_profile_id' })
  duaProfile: DuaProfile;

  @Column({ name: 'dua_profile_id' })
  duaProfileId: string;

  @Column({
    type: 'enum',
    enum: AccommodationCategory,
  })
  category: AccommodationCategory;

  @Column({
    type: 'enum',
    enum: AccommodationType,
  })
  type: AccommodationType;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  // Especificaciones técnicas de la acomodación
  @Column({
    type: 'jsonb',
    name: 'specifications',
    default: {},
  })
  specifications: {
    // Para tiempo extendido
    timeMultiplier?: number; // 1.5x, 2x, etc.
    maxDuration?: number; // minutos
    
    // Para texto
    fontSize?: number;
    fontFamily?: string;
    lineSpacing?: number;
    
    // Para audio
    speechRate?: number;
    voice?: string;
    
    // Para descansos
    breakFrequency?: number; // minutos
    breakDuration?: number; // minutos
    
    // Personalizado
    custom?: Record<string, any>;
  };

  // Aplicabilidad
  @Column({
    type: 'jsonb',
    name: 'applicability',
    default: {},
  })
  applicability: {
    allSubjects?: boolean;
    subjectIds?: string[];
    allActivities?: boolean;
    activityTypes?: string[];
    allEvaluations?: boolean;
    evaluationTypes?: string[];
    specificSituations?: string[];
  };

  // Relaciones opcionales para aplicación específica
  @ManyToOne(() => Subject, { nullable: true })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ name: 'subject_id', nullable: true })
  subjectId: string;

  @ManyToOne(() => EvaluationCriterion, { nullable: true })
  @JoinColumn({ name: 'evaluation_criterion_id' })
  evaluationCriterion: EvaluationCriterion;

  @Column({ name: 'evaluation_criterion_id', nullable: true })
  evaluationCriterionId: string;

  @ManyToOne(() => LearningSituation, { nullable: true })
  @JoinColumn({ name: 'learning_situation_id' })
  learningSituation: LearningSituation;

  @Column({ name: 'learning_situation_id', nullable: true })
  learningSituationId: string;

  // Estado y vigencia
  @Column({
    type: 'enum',
    enum: AccommodationStatus,
    default: AccommodationStatus.PROPOSED,
  })
  status: AccommodationStatus;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  @Column({ name: 'is_temporary', type: 'boolean', default: false })
  isTemporary: boolean;

  // Justificación y evidencia
  @Column({ type: 'text' })
  rationale: string;

  @Column({
    type: 'jsonb',
    name: 'supporting_evidence',
    nullable: true,
  })
  supportingEvidence: {
    documents?: string[];
    evaluations?: string[];
    observations?: string[];
    recommendations?: string[];
  };

  // Evaluación de efectividad
  @Column({
    type: 'jsonb',
    name: 'effectiveness_data',
    default: {},
  })
  effectivenessData: {
    isEffective?: boolean;
    lastReviewDate?: Date;
    reviewNotes?: string;
    metrics?: {
      academicImprovement?: number; // porcentaje
      studentSatisfaction?: number; // 1-5
      teacherFeedback?: string;
      parentFeedback?: string;
    };
  };

  // Implementación
  @Column({
    type: 'jsonb',
    name: 'implementation_notes',
    nullable: true,
  })
  implementationNotes: {
    requiredResources?: string[];
    trainingNeeded?: boolean;
    costEstimate?: number;
    responsibleStaff?: string[];
    setupInstructions?: string;
  };

  // Metadatos
  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}