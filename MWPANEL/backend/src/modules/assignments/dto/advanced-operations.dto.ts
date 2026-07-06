/**
 * @archivo: advanced-operations.dto.ts
 * @módulo: Assignments - DTOs
 * @función: DTOs para operaciones avanzadas del sistema de asignaciones
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * DTOs para operaciones complejas: clonación de campañas, operaciones masivas,
 * exportación de datos, configuraciones avanzadas y automatizaciones.
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.4
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
  ArrayMaxSize,
  Length,
  IsObject,
  IsEmail,
  IsUrl,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CampaignType } from '../entities/assignment-campaign.entity';
import { TargetType } from '../entities/campaign-target.entity';

/**
 * DTO para clonación de campañas
 */
export class CloneCampaignDto {
  @IsString()
  @Length(1, 200, { message: 'El nuevo nombre debe tener entre 1 y 200 caracteres' })
  newName: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  newDescription?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  newTargetIds?: string[]; // Cambiar targets en la clonación

  @IsOptional()
  @IsDateString()
  newStartDate?: string;

  @IsOptional()
  @IsDateString()
  newEndDate?: string;

  @IsOptional()
  @IsDateString()
  newDueDate?: string;

  @IsOptional()
  @IsBoolean()
  cloneProgress?: boolean = false; // Si clonar progreso existente

  @IsOptional()
  @IsBoolean()
  cloneTargets?: boolean = true; // Si clonar targets originales

  @IsOptional()
  @IsBoolean()
  cloneResources?: boolean = true; // Si clonar recursos originales

  @IsOptional()
  @IsBoolean()
  autoActivate?: boolean = false; // Si activar automáticamente
}

/**
 * DTO para importación de campañas desde archivo
 */
export class ImportCampaignsDto {
  @IsEnum(['CSV', 'JSON', 'EXCEL'], { message: 'Formato debe ser CSV, JSON o EXCEL' })
  format: 'CSV' | 'JSON' | 'EXCEL';

  @IsString()
  @Length(1, 10000000) // 10MB máximo como string base64
  fileContent: string; // Contenido del archivo codificado

  @IsOptional()
  @IsObject()
  mappingConfig?: {
    nameColumn?: string;
    descriptionColumn?: string;
    dueDateColumn?: string;
    targetColumn?: string;
    resourceColumn?: string;
  };

  @IsOptional()
  @IsBoolean()
  skipErrors?: boolean = true; // Continuar si hay errores en algunas filas

  @IsOptional()
  @IsBoolean()
  validateOnly?: boolean = false; // Solo validar, no importar
}

/**
 * DTO para exportación de datos
 */
export class ExportCampaignsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(4, { each: true })
  campaignIds: string[];

  @IsEnum(['CSV', 'JSON', 'EXCEL', 'PDF'], { message: 'Formato debe ser CSV, JSON, EXCEL o PDF' })
  format: 'CSV' | 'JSON' | 'EXCEL' | 'PDF';

  @IsOptional()
  @IsBoolean()
  includeProgress?: boolean = true;

  @IsOptional()
  @IsBoolean()
  includeTargets?: boolean = true;

  @IsOptional()
  @IsBoolean()
  includeResources?: boolean = true;

  @IsOptional()
  @IsBoolean()
  includeAnalytics?: boolean = false;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customFields?: string[]; // Campos personalizados a incluir
}

/**
 * DTO para configuración de notificaciones automáticas
 */
export class AutoNotificationConfigDto {
  @IsUUID(4)
  campaignId: string;

  @IsOptional()
  @IsBoolean()
  enableStartNotifications?: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(72)
  reminderHoursBeforeDue?: number = 24;

  @IsOptional()
  @IsBoolean()
  enableOverdueNotifications?: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  overdueEscalationHours?: number = 48;

  @IsOptional()
  @IsBoolean()
  enableCompletionNotifications?: boolean = true;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  customRecipients?: string[]; // Emails adicionales para notificaciones

  @IsOptional()
  @IsObject()
  templateConfig?: {
    subject?: string;
    customMessage?: string;
    includeProgress?: boolean;
    includeResources?: boolean;
  };
}

/**
 * DTO para configuración de auto-asignación
 */
export class AutoAssignmentConfigDto {
  @IsString()
  @Length(1, 100)
  ruleName: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsEnum(['USER_ENROLLMENT', 'CLASS_CREATION', 'SUBJECT_ASSIGNMENT', 'PERIODIC'], {
    message: 'Trigger debe ser un valor válido',
  })
  trigger: 'USER_ENROLLMENT' | 'CLASS_CREATION' | 'SUBJECT_ASSIGNMENT' | 'PERIODIC';

  @IsObject()
  conditions: {
    userRole?: ('student' | 'teacher')[];
    classIds?: string[];
    subjectIds?: string[];
    gradeLevel?: string[];
    customCriteria?: Record<string, any>;
  };

  @IsUUID(4)
  templateCampaignId: string; // Campaña plantilla para clonar

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(1)
  priority?: number = 5; // Prioridad de la regla (1-10)
}

/**
 * DTO para análisis de efectividad de recursos
 */
export class ResourceEffectivenessAnalysisDto {
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  resourceIds?: string[]; // Si no se especifica, analiza todos

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  campaignIds?: string[]; // Limitar a campañas específicas

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metrics?: string[]; // ['completion_rate', 'engagement_score', 'time_spent', 'rating']

  @IsOptional()
  @IsEnum(['resource', 'campaign', 'user_role', 'time_period'], {
    message: 'groupBy debe ser un valor válido',
  })
  groupBy?: 'resource' | 'campaign' | 'user_role' | 'time_period' = 'resource';

  @IsOptional()
  @IsBoolean()
  includeRecommendations?: boolean = true;
}

/**
 * DTO para configuración de escalamiento automático
 */
export class AutoEscalationConfigDto {
  @IsUUID(4)
  campaignId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscalationRuleDto)
  rules: EscalationRuleDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class EscalationRuleDto {
  @IsInt()
  @Min(1)
  @Max(168) // Máximo 1 semana
  hoursAfterDue: number;

  @IsEnum(['EMAIL', 'IN_APP', 'SMS', 'WEBHOOK'], { message: 'actionType debe ser un valor válido' })
  actionType: 'EMAIL' | 'IN_APP' | 'SMS' | 'WEBHOOK';

  @IsArray()
  @IsEmail({}, { each: true })
  recipients: string[]; // Emails o IDs a notificar

  @IsOptional()
  @IsString()
  @Length(0, 500)
  customMessage?: string;

  @IsOptional()
  @IsUrl()
  webhookUrl?: string; // Para actionType WEBHOOK
}

/**
 * DTO para configuración de gamificación
 */
export class GamificationConfigDto {
  @IsUUID(4)
  campaignId: string;

  @IsOptional()
  @IsBoolean()
  enablePoints?: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  pointsPerCompletion?: number = 10;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  bonusPointsForEarlyCompletion?: number = 5;

  @IsOptional()
  @IsBoolean()
  enableBadges?: boolean = true;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BadgeConfigDto)
  customBadges?: BadgeConfigDto[];

  @IsOptional()
  @IsBoolean()
  enableLeaderboard?: boolean = true;

  @IsOptional()
  @IsEnum(['CAMPAIGN', 'CLASS', 'SCHOOL'], { message: 'leaderboardScope debe ser un valor válido' })
  leaderboardScope?: 'CAMPAIGN' | 'CLASS' | 'SCHOOL' = 'CAMPAIGN';
}

export class BadgeConfigDto {
  @IsString()
  @Length(1, 50)
  name: string;

  @IsString()
  @Length(0, 200)
  description: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+\.(png|jpg|svg)$/, { message: 'Icon debe ser un archivo de imagen válido' })
  iconUrl: string;

  @IsObject()
  criteria: {
    completionRate?: number; // Porcentaje mínimo
    timeLimit?: number; // Completar en X horas
    consecutiveDays?: number; // Días consecutivos
    perfectScore?: boolean; // Puntuación perfecta
  };
}

/**
 * DTO para configuración de IA/ML
 */
export class AIRecommendationConfigDto {
  @IsOptional()
  @IsBoolean()
  enablePersonalizedRecommendations?: boolean = true;

  @IsOptional()
  @IsBoolean()
  enableDifficultyAdjustment?: boolean = true;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(3.0)
  maxDifficultyMultiplier?: number = 2.0;

  @IsOptional()
  @IsBoolean()
  enableContentSuggestions?: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxSuggestions?: number = 5;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mlFeatures?: string[]; // ['completion_time', 'engagement_score', 'previous_performance']
}

/**
 * DTO para configuración de backup y archivado
 */
export class ArchiveConfigDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(4, { each: true })
  campaignIds: string[];

  @IsOptional()
  @IsDateString()
  archiveAfterDate?: string; // Archivar campañas después de esta fecha

  @IsOptional()
  @IsBoolean()
  preserveProgress?: boolean = true;

  @IsOptional()
  @IsBoolean()
  preserveAnalytics?: boolean = true;

  @IsOptional()
  @IsEnum(['COLD_STORAGE', 'COMPRESSED', 'DELETED'], { message: 'storageType debe ser un valor válido' })
  storageType?: 'COLD_STORAGE' | 'COMPRESSED' | 'DELETED' = 'COLD_STORAGE';

  @IsOptional()
  @IsString()
  @Length(0, 500)
  reason?: string;
}