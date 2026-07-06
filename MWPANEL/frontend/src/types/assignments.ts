/**
 * @archivo: assignments.ts
 * @módulo: Types - Assignments
 * @función: Definiciones de tipos TypeScript para sistema de asignaciones
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Tipos TypeScript que definen la estructura de datos del sistema
 * de asignaciones para mantener type safety en el frontend.
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 3.1
 */

// === ENUMS ===

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED'
}

export enum CampaignType {
  SINGLE = 'SINGLE',
  BULK = 'BULK',
  RECURRING = 'RECURRING',
  CONDITIONAL = 'CONDITIONAL'
}

export enum TargetType {
  INDIVIDUAL = 'INDIVIDUAL',
  CLASS = 'CLASS',
  SUBJECT = 'SUBJECT',
  GRADE_LEVEL = 'GRADE_LEVEL',
  CUSTOM_GROUP = 'CUSTOM_GROUP'
}

export enum ProgressStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
  SUBMITTED = 'SUBMITTED',
  GRADED = 'GRADED',
  REVIEWED = 'REVIEWED'
}

export enum ActivityType {
  VIEW = 'VIEW',
  DOWNLOAD = 'DOWNLOAD',
  SUBMIT = 'SUBMIT',
  COMPLETE = 'COMPLETE',
  COMMENT = 'COMMENT',
  SHARE = 'SHARE',
  BOOKMARK = 'BOOKMARK',
  PRINT = 'PRINT'
}

// === INTERFACES PRINCIPALES ===

export interface AssignmentCampaign {
  id: string;
  title: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  
  // Fechas
  createdAt: Date | string;
  updatedAt: Date | string;
  startDate?: Date | string;
  endDate?: Date | string;
  
  // Relaciones
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  
  // Recursos y targets
  resources?: CampaignResource[];
  targets?: CampaignTarget[];
  
  // Configuración
  configuration: CampaignConfiguration;
  
  // Metadatos y analytics
  metadata?: CampaignMetadata;
}

export interface CampaignResource {
  id: string;
  campaignId: string;
  resourceId: string;
  required: boolean;
  estimatedTime?: number; // minutos
  difficultyAdjustment?: number;
  order?: number;
  
  // Información del recurso
  resource?: {
    id: string;
    title: string;
    description?: string;
    type: string;
    fileUrl?: string;
    thumbnailUrl?: string;
  };
  
  // Configuración específica
  configuration?: {
    allowDownload?: boolean;
    requireCompletion?: boolean;
    maxAttempts?: number;
    timeLimit?: number;
  };
  
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignTarget {
  id: string;
  campaignId: string;
  targetType: TargetType;
  targetId: string;
  metadata: Record<string, any>;
  
  // Información del target
  targetInfo?: {
    id: string;
    name: string;
    type: string;
    memberCount?: number;
  };
  
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AssignmentProgress {
  id: string;
  campaignId: string;
  resourceId: string;
  userId: string;
  status: ProgressStatus;
  
  // Métricas de progreso
  completedAt?: Date | string;
  timeSpent: number; // minutos
  attempts: number;
  currentProgress: number; // 0-100
  engagementScore: number; // 0-100
  
  // Feedback y comentarios
  studentFeedback?: string;
  teacherFeedback?: string;
  studentRating?: number; // 1-5
  teacherRating?: number; // 1-5
  
  // Metadatos
  metadata: ProgressMetadata;
  
  // Relaciones
  campaign?: AssignmentCampaign;
  resource?: CampaignResource;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ProgressActivity {
  id: string;
  progressId: string;
  activityType: ActivityType;
  timeSpent: number;
  metadata: ActivityMetadata;
  
  createdAt: Date | string;
}

// === CONFIGURACIONES ===

export interface CampaignConfiguration {
  allowLateSubmission: boolean;
  requireCompletion: boolean;
  enableNotifications: boolean;
  trackProgress: boolean;
  autoAdvance?: boolean;
  allowRetries?: boolean;
  maxRetries?: number;
  notificationSettings?: NotificationSettings;
  gradingSettings?: GradingSettings;
  accessSettings?: AccessSettings;
}

export interface NotificationSettings {
  onStart?: boolean;
  onProgress?: boolean;
  onCompletion?: boolean;
  onOverdue?: boolean;
  reminderFrequency?: 'daily' | 'weekly' | 'custom';
  customReminderDays?: number[];
}

export interface GradingSettings {
  autoGrade?: boolean;
  gradingCriteria?: GradingCriteria[];
  passingScore?: number;
  weightByTime?: boolean;
  weightByAttempts?: boolean;
}

export interface AccessSettings {
  restrictByTime?: boolean;
  availableFrom?: Date | string;
  availableUntil?: Date | string;
  restrictByDevice?: boolean;
  allowedDevices?: string[];
  requireSupervision?: boolean;
}

// === METADATOS ===

export interface CampaignMetadata {
  difficulty?: 'basic' | 'intermediate' | 'advanced';
  estimatedTime?: number; // minutos totales
  tags?: string[];
  category?: string;
  prerequisites?: string[];
  objectives?: string[];
  urgencyLevel?: 'low' | 'medium' | 'high';
  
  // Analytics calculados
  analytics?: {
    totalTargets: number;
    activeTargets: number;
    completedTargets: number;
    averageProgress: number;
    averageTimeSpent: number;
    completionRate: number;
    engagementRate: number;
  };
  
  // Configuraciones avanzadas
  customFields?: Record<string, any>;
  integrations?: IntegrationMetadata[];
}

export interface ProgressMetadata {
  timeSpent?: number;
  attempts?: number;
  hints?: number;
  bookmarks?: string[];
  notes?: string;
  device?: string;
  browser?: string;
  location?: string;
  sessionIds?: string[];
  customData?: Record<string, any>;
}

export interface ActivityMetadata {
  device?: string;
  browser?: string;
  location?: string;
  referrer?: string;
  sessionId?: string;
  scrollDepth?: number;
  clickCount?: number;
  focusTime?: number;
  customData?: Record<string, any>;
}

export interface IntegrationMetadata {
  type: 'lms' | 'gradebook' | 'analytics' | 'notification';
  service: string;
  configuration: Record<string, any>;
  enabled: boolean;
}

// === CRITERIOS Y EVALUACIÓN ===

export interface GradingCriteria {
  id: string;
  name: string;
  description?: string;
  weight: number;
  type: 'completion' | 'time' | 'accuracy' | 'participation' | 'custom';
  parameters: Record<string, any>;
  minScore?: number;
  maxScore?: number;
}

// === DTOs PARA REQUESTS ===

export interface CreateCampaignDto {
  title: string;
  description?: string;
  type: CampaignType;
  startDate?: Date | string;
  endDate?: Date | string;
  
  resources: CreateResourceDto[];
  targets: CreateTargetDto[];
  configuration: CampaignConfiguration;
  metadata?: Partial<CampaignMetadata>;
}

export interface UpdateCampaignDto {
  title?: string;
  description?: string;
  status?: CampaignStatus;
  startDate?: Date | string;
  endDate?: Date | string;
  
  resources?: CreateResourceDto[];
  targets?: CreateTargetDto[];
  configuration?: Partial<CampaignConfiguration>;
  metadata?: Partial<CampaignMetadata>;
}

export interface CreateResourceDto {
  resourceId: string;
  required: boolean;
  estimatedTime?: number;
  difficultyAdjustment?: number;
  order?: number;
  configuration?: Record<string, any>;
}

export interface CreateTargetDto {
  targetType: TargetType;
  targetId: string;
  metadata?: Record<string, any>;
}

export interface RecordActivityDto {
  campaignId: string;
  resourceId: string;
  activityType: ActivityType;
  timeSpent: number;
  metadata?: ActivityMetadata;
}

export interface UpdateProgressDto {
  status?: ProgressStatus;
  currentProgress?: number;
  timeSpent?: number;
  studentFeedback?: string;
  studentRating?: number;
  metadata?: Partial<ProgressMetadata>;
}

export interface CompleteResourceDto {
  campaignId: string;
  resourceId: string;
  timeSpent: number;
  completedAt: Date | string;
  feedback?: string;
  rating?: number;
  metadata?: Partial<ProgressMetadata>;
}

// === FILTERS Y QUERIES ===

export interface CampaignFilters {
  status?: CampaignStatus[];
  type?: CampaignType[];
  createdById?: string;
  tags?: string[];
  dateRange?: {
    start?: Date | string;
    end?: Date | string;
  };
  search?: string;
}

export interface ProgressFilters {
  campaignId?: string;
  userId?: string;
  status?: ProgressStatus[];
  completionRange?: {
    min?: number;
    max?: number;
  };
  timeRange?: {
    start?: Date | string;
    end?: Date | string;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// === RESPONSES ===

export interface CampaignListResponse {
  data: AssignmentCampaign[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ProgressDashboardResponse {
  userId: string;
  activeCampaigns: number;
  completedCampaigns: number;
  totalProgress: number;
  averageEngagement: number;
  timeSpentToday: number;
  timeSpentTotal: number;
  
  recentActivities: ProgressActivity[];
  upcomingDeadlines: AssignmentCampaign[];
  completedRecently: AssignmentProgress[];
  
  performanceMetrics: {
    completionRate: number;
    averageScore: number;
    timeEfficiency: number;
    consistencyScore: number;
  };
}

export interface AnalyticsOverviewResponse {
  totalCampaigns: number;
  activeCampaigns: number;
  completionRate: number;
  averageProgress: number;
  totalUsers: number;
  activeUsers: number;
  engagementRate: number;
  
  recentActivities: ProgressActivity[];
  topPerformingCampaigns: AssignmentCampaign[];
  performanceByType: Record<CampaignType, number>;
  progressTrends: Array<{
    date: string;
    campaigns: number;
    completions: number;
    engagement: number;
  }>;
}

// === UTILITY TYPES ===

export type CampaignId = string;
export type UserId = string;
export type ResourceId = string;
export type EntityId = string;

export type SortDirection = 'ASC' | 'DESC';

export type BulkOperationResult = {
  successful: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
};

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

// === ERROR TYPES ===

export interface AssignmentError {
  code: string;
  message: string;
  details?: any;
  field?: string;
}

export enum AssignmentErrorCode {
  CAMPAIGN_NOT_FOUND = 'CAMPAIGN_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  INVALID_TARGET = 'INVALID_TARGET',
  RESOURCE_NOT_AVAILABLE = 'RESOURCE_NOT_AVAILABLE',
  DEADLINE_EXCEEDED = 'DEADLINE_EXCEEDED',
  ALREADY_COMPLETED = 'ALREADY_COMPLETED',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
  BULK_OPERATION_FAILED = 'BULK_OPERATION_FAILED'
}