/**
 * @archivo: grade-configuration.entity.ts
 * @módulo: Grades (Centralización de Valoraciones)
 * @función: Configuración de ponderaciones por profesor, curso y materia
 * @crítico: SÍ - Centro neurálgico del sistema de calificaciones
 * @actualizado: Julio 2025 - Sistema centralizado de valoraciones
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Subject } from '../../students/entities/subject.entity';
import { Course } from '../../students/entities/course.entity';
import { EducationalLevel } from '../../students/entities/educational-level.entity';

export enum GradeComponent {
  TASKS = 'tasks',                    // Tareas/deberes
  ACTIVITIES = 'activities',          // Actividades diarias
  EVALUATIONS = 'evaluations',        // Evaluaciones competenciales
  RUBRICS = 'rubrics',               // Evaluaciones con rúbricas
  AI_ASSESSMENTS = 'ai_assessments',  // Evaluaciones automáticas por IA
  EXAMS = 'exams',                   // Exámenes formales
  PROJECTS = 'projects',             // Proyectos especiales
  PARTICIPATION = 'participation',    // Participación en clase
  HOMEWORK = 'homework',             // Tareas para casa
  PRESENTATIONS = 'presentations',    // Presentaciones orales
  CRITERIA = 'criteria',              // Evaluación por criterios (LOMLOE)
}

export enum GradingScale {
  NUMERIC_0_10 = 'numeric_0_10',           // Escala 0-10 (España)
  NUMERIC_0_100 = 'numeric_0_100',         // Escala 0-100
  COMPETENCY_1_5 = 'competency_1_5',       // Escala competencial 1-5
  EMOJI = 'emoji',                         // Evaluación con emojis
  RUBRIC_BASED = 'rubric_based',           // Basado en rúbricas
  PASS_FAIL = 'pass_fail',                 // Apto/No apto
}

export enum RoundingPolicy {
  NO_ROUNDING = 'no_rounding',         // Sin redondeo
  ROUND_HALF_UP = 'round_half_up',     // Redondeo al alza desde 0.5
  ROUND_UP = 'round_up',               // Siempre redondear al alza
  ROUND_DOWN = 'round_down',           // Siempre redondear a la baja
  ROUND_NEAREST = 'round_nearest',     // Al más cercano
}

@Entity('grade_configurations')
@Unique(['teacher', 'subject', 'course', 'educationalLevel'])
@Index(['teacher', 'subject'])
@Index(['course', 'educationalLevel'])
export class GradeConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Teacher, { eager: true })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @Column({ name: 'teacher_id' })
  teacherId: string;

  @ManyToOne(() => Subject, { eager: true })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ name: 'subject_id' })
  subjectId: string;

  @ManyToOne(() => Course, { eager: true, nullable: true })
  @JoinColumn({ name: 'course_id' })
  course?: Course;

  @Column({ name: 'course_id', nullable: true })
  courseId?: string;

  @ManyToOne(() => EducationalLevel, { eager: true })
  @JoinColumn({ name: 'educational_level_id' })
  educationalLevel: EducationalLevel;

  @Column({ name: 'educational_level_id' })
  educationalLevelId: string;

  // Configuración de ponderaciones (JSON con componentes y sus pesos)
  @Column({ type: 'jsonb', name: 'weight_configuration' })
  weightConfiguration: {
    [key in GradeComponent]?: {
      weight: number;        // Peso del componente (0-100)
      enabled: boolean;      // Si está habilitado
      minimumItems: number;  // Mínimo de ítems para considerar
      scale: GradingScale;   // Escala de calificación
    };
  };

  // Configuración general
  @Column({
    type: 'enum',
    enum: GradingScale,
    default: GradingScale.NUMERIC_0_100,
    name: 'default_scale'
  })
  defaultScale: GradingScale;

  @Column({
    type: 'enum',
    enum: RoundingPolicy,
    default: RoundingPolicy.ROUND_HALF_UP,
    name: 'rounding_policy'
  })
  roundingPolicy: RoundingPolicy;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 50.0, name: 'passing_grade' })
  passingGrade: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0.0, name: 'minimum_grade' })
  minimumGrade: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100.0, name: 'maximum_grade' })
  maximumGrade: number;

  // Configuración de períodos
  @Column({ default: true, name: 'use_academic_periods' })
  useAcademicPeriods: boolean;

  @Column('text', { array: true, default: ['Primer Trimestre', 'Segundo Trimestre', 'Tercer Trimestre'], name: 'academic_periods' })
  academicPeriods: string[];

  // Configuración de notificaciones
  @Column({ default: true, name: 'notify_grade_updates' })
  notifyGradeUpdates: boolean;

  @Column({ default: true, name: 'notify_families' })
  notifyFamilies: boolean;

  @Column({ default: false, name: 'require_justification_below_passing' })
  requireJustificationBelowPassing: boolean;

  // Configuración de AI
  @Column({ default: false, name: 'enable_ai_assessments' })
  enableAIAssessments: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.10, name: 'ai_assessment_weight' })
  aiAssessmentWeight: number;

  @Column({ default: false, name: 'ai_auto_approve' })
  aiAutoApprove: boolean;

  // Configuración de exportación
  @Column({ default: true, name: 'include_in_reports' })
  includeInReports: boolean;

  @Column({ default: true, name: 'allow_family_access' })
  allowFamilyAccess: boolean;

  @Column({ default: false, name: 'show_detailed_breakdown' })
  showDetailedBreakdown: boolean;

  // Configuración personalizada adicional
  @Column('jsonb', { nullable: true, name: 'custom_settings' })
  customSettings?: {
    extraCredit?: {
      enabled: boolean;
      maxPercentage: number;
    };
    latePenalty?: {
      enabled: boolean;
      percentagePerDay: number;
      maxDays: number;
    };
    retakePolicy?: {
      enabled: boolean;
      maxRetakes: number;
      weightReduction: number;
    };
    attendanceWeight?: {
      enabled: boolean;
      weight: number;
    };
  };

  // Metadatos
  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Computed properties
  getTotalWeight(): number {
    return Object.values(this.weightConfiguration)
      .filter(config => config.enabled)
      .reduce((total, config) => total + config.weight, 0);
  }

  isWeightConfigurationValid(): boolean {
    const total = this.getTotalWeight();
    return total === 100;
  }

  getEnabledComponents(): GradeComponent[] {
    return Object.entries(this.weightConfiguration)
      .filter(([, config]) => config.enabled)
      .map(([component]) => component as GradeComponent);
  }

  getComponentWeight(component: GradeComponent): number {
    const config = this.weightConfiguration[component];
    return config?.enabled ? config.weight : 0;
  }

  getComponentScale(component: GradeComponent): GradingScale {
    const config = this.weightConfiguration[component];
    return config?.scale || this.defaultScale;
  }

  validateGradeConfiguration(): string[] {
    const errors: string[] = [];

    // Validar que los pesos sumen 100
    if (!this.isWeightConfigurationValid()) {
      errors.push(`Los pesos deben sumar 100%. Actual: ${this.getTotalWeight()}%`);
    }

    // Validar que al menos un componente esté habilitado
    if (this.getEnabledComponents().length === 0) {
      errors.push('Debe haber al menos un componente de calificación habilitado');
    }

    // Validar rangos de calificación
    if (this.minimumGrade >= this.maximumGrade) {
      errors.push('La calificación mínima debe ser menor que la máxima');
    }

    if (this.passingGrade < this.minimumGrade || this.passingGrade > this.maximumGrade) {
      errors.push('La calificación de aprobación debe estar entre la mínima y máxima');
    }

    // Validar configuración de AI
    if (this.enableAIAssessments && this.aiAssessmentWeight > 0.5) {
      errors.push('El peso de evaluaciones de IA no puede exceder el 50%');
    }

    return errors;
  }

  // Factory methods para configuraciones predeterminadas
  static createDefaultConfiguration(
    teacher: Teacher,
    subject: Subject,
    course: Course,
    educationalLevel: EducationalLevel,
  ): Partial<GradeConfiguration> {
    return {
      teacher,
      subject,
      course,
      educationalLevel,
      weightConfiguration: {
        // SP-D2a-bis: el centro califica vía Test Yourself (ExamGrade) → EXAMS es el peso principal.
        [GradeComponent.EXAMS]: {
          weight: 40,
          enabled: true,
          minimumItems: 1,
          scale: GradingScale.NUMERIC_0_100,
        },
        [GradeComponent.TASKS]: {
          weight: 30,
          enabled: true,
          minimumItems: 1,
          scale: GradingScale.NUMERIC_0_100,
        },
        [GradeComponent.ACTIVITIES]: {
          weight: 30,
          enabled: true,
          minimumItems: 1,
          scale: GradingScale.NUMERIC_0_100,
        },
        // EVALUATIONS (radar competencial 1-5) se retira del default (D3). Configs personalizadas no se tocan.
      },
      defaultScale: GradingScale.NUMERIC_0_100,
      roundingPolicy: RoundingPolicy.ROUND_HALF_UP,
      passingGrade: 50.0,
      minimumGrade: 0.0,
      maximumGrade: 100.0,
      useAcademicPeriods: true,
      isActive: true,
    };
  }

  static createInfantilConfiguration(
    teacher: Teacher,
    subject: Subject,
    educationalLevel: EducationalLevel,
  ): Partial<GradeConfiguration> {
    return {
      teacher,
      subject,
      educationalLevel,
      weightConfiguration: {
        [GradeComponent.ACTIVITIES]: {
          weight: 70,
          enabled: true,
          minimumItems: 10,
          scale: GradingScale.EMOJI,
        },
        [GradeComponent.PARTICIPATION]: {
          weight: 30,
          enabled: true,
          minimumItems: 5,
          scale: GradingScale.EMOJI,
        },
      },
      defaultScale: GradingScale.EMOJI,
      roundingPolicy: RoundingPolicy.NO_ROUNDING,
      passingGrade: 1.0,
      minimumGrade: 1.0,
      maximumGrade: 3.0,
    };
  }

  static createSecundariaConfiguration(
    teacher: Teacher,
    subject: Subject,
    course: Course,
    educationalLevel: EducationalLevel,
  ): Partial<GradeConfiguration> {
    return {
      teacher,
      subject,
      course,
      educationalLevel,
      weightConfiguration: {
        [GradeComponent.EXAMS]: {
          weight: 50,
          enabled: true,
          minimumItems: 2,
          scale: GradingScale.NUMERIC_0_100,
        },
        [GradeComponent.TASKS]: {
          weight: 25,
          enabled: true,
          minimumItems: 4,
          scale: GradingScale.NUMERIC_0_100,
        },
        [GradeComponent.PROJECTS]: {
          weight: 20,
          enabled: true,
          minimumItems: 1,
          scale: GradingScale.RUBRIC_BASED,
        },
        [GradeComponent.PARTICIPATION]: {
          weight: 5,
          enabled: true,
          minimumItems: 10,
          scale: GradingScale.NUMERIC_0_100,
        },
      },
      enableAIAssessments: true,
      aiAssessmentWeight: 0.05,
      requireJustificationBelowPassing: true,
    };
  }
}