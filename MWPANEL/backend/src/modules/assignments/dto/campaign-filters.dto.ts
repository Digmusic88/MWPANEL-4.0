/**
 * @archivo: campaign-filters.dto.ts
 * @módulo: Assignments - DTOs
 * @función: DTO para filtros de búsqueda de campañas
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * DTO para validar y tipar filtros de búsqueda y paginación de campañas.
 * Soporta filtros complejos y múltiples criterios de ordenamiento.
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.1
 */

import {
  IsOptional,
  IsEnum,
  IsString,
  IsUUID,
  IsArray,
  IsBoolean,
  IsInt,
  IsDateString,
  Min,
  Max,
  IsIn,
  Length,
  IsNumberString,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CampaignType, CampaignStatus } from '../entities/assignment-campaign.entity';
import { TargetType } from '../entities/campaign-target.entity';

/**
 * DTO para rango de fechas
 */
export class DateRangeDto {
  @IsOptional()
  @IsDateString()
  start?: string;

  @IsOptional()
  @IsDateString()
  end?: string;
}

/**
 * DTO para filtros de progreso
 */
export class ProgressFiltersDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  minCompletionRate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  maxCompletionRate?: number;

  @IsOptional()
  @IsBoolean()
  hasOverdueTargets?: boolean;

  @IsOptional()
  @IsBoolean()
  hasInactiveTargets?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minTotalTargets?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxTotalTargets?: number;
}

/**
 * DTO principal para filtros de campaña
 */
export class CampaignFiltersDto {
  // === FILTROS BÁSICOS ===
  
  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string; // Búsqueda en nombre y descripción

  @IsOptional()
  @IsArray()
  @IsEnum(CampaignStatus, { each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  status?: CampaignStatus[];

  @IsOptional()
  @IsArray()
  @IsEnum(CampaignType, { each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  campaignType?: CampaignType[];

  @IsOptional()
  @IsUUID(4)
  createdById?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  createdByIds?: string[];

  // === FILTROS DE FECHAS ===
  
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  createdAt?: DateRangeDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  startDate?: DateRangeDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dueDate?: DateRangeDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isExpired?: boolean;

  @IsOptional()
  @IsBoolean()
  isDueSoon?: boolean; // Próximas a vencer (próximos 7 días)

  // === FILTROS DE TARGET ===
  
  @IsOptional()
  @IsEnum(TargetType)
  targetType?: TargetType;

  @IsOptional()
  @IsUUID(4)
  targetId?: string; // Filtrar campañas que incluyan este target específico

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  targetIds?: string[];

  @IsOptional()
  @IsUUID(4)
  hasStudentTarget?: string; // Campañas que incluyan este estudiante (directa o por clase)

  @IsOptional()
  @IsUUID(4)
  hasClassTarget?: string; // Campañas dirigidas a esta clase

  // === FILTROS DE RECURSOS ===
  
  @IsOptional()
  @IsUUID(4)
  resourceId?: string; // Campañas que incluyan este recurso

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  resourceIds?: string[];

  @IsOptional()
  @IsString()
  resourceType?: string; // PDF, VIDEO, etc.

  @IsOptional()
  @IsUUID(4)
  subjectId?: string; // Campañas con recursos de esta materia

  // === FILTROS DE PROGRESO ===
  
  @IsOptional()
  @ValidateNested()
  @Type(() => ProgressFiltersDto)
  progress?: ProgressFiltersDto;

  // === FILTROS DE PRIORIDAD ===
  
  @IsOptional()
  @IsInt()
  @Min(-10)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsInt()
  @Min(-10)
  @Max(10)
  minPriority?: number;

  @IsOptional()
  @IsInt()
  @Min(-10)
  @Max(10)
  maxPriority?: number;

  // === FILTROS BOOLEANOS ===
  
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  autoAssignment?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  allowLateSubmission?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  sendReminders?: boolean;

  // === FILTROS DE EFECTIVIDAD ===
  
  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => Number(value))
  minEffectivenessScore?: number;

  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => Number(value))
  maxEffectivenessScore?: number;

  // === PAGINACIÓN ===
  
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // === ORDENAMIENTO ===
  
  @IsOptional()
  @IsIn([
    'createdAt', 'updatedAt', 'name', 'startDate', 'dueDate', 'status',
    'priority', 'totalTargets', 'completionRate', 'effectivenessScore'
  ])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  additionalSort?: string[]; // Para ordenamiento secundario

  // === CONFIGURACIONES DE RESPUESTA ===
  
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeTargets?: boolean = false;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeResources?: boolean = false;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeProgress?: boolean = false;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAnalytics?: boolean = false;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeCreator?: boolean = false;
}

/**
 * DTO para filtros específicos de dashboard
 */
export class DashboardCampaignFiltersDto {
  @IsOptional()
  @IsUUID(4)
  userId?: string;

  @IsOptional()
  @IsIn(['my-campaigns', 'assigned-to-me', 'overdue', 'due-soon', 'recent'])
  dashboardView?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  dueSoonDays?: number = 7;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @IsOptional()
  @IsBoolean()
  onlyActive?: boolean = true;
}

/**
 * DTO para filtros de analytics
 */
export class AnalyticsCampaignFiltersDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  campaignIds?: string[];

  @IsOptional()
  @IsUUID(4)
  createdById?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(CampaignType, { each: true })
  campaignTypes?: CampaignType[];

  @IsOptional()
  @IsBoolean()
  includeDetailed?: boolean = false;

  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly'])
  granularity?: 'daily' | 'weekly' | 'monthly' = 'daily';
}