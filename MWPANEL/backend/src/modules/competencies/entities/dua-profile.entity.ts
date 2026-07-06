import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { CurricularAdaptation } from './curricular-adaptation.entity';
import { DuaAccommodation } from './dua-accommodation.entity';

/**
 * Tipos de necesidades educativas según LOMLOE
 */
export enum EducationalNeedType {
  // Dificultades de aprendizaje
  DYSLEXIA = 'DYSLEXIA',
  DYSCALCULIA = 'DYSCALCULIA',
  DYSGRAPHIA = 'DYSGRAPHIA',
  
  // Trastornos del desarrollo
  ADHD = 'ADHD',
  ASD = 'ASD', // Autism Spectrum Disorder
  
  // Discapacidades
  VISUAL_IMPAIRMENT = 'VISUAL_IMPAIRMENT',
  HEARING_IMPAIRMENT = 'HEARING_IMPAIRMENT',
  MOTOR_DISABILITY = 'MOTOR_DISABILITY',
  INTELLECTUAL_DISABILITY = 'INTELLECTUAL_DISABILITY',
  
  // Altas capacidades
  GIFTEDNESS = 'GIFTEDNESS',
  HIGH_ABILITIES = 'HIGH_ABILITIES',
  
  // Otras necesidades
  LANGUAGE_BARRIER = 'LANGUAGE_BARRIER',
  SOCIO_EMOTIONAL = 'SOCIO_EMOTIONAL',
  TEMPORARY_CONDITION = 'TEMPORARY_CONDITION',
  OTHER = 'OTHER',
}

/**
 * Nivel de apoyo requerido según clasificación internacional
 */
export enum SupportLevel {
  LEVEL_1 = 'LEVEL_1', // Apoyo intermitente
  LEVEL_2 = 'LEVEL_2', // Apoyo limitado
  LEVEL_3 = 'LEVEL_3', // Apoyo extenso
  LEVEL_4 = 'LEVEL_4', // Apoyo generalizado
}

/**
 * Perfil DUA del estudiante
 * Almacena información sobre necesidades educativas y preferencias de aprendizaje
 * siguiendo los principios del Diseño Universal para el Aprendizaje
 */
@Entity('dua_profiles')
@Index(['studentId', 'isActive'])
export class DuaProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, { nullable: false })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Necesidades educativas identificadas
  @Column({
    type: 'simple-array',
    name: 'educational_needs',
    nullable: true,
  })
  educationalNeeds: EducationalNeedType[];

  @Column({
    type: 'enum',
    enum: SupportLevel,
    name: 'support_level',
    nullable: true,
  })
  supportLevel: SupportLevel;

  // Preferencias de aprendizaje - Principio 1: Representación
  @Column({
    type: 'jsonb',
    name: 'representation_preferences',
    default: {},
  })
  representationPreferences: {
    visualPreferred?: boolean;
    auditoryPreferred?: boolean;
    kinestheticPreferred?: boolean;
    needsSimplifiedText?: boolean;
    needsVisualSupports?: boolean;
    needsAudioSupport?: boolean;
    preferredFontSize?: number;
    preferredColorContrast?: 'normal' | 'high' | 'inverted';
    needsStructuredLayout?: boolean;
  };

  // Preferencias de acción y expresión - Principio 2
  @Column({
    type: 'jsonb',
    name: 'expression_preferences',
    default: {},
  })
  expressionPreferences: {
    needsExtendedTime?: boolean;
    timeExtensionFactor?: number; // 1.5x, 2x, etc.
    preferredResponseFormat?: 'written' | 'oral' | 'visual' | 'manipulative';
    needsAlternativeKeyboard?: boolean;
    needsSpeechToText?: boolean;
    needsCalculator?: boolean;
    needsSpellChecker?: boolean;
    allowedBreaks?: number;
    breakDuration?: number; // minutos
  };

  // Preferencias de implicación - Principio 3
  @Column({
    type: 'jsonb',
    name: 'engagement_preferences',
    default: {},
  })
  engagementPreferences: {
    needsFrequentFeedback?: boolean;
    preferredRewardSystem?: 'points' | 'badges' | 'verbal' | 'none';
    needsClearExpectations?: boolean;
    needsRoutineStructure?: boolean;
    preferredGroupSize?: 'individual' | 'pairs' | 'small' | 'large';
    needsMovementBreaks?: boolean;
    anxietyManagement?: boolean;
    needsQuietSpace?: boolean;
  };

  // Fortalezas y áreas de interés
  @Column({
    type: 'jsonb',
    name: 'strengths_interests',
    default: {},
  })
  strengthsAndInterests: {
    strengths: string[];
    interests: string[];
    learningStyles: string[];
    motivators: string[];
  };

  // Información médica/clínica relevante
  @Column({
    type: 'jsonb',
    name: 'clinical_info',
    nullable: true,
  })
  clinicalInfo: {
    diagnosis?: string[];
    medications?: string[];
    therapies?: string[];
    specialists?: {
      name: string;
      specialty: string;
      contact: string;
    }[];
    lastEvaluation?: Date;
    nextReview?: Date;
  };

  // Historial de efectividad
  @Column({
    type: 'jsonb',
    name: 'effectiveness_history',
    default: {},
  })
  effectivenessHistory: {
    successfulStrategies: string[];
    unsuccessfulStrategies: string[];
    observations: {
      date: Date;
      strategy: string;
      outcome: string;
      recordedBy: string;
    }[];
  };

  // Información adicional
  @Column({ type: 'text', nullable: true })
  additionalNotes: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ name: 'last_reviewed_at', nullable: true })
  lastReviewedAt: Date;

  @Column({ name: 'next_review_date', nullable: true })
  nextReviewDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @OneToMany(() => CurricularAdaptation, adaptation => adaptation.duaProfile)
  curricularAdaptations: CurricularAdaptation[];

  @OneToMany(() => DuaAccommodation, accommodation => accommodation.duaProfile)
  accommodations: DuaAccommodation[];
}