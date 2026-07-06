/**
 * @archivo: responses.dto.ts
 * @módulo: Assignments - DTOs
 * @función: DTOs para responses de API y estructuras de salida
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * DTOs especializados para responses de API, estructuras de salida,
 * transformaciones de datos y formateo de respuestas para diferentes clientes.
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.4
 */

import { Expose, Transform, Type } from 'class-transformer';
import { IsString, IsNumber, IsBoolean, IsArray, IsObject, IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';

/**
 * Base Response DTO
 */
export abstract class BaseResponseDto {
  @Expose()
  @IsBoolean()
  success: boolean;

  @Expose()
  @IsOptional()
  @IsString()
  message?: string;

  @Expose()
  @IsOptional()
  @IsObject()
  metadata?: {
    timestamp: string;
    requestId?: string;
    userId?: string;
    executionTime?: number;
    version?: string;
  };
}

/**
 * Campaign Response DTO
 */
export class CampaignResponseDto extends BaseResponseDto {
  @Expose()
  @Type(() => CampaignDataDto)
  data: CampaignDataDto;
}

export class CampaignDataDto {
  @Expose()
  @Type(() => CampaignDto)
  campaign: CampaignDto;

  @Expose()
  @Type(() => CampaignMetadataDto)
  metadata: CampaignMetadataDto;
}

export class CampaignDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string;

  @Expose()
  @IsEnum(['SINGLE', 'BULK', 'RECURRING', 'CONDITIONAL'])
  campaignType: string;

  @Expose()
  @IsEnum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED'])
  status: string;

  @Expose()
  @IsNumber()
  priority: number;

  @Expose()
  @IsDateString()
  @Transform(({ value }) => value?.toISOString())
  createdAt: string;

  @Expose()
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value?.toISOString())
  startDate?: string;

  @Expose()
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value?.toISOString())
  endDate?: string;

  @Expose()
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value?.toISOString())
  dueDate?: string;

  @Expose()
  @IsBoolean()
  autoAssignment: boolean;

  @Expose()
  @IsBoolean()
  allowLateSubmission: boolean;

  @Expose()
  @IsBoolean()
  sendReminders: boolean;

  @Expose()
  @IsNumber()
  totalTargets: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  completionRate?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  effectivenessScore?: number;

  @Expose()
  @IsOptional()
  @Type(() => UserDto)
  createdBy?: UserDto;

  @Expose()
  @IsOptional()
  @IsArray()
  @Type(() => CampaignResourceDto)
  campaignResources?: CampaignResourceDto[];

  @Expose()
  @IsOptional()
  @IsArray()
  @Type(() => CampaignTargetDto)
  campaignTargets?: CampaignTargetDto[];
}

export class CampaignMetadataDto {
  @Expose()
  @IsNumber()
  totalTargets: number;

  @Expose()
  @IsNumber()
  activeTargets: number;

  @Expose()
  @IsNumber()
  completedTargets: number;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  progressPercentage: number;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  overallEffectiveness: number;

  @Expose()
  @IsNumber()
  estimatedTotalTime: number; // minutos

  @Expose()
  @IsNumber()
  actualAverageTime: number; // minutos
}

/**
 * Campaign List Response DTO
 */
export class CampaignListResponseDto extends BaseResponseDto {
  @Expose()
  @Type(() => CampaignListDataDto)
  data: CampaignListDataDto;
}

export class CampaignListDataDto {
  @Expose()
  @IsArray()
  @Type(() => CampaignDto)
  campaigns: CampaignDto[];

  @Expose()
  @Type(() => PaginationDto)
  pagination: PaginationDto;

  @Expose()
  @Type(() => CampaignAggregationsDto)
  aggregations: CampaignAggregationsDto;
}

export class PaginationDto {
  @Expose()
  @IsNumber()
  page: number;

  @Expose()
  @IsNumber()
  limit: number;

  @Expose()
  @IsNumber()
  total: number;

  @Expose()
  @IsNumber()
  @Transform(({ obj }) => Math.ceil(obj.total / obj.limit))
  totalPages: number;
}

export class CampaignAggregationsDto {
  @Expose()
  @IsNumber()
  totalActive: number;

  @Expose()
  @IsNumber()
  totalCompleted: number;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  averageCompletionRate: number;

  @Expose()
  @IsNumber()
  totalTargetsAcrossAll: number;

  @Expose()
  @IsString()
  mostUsedResourceType: string;

  @Expose()
  @IsOptional()
  @Type(() => TopPerformingCampaignDto)
  topPerformingCampaign?: TopPerformingCampaignDto;
}

export class TopPerformingCampaignDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  effectivenessScore: number;
}

/**
 * Progress Response DTO
 */
export class ProgressResponseDto extends BaseResponseDto {
  @Expose()
  @Type(() => ProgressDataDto)
  data: ProgressDataDto;
}

export class ProgressDataDto {
  @Expose()
  @IsUUID()
  progressId: string;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  engagementScore: number;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  completionPercentage: number;

  @Expose()
  @IsNumber()
  timeSpent: number; // segundos

  @Expose()
  @IsOptional()
  @IsBoolean()
  campaignCompleted?: boolean;

  @Expose()
  @IsOptional()
  @IsArray()
  @Type(() => AchievementDto)
  achievements?: AchievementDto[];

  @Expose()
  @IsOptional()
  @IsArray()
  @Type(() => RecommendationDto)
  nextRecommendations?: RecommendationDto[];
}

/**
 * Dashboard Response DTO
 */
export class DashboardResponseDto extends BaseResponseDto {
  @Expose()
  @Type(() => DashboardDataDto)
  data: DashboardDataDto;
}

export class DashboardDataDto {
  @Expose()
  @IsArray()
  @Type(() => ActiveCampaignDto)
  activeCampaigns: ActiveCampaignDto[];

  @Expose()
  @IsArray()
  @Type(() => CompletedCampaignDto)
  completedCampaigns: CompletedCampaignDto[];

  @Expose()
  @IsArray()
  @Type(() => UpcomingDeadlineDto)
  upcomingDeadlines: UpcomingDeadlineDto[];

  @Expose()
  @IsArray()
  @Type(() => AchievementDto)
  achievements: AchievementDto[];

  @Expose()
  @Type(() => OverallStatsDto)
  overallStats: OverallStatsDto;
}

export class ActiveCampaignDto {
  @Expose()
  @IsUUID()
  campaignId: string;

  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value?.toISOString())
  dueDate?: string;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  progressPercentage: number;

  @Expose()
  @IsNumber()
  resourcesCompleted: number;

  @Expose()
  @IsNumber()
  resourcesTotal: number;

  @Expose()
  @IsNumber()
  estimatedTimeRemaining: number; // minutos

  @Expose()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  urgencyLevel: string;

  @Expose()
  @IsOptional()
  @Type(() => NextResourceDto)
  nextResource?: NextResourceDto;
}

export class NextResourceDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsString()
  type: string;

  @Expose()
  @IsNumber()
  estimatedTime: number; // minutos
}

export class CompletedCampaignDto {
  @Expose()
  @IsUUID()
  campaignId: string;

  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsDateString()
  @Transform(({ value }) => value?.toISOString())
  completedAt: string;

  @Expose()
  @IsNumber()
  totalTimeSpent: number; // minutos

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  avgRating: number;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  effectivenessScore: number;
}

export class UpcomingDeadlineDto {
  @Expose()
  @IsUUID()
  campaignId: string;

  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsDateString()
  @Transform(({ value }) => value?.toISOString())
  dueDate: string;

  @Expose()
  @IsNumber()
  daysRemaining: number;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  progressPercentage: number;

  @Expose()
  @IsBoolean()
  isOverdue: boolean;
}

export class AchievementDto {
  @Expose()
  @IsEnum(['COMPLETION', 'SPEED', 'ENGAGEMENT', 'QUALITY'])
  type: string;

  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsString()
  description: string;

  @Expose()
  @IsDateString()
  @Transform(({ value }) => value?.toISOString())
  earnedAt: string;

  @Expose()
  @IsString()
  icon: string;
}

export class OverallStatsDto {
  @Expose()
  @IsNumber()
  totalCampaignsAssigned: number;

  @Expose()
  @IsNumber()
  totalCampaignsCompleted: number;

  @Expose()
  @IsNumber()
  averageCompletionTime: number; // minutos

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  averageRating: number;

  @Expose()
  @IsNumber()
  totalTimeSpent: number; // minutos

  @Expose()
  @IsNumber()
  currentStreak: number; // días
}

/**
 * Analytics Response DTO
 */
export class AnalyticsResponseDto extends BaseResponseDto {
  @Expose()
  @Type(() => AnalyticsDataDto)
  data: AnalyticsDataDto;
}

export class AnalyticsDataDto {
  @Expose()
  @Type(() => AnalyticsOverviewDto)
  overview: AnalyticsOverviewDto;

  @Expose()
  @IsObject()
  trends: Record<string, any>;

  @Expose()
  @IsArray()
  @Type(() => TopPerformingCampaignDto)
  topPerformingCampaigns: TopPerformingCampaignDto[];

  @Expose()
  @IsArray()
  @Type(() => ResourceEffectivenessDto)
  resourceEffectiveness: ResourceEffectivenessDto[];

  @Expose()
  @IsOptional()
  @IsArray()
  timeSeriesData?: any[];

  @Expose()
  @IsOptional()
  @IsArray()
  campaignBreakdown?: any[];
}

export class AnalyticsOverviewDto {
  @Expose()
  @IsNumber()
  totalCampaigns: number;

  @Expose()
  @IsNumber()
  activeCampaigns: number;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  averageCompletionRate: number;

  @Expose()
  @IsNumber()
  totalParticipants: number;
}

export class ResourceEffectivenessDto {
  @Expose()
  @IsUUID()
  resourceId: string;

  @Expose()
  @IsString()
  resourceName: string;

  @Expose()
  @IsString()
  resourceType: string;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  completionRate: number;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  avgEngagementScore: number;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  avgRating: number;

  @Expose()
  @IsNumber()
  totalUsages: number;
}

/**
 * Report Response DTO
 */
export class ReportResponseDto extends BaseResponseDto {
  @Expose()
  @Type(() => ReportDataDto)
  data: ReportDataDto;

  @Expose()
  @Type(() => ReportMetadataDto)
  metadata: ReportMetadataDto;
}

export class ReportDataDto {
  @Expose()
  @Type(() => ReportSummaryDto)
  summary: ReportSummaryDto;

  @Expose()
  @IsArray()
  @Type(() => CampaignBreakdownDto)
  campaignBreakdown: CampaignBreakdownDto[];

  @Expose()
  @IsArray()
  @Type(() => RecommendationDto)
  recommendations: RecommendationDto[];

  @Expose()
  @Type(() => TrendsDto)
  trends: TrendsDto;
}

export class ReportSummaryDto {
  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  totalProgress: number;

  @Expose()
  @IsNumber()
  completedCampaigns: number;

  @Expose()
  @IsNumber()
  activeCampaigns: number;

  @Expose()
  @IsNumber()
  overdueCampaigns: number;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  averageEngagement: number;
}

export class RecommendationDto {
  @Expose()
  @IsEnum(['FOCUS_AREA', 'TIME_MANAGEMENT', 'RESOURCE_DIFFICULTY', 'ENGAGEMENT'])
  type: string;

  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsString()
  description: string;

  @Expose()
  @IsArray()
  @IsString({ each: true })
  actionItems: string[];

  @Expose()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  priority: string;
}

export class TrendsDto {
  @Expose()
  @IsEnum(['IMPROVING', 'STABLE', 'DECLINING'])
  engagementTrend: string;

  @Expose()
  @IsEnum(['IMPROVING', 'STABLE', 'DECLINING'])
  completionTrend: string;

  @Expose()
  @IsEnum(['IMPROVING', 'STABLE', 'DECLINING'])
  timeManagementTrend: string;
}

/**
 * Common DTOs used across responses
 */
export class UserDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @IsString()
  email: string;

  @Expose()
  @IsEnum(['admin', 'teacher', 'student', 'family'])
  role: string;

  @Expose()
  @IsOptional()
  @IsString()
  firstName?: string;

  @Expose()
  @IsOptional()
  @IsString()
  lastName?: string;
}

export class CampaignResourceDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @IsUUID()
  resourceId: string;

  @Expose()
  @IsBoolean()
  isRequired: boolean;

  @Expose()
  @IsNumber()
  orderIndex: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  estimatedTime?: number;

  @Expose()
  @IsOptional()
  @IsString()
  instructions?: string;

  @Expose()
  @IsOptional()
  @Type(() => ResourceDto)
  resource?: ResourceDto;
}

export class CampaignTargetDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @IsEnum(['INDIVIDUAL', 'CLASS', 'SUBJECT', 'GRADE_LEVEL', 'CUSTOM_GROUP'])
  targetType: string;

  @Expose()
  @IsUUID()
  targetId: string;

  @Expose()
  @IsOptional()
  @IsObject()
  targetMetadata?: Record<string, any>;

  @Expose()
  @IsOptional()
  @IsString()
  personalizedInstructions?: string;

  @Expose()
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value?.toISOString())
  customDueDate?: string;

  @Expose()
  @IsNumber()
  difficultyAdjustment: number;
}

export class ResourceDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsString()
  type: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string;

  @Expose()
  @IsOptional()
  @IsString()
  url?: string;
}

export class CampaignBreakdownDto {
  @Expose()
  @IsUUID()
  campaignId: string;

  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  progress: number;

  @Expose()
  @IsNumber()
  timeSpent: number;

  @Expose()
  @IsDateString()
  @Transform(({ value }) => value?.toISOString())
  lastActivity: string;

  @Expose()
  @IsEnum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'])
  status: string;

  @Expose()
  @IsArray()
  @Type(() => ResourceDetailDto)
  resourceDetails: ResourceDetailDto[];
}

export class ResourceDetailDto {
  @Expose()
  @IsUUID()
  resourceId: string;

  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsEnum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'])
  status: string;

  @Expose()
  @IsNumber()
  timeSpent: number;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  completionPercentage: number;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Math.round(value * 100) / 100)
  engagementScore: number;
}

export class ReportMetadataDto {
  @Expose()
  @IsDateString()
  timestamp: string;

  @Expose()
  @IsUUID()
  generatedBy: string;

  @Expose()
  @IsDateString()
  @Transform(({ value }) => value?.toISOString())
  generatedAt: string;

  @Expose()
  @IsEnum(['JSON', 'PDF', 'EXCEL'])
  format: string;

  @Expose()
  @IsNumber()
  userCount: number;

  @Expose()
  @IsNumber()
  campaignCount: number;
}