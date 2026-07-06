/**
 * @archivo: create-campaign.dto.ts
 * @módulo: Assignments - DTOs
 * @función: DTO para creación de campañas de asignación
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * DTO para validar y tipar datos de entrada para crear nuevas campañas.
 * Incluye validaciones estrictas y transformaciones de datos.
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.1
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
  IsDateString,
  Min,
  Max,
  ArrayMinSize,
  Length,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CampaignType } from '../entities/assignment-campaign.entity';
import { TargetType } from '../entities/campaign-target.entity';

/**
 * DTO para recursos incluidos en la campaña
 */
export class CampaignResourceDto {
  @IsUUID(4, { message: 'resourceId debe ser un UUID válido' })
  resourceId: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480) // Máximo 8 horas
  estimatedTime?: number; // minutos

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  instructions?: string;
}

/**
 * DTO para targets de la campaña
 */
export class CampaignTargetDto {
  @IsEnum(TargetType, { message: 'targetType debe ser un valor válido' })
  targetType: TargetType;

  @IsUUID(4, { message: 'targetId debe ser un UUID válido' })
  targetId: string;

  @IsOptional()
  @IsObject()
  targetMetadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  personalizedInstructions?: string;

  @IsOptional()
  @IsDateString()
  customDueDate?: string;

  @IsOptional()
  @IsInt({ message: 'difficultyAdjustment debe ser un número decimal entre 0.1 y 3.0' })
  @Min(0.1)
  @Max(3.0)
  @Transform(({ value }) => Number(value))
  difficultyAdjustment?: number = 1.0;
}

/**
 * DTO principal para crear campaña
 */
export class CreateCampaignDto {
  @IsString()
  @Length(1, 200, { message: 'El nombre debe tener entre 1 y 200 caracteres' })
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsOptional()
  @IsEnum(CampaignType, { message: 'campaignType debe ser un valor válido' })
  campaignType?: CampaignType = CampaignType.SINGLE;

  @IsArray({ message: 'resources debe ser un array' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un recurso' })
  @ValidateNested({ each: true })
  @Type(() => CampaignResourceDto)
  resources: CampaignResourceDto[];

  @IsArray({ message: 'targets debe ser un array' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un target' })
  @ValidateNested({ each: true })
  @Type(() => CampaignTargetDto)
  targets: CampaignTargetDto[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(-10)
  @Max(10)
  priority?: number = 0;

  @IsOptional()
  @IsBoolean()
  autoAssignment?: boolean = false;

  @IsOptional()
  @IsBoolean()
  allowLateSubmission?: boolean = true;

  @IsOptional()
  @IsBoolean()
  sendReminders?: boolean = true;

  // Metadatos adicionales para configuración avanzada
  @IsOptional()
  @IsObject()
  advancedConfig?: {
    requireAllResources?: boolean;
    allowSkipResources?: boolean;
    showProgressToTargets?: boolean;
    enablePeerReview?: boolean;
    customProgressWeights?: Record<string, number>;
  };

  // Configuración de notificaciones
  @IsOptional()
  @IsObject()
  notificationConfig?: {
    sendStartNotification?: boolean;
    sendReminderNotification?: boolean;
    reminderDaysBefore?: number;
    sendCompletionNotification?: boolean;
    notifyTeacherOnProgress?: boolean;
  };
}

/**
 * DTO para validación de recursos disponibles
 */
export class ValidateResourcesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(4, { each: true })
  resourceIds: string[];

  @IsUUID(4)
  userId: string;
}

/**
 * DTO para validación de targets disponibles
 */
export class ValidateTargetsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CampaignTargetDto)
  targets: CampaignTargetDto[];

  @IsUUID(4)
  userId: string;
}