/**
 * @archivo: update-campaign.dto.ts
 * @módulo: Assignments - DTOs
 * @función: DTO para actualización de campañas de asignación
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * DTO para validar y tipar datos de entrada para actualizar campañas existentes.
 * Campos opcionales para actualizaciones parciales.
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.1
 */

import { PartialType, OmitType } from '@nestjs/mapped-types';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsBoolean,
  IsInt,
  IsDateString,
  Min,
  Max,
  Length,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCampaignDto, CampaignResourceDto, CampaignTargetDto } from './create-campaign.dto';
import { CampaignStatus } from '../entities/assignment-campaign.entity';

/**
 * DTO principal para actualizar campaña
 * Hereda de CreateCampaignDto pero hace todos los campos opcionales
 */
export class UpdateCampaignDto extends PartialType(
  OmitType(CreateCampaignDto, ['resources', 'targets'] as const)
) {
  @IsOptional()
  @IsEnum(CampaignStatus, { message: 'status debe ser un valor válido' })
  status?: CampaignStatus;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  statusReason?: string; // Razón del cambio de estado

  // Para actualizaciones de recursos y targets se usan endpoints separados
  // para mejor control y validación
}

/**
 * DTO para actualización de estado de campaña
 */
export class UpdateCampaignStatusDto {
  @IsEnum(CampaignStatus, { message: 'status debe ser un valor válido' })
  status: CampaignStatus;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  reason?: string;

  @IsOptional()
  @IsBoolean()
  notifyTargets?: boolean = true;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string; // Fecha efectiva del cambio
}

/**
 * DTO para agregar recursos a campaña
 */
export class AddResourcesToCampaignDto {
  @IsArray({ message: 'resources debe ser un array' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un recurso' })
  @ValidateNested({ each: true })
  @Type(() => CampaignResourceDto)
  resources: CampaignResourceDto[];

  @IsOptional()
  @IsBoolean()
  preserveOrder?: boolean = false;

  @IsOptional()
  @IsBoolean()
  notifyTargets?: boolean = true;
}

/**
 * DTO para actualizar recurso específico en campaña
 */
export class UpdateCampaignResourceDto extends PartialType(CampaignResourceDto) {
  @IsOptional()
  @IsString()
  @Length(0, 500)
  updateReason?: string;
}

/**
 * DTO para agregar targets a campaña
 */
export class AddTargetsToCampaignDto {
  @IsArray({ message: 'targets debe ser un array' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un target' })
  @ValidateNested({ each: true })
  @Type(() => CampaignTargetDto)
  targets: CampaignTargetDto[];

  @IsOptional()
  @IsBoolean()
  createProgressRecords?: boolean = true;

  @IsOptional()
  @IsBoolean()
  notifyNewTargets?: boolean = true;
}

/**
 * DTO para actualizar target específico en campaña
 */
export class UpdateCampaignTargetDto extends PartialType(CampaignTargetDto) {
  @IsOptional()
  @IsString()
  @Length(0, 500)
  updateReason?: string;

  @IsOptional()
  @IsBoolean()
  notifyTarget?: boolean = true;
}

/**
 * DTO para configuración avanzada de campaña
 */
export class UpdateCampaignConfigDto {
  @IsOptional()
  @IsObject()
  advancedConfig?: {
    requireAllResources?: boolean;
    allowSkipResources?: boolean;
    showProgressToTargets?: boolean;
    enablePeerReview?: boolean;
    customProgressWeights?: Record<string, number>;
    maxAttemptsPerResource?: number;
    allowRetakeCompleted?: boolean;
  };

  @IsOptional()
  @IsObject()
  notificationConfig?: {
    sendStartNotification?: boolean;
    sendReminderNotification?: boolean;
    reminderDaysBefore?: number;
    sendCompletionNotification?: boolean;
    notifyTeacherOnProgress?: boolean;
    escalateOverdueAfterDays?: number;
  };

  @IsOptional()
  @IsObject()
  analyticsConfig?: {
    trackDetailedEngagement?: boolean;
    enableHeatmaps?: boolean;
    collectFeedback?: boolean;
    generateInsights?: boolean;
  };
}

/**
 * DTO for bulk operations
 */
export class BulkUpdateCampaignsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  campaignIds: string[];

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsBoolean()
  sendReminders?: boolean;

  @IsOptional()
  @IsInt()
  @Min(-10)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  bulkUpdateReason?: string;

  @IsOptional()
  @IsBoolean()
  notifyTargets?: boolean = false;
}