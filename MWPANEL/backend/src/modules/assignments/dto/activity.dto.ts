/**
 * @archivo: activity.dto.ts
 * @módulo: Assignments - DTOs
 * @función: DTOs para registro de actividad y tracking
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * DTOs específicos para operaciones de tracking de actividad, completado de recursos
 * y métricas de engagement. Validación estricta para datos críticos.
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.3
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsInt,
  IsNumber,
  IsDateString,
  Min,
  Max,
  ArrayMinSize,
  Length,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * Tipos de actividad soportados
 */
export enum ActivityType {
  VIEW = 'VIEW',
  DOWNLOAD = 'DOWNLOAD',
  INTERACTION = 'INTERACTION',
  TIME_SPENT = 'TIME_SPENT',
  COMPLETION = 'COMPLETION',
}

/**
 * DTO para datos de interacción específica
 */
export class InteractionDataDto {
  @IsString()
  @Length(1, 50)
  type: string; // click, scroll, hover, input, etc.

  @IsDateString()
  timestamp: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>; // Datos específicos de la interacción
}

/**
 * DTO para datos de actividad
 */
export class ActivityDataDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86400) // Máximo 24 horas
  duration?: number; // segundos

  @IsOptional()
  @IsInt()
  @Min(0)
  pageViews?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InteractionDataDto)
  interactions?: InteractionDataDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  completionPercentage?: number;

  @IsOptional()
  @IsObject()
  contextData?: Record<string, any>;
}

/**
 * DTO principal para registrar actividad
 */
export class RecordActivityDto {
  @IsUUID(4, { message: 'campaignId debe ser un UUID válido' })
  campaignId: string;

  @IsUUID(4, { message: 'resourceId debe ser un UUID válido' })
  resourceId: string;

  @IsEnum(ActivityType, { message: 'activityType debe ser un valor válido' })
  activityType: ActivityType;

  @ValidateNested()
  @Type(() => ActivityDataDto)
  activityData: ActivityDataDto;

  @IsOptional()
  @IsDateString()
  timestamp?: string;
}

/**
 * DTO para operaciones batch de actividades
 */
export class BatchActivityDto {
  @IsArray({ message: 'activities debe ser un array' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos una actividad' })
  @ValidateNested({ each: true })
  @Type(() => RecordActivityDto)
  activities: RecordActivityDto[];

  @IsOptional()
  @IsUUID(4)
  userId?: string; // Para admins que registran actividad de otros
}

/**
 * DTO para datos de completado
 */
export class CompletionDataDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  selfRating?: number; // 1-5

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  feedback?: string;

  @IsOptional()
  @IsBoolean()
  learningOutcomeAchieved?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficultyPerceived?: number; // 1-5

  @IsInt()
  @Min(0)
  timeSpent: number; // segundos totales

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  finalCompletionPercentage?: number;
}

/**
 * DTO para marcar completado
 */
export class MarkCompletionDto {
  @IsUUID(4, { message: 'campaignId debe ser un UUID válido' })
  campaignId: string;

  @IsUUID(4, { message: 'resourceId debe ser un UUID válido' })
  resourceId: string;

  @ValidateNested()
  @Type(() => CompletionDataDto)
  completionData: CompletionDataDto;
}

/**
 * DTO para métricas de progreso
 */
export class ProgressMetricsDto {
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  userIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  campaignIds?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  includeDetailedMetrics?: boolean = false;

  @IsOptional()
  @IsEnum(['day', 'week', 'month'], { message: 'groupBy debe ser day, week o month' })
  groupBy?: 'day' | 'week' | 'month' = 'day';
}

/**
 * DTO para configuración de alertas
 */
export class AlertThresholdsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168) // Máximo 1 semana
  overdueHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  minEngagementScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  completionPercentage?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(72) // Máximo 3 días
  reminderHours?: number;
}

/**
 * DTO para configuración de alertas
 */
export class AlertConfigDto {
  @IsUUID(4, { message: 'userId debe ser un UUID válido' })
  userId: string;

  @IsUUID(4, { message: 'campaignId debe ser un UUID válido' })
  campaignId: string;

  @IsEnum(['OVERDUE', 'LOW_ENGAGEMENT', 'COMPLETION_MILESTONE', 'TIME_REMINDER'], {
    message: 'alertType debe ser un valor válido',
  })
  alertType: 'OVERDUE' | 'LOW_ENGAGEMENT' | 'COMPLETION_MILESTONE' | 'TIME_REMINDER';

  @ValidateNested()
  @Type(() => AlertThresholdsDto)
  thresholds: AlertThresholdsDto;

  @IsArray()
  @IsEnum(['EMAIL', 'IN_APP', 'PUSH'], { each: true })
  notificationMethods: ('EMAIL' | 'IN_APP' | 'PUSH')[];

  @IsBoolean()
  isActive: boolean = true;
}

/**
 * DTO para reporte detallado
 */
export class DetailedReportDto {
  @IsArray({ message: 'userIds debe ser un array' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un usuario' })
  @IsUUID(4, { each: true })
  userIds: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  campaignIds?: string[];

  @IsOptional()
  @IsObject()
  dateRange?: {
    start: Date;
    end: Date;
  };

  @IsOptional()
  @IsBoolean()
  includeRecommendations?: boolean = true;

  @IsOptional()
  @IsEnum(['JSON', 'PDF', 'EXCEL'], { message: 'reportFormat debe ser JSON, PDF o EXCEL' })
  reportFormat?: 'JSON' | 'PDF' | 'EXCEL' = 'JSON';
}