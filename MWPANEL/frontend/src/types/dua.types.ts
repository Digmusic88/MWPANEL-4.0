/**
 * @types: dua.types
 * @module: DUA (Diseño Universal para el Aprendizaje)
 * @description: Tipos TypeScript para el sistema DUA
 * @critical: SÍ - Define contratos de datos del sistema
 */

// ============================================
// ENUMS
// ============================================

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
 * Nivel de apoyo requerido
 */
export enum SupportLevel {
  LEVEL_1 = 'LEVEL_1', // Apoyo intermitente
  LEVEL_2 = 'LEVEL_2', // Apoyo limitado
  LEVEL_3 = 'LEVEL_3', // Apoyo extenso
  LEVEL_4 = 'LEVEL_4', // Apoyo generalizado
}

/**
 * Tipos de acomodación
 */
export enum AccommodationType {
  PRESENTATION = 'PRESENTATION',
  RESPONSE = 'RESPONSE',
  SETTING = 'SETTING',
  TIMING = 'TIMING',
  SCHEDULING = 'SCHEDULING',
  ORGANIZATION = 'ORGANIZATION',
  ASSISTIVE_TECHNOLOGY = 'ASSISTIVE_TECHNOLOGY',
}

/**
 * Estados de acomodación
 */
export enum AccommodationStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED',
}

/**
 * Niveles de aprobación
 */
export enum ApprovalLevel {
  TEACHER = 'TEACHER',
  COORDINATOR = 'COORDINATOR',
  SPECIALIST = 'SPECIALIST',
  FAMILY = 'FAMILY',
}

/**
 * Calificación de efectividad
 */
export enum EffectivenessRating {
  VERY_INEFFECTIVE = 1,
  INEFFECTIVE = 2,
  NEUTRAL = 3,
  EFFECTIVE = 4,
  VERY_EFFECTIVE = 5,
}

// ============================================
// INTERFACES - PREFERENCIAS Y DETALLES
// ============================================

/**
 * Preferencias de representación (Principio 1 DUA)
 */
export interface RepresentationPreferences {
  visualPreferred?: boolean;
  auditoryPreferred?: boolean;
  kinestheticPreferred?: boolean;
  needsSimplifiedText?: boolean;
  needsVisualSupports?: boolean;
  needsAudioSupport?: boolean;
  preferredFontSize?: number;
  preferredColorContrast?: 'normal' | 'high' | 'inverted';
  needsStructuredLayout?: boolean;
}

/**
 * Preferencias de acción y expresión (Principio 2 DUA)
 */
export interface ExpressionPreferences {
  needsExtendedTime?: boolean;
  timeExtensionFactor?: number;
  preferredResponseFormat?: 'written' | 'oral' | 'visual' | 'manipulative';
  needsAlternativeKeyboard?: boolean;
  needsSpeechToText?: boolean;
  needsCalculator?: boolean;
  needsSpellChecker?: boolean;
  allowedBreaks?: number;
  breakDuration?: number;
}

/**
 * Preferencias de implicación (Principio 3 DUA)
 */
export interface EngagementPreferences {
  needsFrequentFeedback?: boolean;
  preferredRewardSystem?: 'points' | 'badges' | 'verbal' | 'none';
  needsClearExpectations?: boolean;
  needsRoutineStructure?: boolean;
  preferredGroupSize?: 'individual' | 'pairs' | 'small' | 'large';
  needsMovementBreaks?: boolean;
  anxietyManagement?: boolean;
  needsQuietSpace?: boolean;
}

/**
 * Fortalezas e intereses
 */
export interface StrengthsAndInterests {
  strengths: string[];
  interests: string[];
  learningStyles: string[];
  motivators: string[];
}

/**
 * Información clínica
 */
export interface ClinicalInfo {
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
}

/**
 * Historial de efectividad
 */
export interface EffectivenessHistory {
  successfulStrategies: string[];
  unsuccessfulStrategies: string[];
  observations: {
    date: Date;
    strategy: string;
    outcome: string;
    recordedBy: string;
  }[];
}

/**
 * Detalles de acomodación según tipo
 */
export interface AccommodationDetails {
  // Para tipo PRESENTATION
  presentationDetails?: {
    textSize?: number;
    fontType?: string;
    colorContrast?: string;
    audioSupport?: boolean;
    visualAids?: string[];
    simplifiedLanguage?: boolean;
  };
  
  // Para tipo RESPONSE
  responseDetails?: {
    alternativeFormat?: string;
    assistiveTechnology?: string[];
    extraTime?: boolean;
    reducedLength?: boolean;
    oralResponses?: boolean;
  };
  
  // Para tipo SETTING
  settingDetails?: {
    preferredLocation?: string;
    lightingNeeds?: string;
    noiseLevel?: 'quiet' | 'moderate' | 'normal';
    seatingArrangement?: string;
    physicalSupports?: string[];
  };
  
  // Para tipo TIMING
  timingDetails?: {
    extraTimePercentage?: number;
    frequentBreaks?: boolean;
    breakDuration?: number;
    flexibleScheduling?: boolean;
    preferredTimeOfDay?: string;
  };
  
  // Otros detalles genéricos
  additionalDetails?: Record<string, any>;
}

/**
 * Workflow de aprobación
 */
export interface ApprovalWorkflowStep {
  level: ApprovalLevel;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  comments?: string;
}

/**
 * Métricas de efectividad
 */
export interface EffectivenessMetrics {
  academicProgress?: {
    preAccommodationPerformance?: number;
    postAccommodationPerformance?: number;
    improvementPercentage?: number;
  };
  participation?: {
    classEngagement?: EffectivenessRating;
    taskCompletion?: EffectivenessRating;
    collaborationLevel?: EffectivenessRating;
  };
  wellbeing?: {
    anxietyReduction?: EffectivenessRating;
    confidenceIncrease?: EffectivenessRating;
    motivationLevel?: EffectivenessRating;
  };
  implementation?: {
    teacherEffort?: EffectivenessRating;
    resourceRequirement?: EffectivenessRating;
    feasibility?: EffectivenessRating;
  };
}

// ============================================
// ENTITIES
// ============================================

/**
 * Perfil DUA del estudiante
 */
export interface DuaProfile {
  id: string;
  studentId: string;
  student?: any; // Student entity
  isActive: boolean;
  educationalNeeds: EducationalNeedType[];
  supportLevel?: SupportLevel;
  representationPreferences: RepresentationPreferences;
  expressionPreferences: ExpressionPreferences;
  engagementPreferences: EngagementPreferences;
  strengthsAndInterests: StrengthsAndInterests;
  clinicalInfo?: ClinicalInfo;
  effectivenessHistory: EffectivenessHistory;
  additionalNotes?: string;
  createdBy?: string;
  lastReviewedAt?: Date;
  nextReviewDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  curricularAdaptations?: any[]; // CurricularAdaptation[]
  accommodations?: DuaAccommodation[];
}

/**
 * Acomodación DUA
 */
export interface DuaAccommodation {
  id: string;
  duaProfileId: string;
  duaProfile?: DuaProfile;
  name: string;
  description: string;
  type: AccommodationType;
  details: AccommodationDetails;
  status: AccommodationStatus;
  isTemplate: boolean;
  timesUsedFromTemplate: number;
  applicableSubjects?: string[];
  applicableActivities?: string[];
  justification: string;
  expectedOutcomes: string[];
  startDate?: Date;
  endDate?: Date;
  requiresFamilyConsent: boolean;
  approvalWorkflow?: ApprovalWorkflowStep[];
  tags?: string[];
  createdById: string;
  createdBy?: any; // Teacher entity
  lastModifiedById?: string;
  lastModifiedBy?: any; // Teacher entity
  createdAt: Date;
  updatedAt: Date;
  effectivenessRecords?: AccommodationEffectiveness[];
}

/**
 * Registro de efectividad de acomodación
 */
export interface AccommodationEffectiveness {
  id: string;
  accommodationId: string;
  accommodation?: DuaAccommodation;
  studentId: string;
  student?: any; // Student entity
  evaluationDate: Date;
  evaluationPeriod: string;
  overallRating: EffectivenessRating;
  metrics: EffectivenessMetrics;
  observations?: string;
  recommendations?: string;
  nextReviewDate?: Date;
  evaluatedById: string;
  evaluatedBy?: any; // Teacher entity
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// DTOs
// ============================================

/**
 * DTO para crear perfil DUA
 */
export interface CreateDuaProfileDto {
  studentId: string;
  educationalNeeds: EducationalNeedType[];
  supportLevel?: SupportLevel;
  representationPreferences?: RepresentationPreferences;
  expressionPreferences?: ExpressionPreferences;
  engagementPreferences?: EngagementPreferences;
  strengthsAndInterests?: StrengthsAndInterests;
  clinicalInfo?: ClinicalInfo;
  additionalNotes?: string;
}

/**
 * DTO para actualizar perfil DUA
 */
export interface UpdateDuaProfileDto extends Partial<CreateDuaProfileDto> {
  isActive?: boolean;
  lastReviewedAt?: Date;
  nextReviewDate?: Date;
}

/**
 * DTO para crear acomodación
 */
export interface CreateAccommodationDto {
  duaProfileId: string;
  name: string;
  description: string;
  type: AccommodationType;
  details: AccommodationDetails;
  status?: AccommodationStatus;
  isTemplate?: boolean;
  applicableSubjects?: string[];
  applicableActivities?: string[];
  justification: string;
  expectedOutcomes: string[];
  startDate?: Date;
  endDate?: Date;
  requiresFamilyConsent?: boolean;
  tags?: string[];
}

/**
 * DTO para actualizar acomodación
 */
export interface UpdateAccommodationDto extends Partial<CreateAccommodationDto> {
  status?: AccommodationStatus;
}

/**
 * DTO para aprobar acomodación
 */
export interface ApproveAccommodationDto {
  comments?: string;
  conditions?: string[];
  expirationDate?: Date;
}

/**
 * DTO para rechazar acomodación
 */
export interface RejectAccommodationDto {
  reason: string;
  suggestions?: string[];
  canResubmit?: boolean;
}

/**
 * DTO para crear registro de efectividad
 */
export interface CreateEffectivenessDto {
  accommodationId: string;
  studentId: string;
  evaluationDate: Date;
  evaluationPeriod: string;
  overallRating: EffectivenessRating;
  metrics: EffectivenessMetrics;
  observations?: string;
  recommendations?: string;
  nextReviewDate?: Date;
}

// ============================================
// FILTROS Y CONSULTAS
// ============================================

/**
 * Filtros para consulta de perfiles DUA
 */
export interface DuaProfileFilters {
  studentId?: string;
  isActive?: boolean;
  educationalNeeds?: EducationalNeedType[];
  supportLevel?: SupportLevel;
  hasAccommodations?: boolean;
  needsReview?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Filtros para consulta de acomodaciones
 */
export interface AccommodationFilters {
  duaProfileId?: string;
  status?: AccommodationStatus;
  type?: AccommodationType;
  createdById?: string;
  isTemplate?: boolean;
  isActive?: boolean;
  tags?: string[];
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Filtros para consulta de efectividad
 */
export interface EffectivenessFilters {
  accommodationId?: string;
  studentId?: string;
  evaluatedById?: string;
  startDate?: Date;
  endDate?: Date;
  minRating?: EffectivenessRating;
  onlyEffective?: boolean;
  page?: number;
  limit?: number;
}

// ============================================
// ANALYTICS Y REPORTES
// ============================================

/**
 * Analytics de acomodaciones
 */
export interface AccommodationAnalytics {
  totalAccommodations: number;
  activeAccommodations: number;
  averageEffectiveness: number;
  accommodationsByType: Record<AccommodationType, number>;
  effectivenessTrend: Array<{
    date: string;
    rating: number;
  }>;
  mostUsedTemplates: Array<{
    id: string;
    name: string;
    uses: number;
  }>;
}

/**
 * Reporte de impacto DUA
 */
export interface DuaImpactReport {
  studentId: string;
  reportPeriod: {
    start: Date;
    end: Date;
  };
  overallImpact: {
    academicImprovement: number;
    participationIncrease: number;
    wellbeingEnhancement: number;
  };
  accommodationsSummary: {
    total: number;
    active: number;
    effective: number;
    byType: Record<AccommodationType, {
      count: number;
      averageEffectiveness: number;
    }>;
  };
  recommendations: string[];
  nextSteps: string[];
}

// ============================================
// RESPUESTAS DE API
// ============================================

/**
 * Respuesta paginada genérica
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Respuesta de validación
 */
export interface ValidationResponse {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Respuesta de importación/exportación
 */
export interface ImportExportResponse {
  success: boolean;
  processed: number;
  imported?: number;
  exported?: number;
  errors: string[];
  warnings: string[];
}