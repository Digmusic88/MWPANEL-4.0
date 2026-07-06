/**
 * @archivo: index.ts
 * @módulo: Assignments - DTOs
 * @función: Archivo barril para exportación organizada de DTOs
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Exporta todos los DTOs del sistema de asignaciones de manera centralizada
 * para facilitar las importaciones en servicios y controladores.
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.3
 */

// === CAMPAIGN DTOs ===
export { CreateCampaignDto, CampaignResourceDto, CampaignTargetDto, ValidateResourcesDto, ValidateTargetsDto } from './create-campaign.dto';
export * from './update-campaign.dto';
export * from './campaign-filters.dto';

// === ACTIVITY DTOs ===
export * from './activity.dto';

// === ADVANCED OPERATIONS DTOs ===
export * from './advanced-operations.dto';

// === VALIDATION DTOs ===
export * from './validation.dto';

// === RESPONSE DTOs ===
export * from './responses.dto';

// === INTEGRATION DTOs ===
export * from './integrations.dto';

// === RESPONSE TYPES ===
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
  metadata?: {
    timestamp: string;
    requestId?: string;
    userId?: string;
    [key: string]: any;
  };
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CampaignResponse extends ApiResponse {
  data: {
    campaign: any; // AssignmentCampaign entity
    metadata: {
      totalTargets: number;
      activeTargets: number;
      completedTargets: number;
      progressPercentage: number;
      overallEffectiveness: number;
      estimatedTotalTime: number;
      actualAverageTime: number;
    };
  };
}

export interface CampaignListResponse extends PaginatedResponse {
  data: {
    campaigns: any[]; // AssignmentCampaign entities
    aggregations: {
      totalActive: number;
      totalCompleted: number;
      averageCompletionRate: number;
      totalTargetsAcrossAll: number;
      mostUsedResourceType: string;
      topPerformingCampaign: {
        id: string;
        name: string;
        effectivenessScore: number;
      } | null;
    };
  };
}

export interface ProgressResponse extends ApiResponse {
  data: {
    progressId: string;
    engagementScore: number;
    completionPercentage: number;
    timeSpent: number;
    campaignCompleted?: boolean;
    achievements?: any[];
    nextRecommendations?: any[];
  };
}

export interface DashboardResponse extends ApiResponse {
  data: {
    activeCampaigns: any[];
    completedCampaigns: any[];
    upcomingDeadlines: any[];
    achievements: any[];
    overallStats: {
      totalCampaignsAssigned: number;
      totalCampaignsCompleted: number;
      averageCompletionTime: number;
      averageRating: number;
      totalTimeSpent: number;
      currentStreak: number;
    };
  };
}

export interface AnalyticsResponse extends ApiResponse {
  data: {
    overview: {
      totalCampaigns: number;
      activeCampaigns: number;
      averageCompletionRate: number;
      totalParticipants: number;
    };
    trends: any;
    topPerformingCampaigns: any[];
    resourceEffectiveness: any[];
    timeSeriesData?: any[];
    campaignBreakdown?: any[];
  };
}

export interface ReportResponse extends ApiResponse {
  data: {
    summary: {
      totalProgress: number;
      completedCampaigns: number;
      activeCampaigns: number;
      overdueCampaigns: number;
      averageEngagement: number;
    };
    campaignBreakdown: any[];
    recommendations: any[];
    trends: {
      engagementTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
      completionTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
      timeManagementTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    };
  };
  metadata: {
    timestamp: string;
    generatedBy: string;
    generatedAt: string;
    format: 'JSON' | 'PDF' | 'EXCEL';
    userCount: number;
    campaignCount: number;
  };
}

// === COMMON VALIDATION TYPES ===
export type UUID = string;
export type DateString = string;
export type SortOrder = 'ASC' | 'DESC';

// === ERROR TYPES ===
export interface ValidationError {
  field: string;
  value: any;
  constraints: Record<string, string>;
}

export interface BusinessLogicError {
  code: string;
  message: string;
  details?: any;
}