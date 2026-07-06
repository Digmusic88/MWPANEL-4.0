/**
 * @archivo: validation.dto.ts
 * @módulo: Assignments - DTOs
 * @función: DTOs especializados para validación y sanitización
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * DTOs especializados para validación de datos, sanitización de entrada,
 * transformaciones automáticas y validaciones de negocio complejas.
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
  IsPositive,
  IsIn,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { Type, Transform, Expose } from 'class-transformer';

/**
 * Validador personalizado para fechas de campaña
 */
export class DateValidationDto {
  @IsOptional()
  @IsDateString({}, { message: 'startDate debe ser una fecha válida en formato ISO' })
  @Transform(({ value }) => {
    if (value && typeof value === 'string') {
      const date = new Date(value);
      return date.toISOString();
    }
    return value;
  })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate debe ser una fecha válida en formato ISO' })
  @ValidateIf((o) => o.startDate !== undefined)
  @Transform(({ value, obj }) => {
    if (value && typeof value === 'string') {
      const date = new Date(value);
      const startDate = new Date(obj.startDate);
      if (date <= startDate) {
        throw new Error('endDate debe ser posterior a startDate');
      }
      return date.toISOString();
    }
    return value;
  })
  endDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dueDate debe ser una fecha válida en formato ISO' })
  @Transform(({ value }) => {
    if (value && typeof value === 'string') {
      const date = new Date(value);
      const now = new Date();
      if (date <= now) {
        throw new Error('dueDate debe ser una fecha futura');
      }
      return date.toISOString();
    }
    return value;
  })
  dueDate?: string;
}

/**
 * DTO para validación de recursos
 */
export class ResourceValidationDto {
  @IsUUID(4, { message: 'resourceId debe ser un UUID válido' })
  resourceId: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isRequired?: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'orderIndex debe ser un número positivo o cero' })
  @Max(1000, { message: 'orderIndex no puede ser mayor a 1000' })
  orderIndex?: number;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'estimatedTime debe ser al menos 1 minuto' })
  @Max(480, { message: 'estimatedTime no puede exceder 8 horas (480 minutos)' })
  estimatedTime?: number;

  @IsOptional()
  @IsString()
  @Length(0, 1000, { message: 'instructions no puede exceder 1000 caracteres' })
  @Transform(({ value }) => value?.trim())
  instructions?: string;
}

/**
 * DTO para validación de targets
 */
export class TargetValidationDto {
  @IsEnum(['INDIVIDUAL', 'CLASS', 'SUBJECT', 'GRADE_LEVEL', 'CUSTOM_GROUP'], {
    message: 'targetType debe ser un valor válido',
  })
  targetType: 'INDIVIDUAL' | 'CLASS' | 'SUBJECT' | 'GRADE_LEVEL' | 'CUSTOM_GROUP';

  @IsUUID(4, { message: 'targetId debe ser un UUID válido' })
  targetId: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TargetMetadataDto)
  targetMetadata?: TargetMetadataDto;

  @IsOptional()
  @IsString()
  @Length(0, 1000, { message: 'personalizedInstructions no puede exceder 1000 caracteres' })
  @Transform(({ value }) => value?.trim())
  personalizedInstructions?: string;

  @IsOptional()
  @IsDateString({}, { message: 'customDueDate debe ser una fecha válida' })
  customDueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1, { message: 'difficultyAdjustment debe ser al menos 0.1' })
  @Max(3.0, { message: 'difficultyAdjustment no puede exceder 3.0' })
  difficultyAdjustment?: number = 1.0;
}

export class TargetMetadataDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedParticipants?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  customProperties?: Record<string, any>;
}

/**
 * DTO para validación de filtros complejos
 */
export class FilterValidationDto {
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'search debe tener entre 1 y 100 caracteres' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  search?: string;

  @IsOptional()
  @IsArray()
  @IsIn(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED'], { each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  status?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un UUID' })
  @ArrayMaxSize(50, { message: 'No puede incluir más de 50 UUIDs' })
  userIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeValidationDto)
  dateRange?: DateRangeValidationDto;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'page debe ser al menos 1' })
  @Transform(({ value }) => parseInt(value, 10) || 1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'limit debe ser al menos 1' })
  @Max(100, { message: 'limit no puede exceder 100' })
  @Transform(({ value }) => parseInt(value, 10) || 20)
  limit?: number = 20;
}

export class DateRangeValidationDto {
  @IsOptional()
  @IsDateString({}, { message: 'start debe ser una fecha válida' })
  start?: string;

  @IsOptional()
  @IsDateString({}, { message: 'end debe ser una fecha válida' })
  @ValidateIf((o) => o.start !== undefined)
  @Transform(({ value, obj }) => {
    if (value && obj.start) {
      const endDate = new Date(value);
      const startDate = new Date(obj.start);
      if (endDate <= startDate) {
        throw new Error('Fecha end debe ser posterior a start');
      }
    }
    return value;
  })
  end?: string;
}

/**
 * DTO para validación de configuración avanzada
 */
export class AdvancedConfigValidationDto {
  @IsOptional()
  @IsBoolean()
  requireAllResources?: boolean = false;

  @IsOptional()
  @IsBoolean()
  allowSkipResources?: boolean = true;

  @ValidateIf((o) => o.allowSkipResources === true)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxSkippableResources?: number;

  @IsOptional()
  @IsBoolean()
  showProgressToTargets?: boolean = true;

  @IsOptional()
  @IsBoolean()
  enablePeerReview?: boolean = false;

  @ValidateIf((o) => o.enablePeerReview === true)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  minPeerReviewers?: number = 2;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ProgressWeightsDto)
  customProgressWeights?: ProgressWeightsDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttemptsPerResource?: number = 3;

  @IsOptional()
  @IsBoolean()
  allowRetakeCompleted?: boolean = false;
}

export class ProgressWeightsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  completionWeight?: number = 0.6;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  qualityWeight?: number = 0.3;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  timelinessWeight?: number = 0.1;

  @Transform(({ obj }) => {
    const total = (obj.completionWeight || 0.6) + (obj.qualityWeight || 0.3) + (obj.timelinessWeight || 0.1);
    if (Math.abs(total - 1.0) > 0.01) {
      throw new Error('Los pesos de progreso deben sumar 1.0');
    }
    return obj;
  })
  _validation?: any;
}

/**
 * DTO para validación de notificaciones
 */
export class NotificationConfigValidationDto {
  @IsOptional()
  @IsBoolean()
  sendStartNotification?: boolean = true;

  @IsOptional()
  @IsBoolean()
  sendReminderNotification?: boolean = true;

  @ValidateIf((o) => o.sendReminderNotification === true)
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'reminderDaysBefore debe ser al menos 1 día' })
  @Max(30, { message: 'reminderDaysBefore no puede exceder 30 días' })
  reminderDaysBefore?: number = 1;

  @IsOptional()
  @IsBoolean()
  sendCompletionNotification?: boolean = true;

  @IsOptional()
  @IsBoolean()
  notifyTeacherOnProgress?: boolean = false;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168) // 1 semana máximo
  escalateOverdueAfterDays?: number = 3;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayMaxSize(10, { message: 'No puede tener más de 10 emails de notificación' })
  customNotificationEmails?: string[];
}

/**
 * DTO para validación de datos de importación
 */
export class ImportValidationDto {
  @IsNotEmpty({ message: 'Los datos de importación no pueden estar vacíos' })
  @IsArray({ message: 'Los datos deben ser un array' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un elemento' })
  @ArrayMaxSize(1000, { message: 'No puede importar más de 1000 elementos a la vez' })
  @ValidateNested({ each: true })
  @Type(() => ImportRowDto)
  data: ImportRowDto[];

  @IsOptional()
  @IsBoolean()
  skipInvalidRows?: boolean = true;

  @IsOptional()
  @IsBoolean()
  validateOnly?: boolean = false;
}

export class ImportRowDto {
  @IsString()
  @Length(1, 200, { message: 'name debe tener entre 1 y 200 caracteres' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dueDate debe ser una fecha válida' })
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    return value;
  })
  targetIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    return value;
  })
  resourceIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(-10)
  @Max(10)
  @Transform(({ value }) => parseInt(value, 10) || 0)
  priority?: number = 0;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  sourceRow?: string; // Referencia a la fila original para debugging
}

/**
 * DTO para validación de exportación
 */
export class ExportValidationDto {
  @IsArray({ message: 'campaignIds debe ser un array' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos una campaña' })
  @ArrayMaxSize(100, { message: 'No puede exportar más de 100 campañas a la vez' })
  @IsUUID(4, { each: true, message: 'Cada campaignId debe ser un UUID válido' })
  campaignIds: string[];

  @IsEnum(['CSV', 'JSON', 'EXCEL', 'PDF'], { message: 'format debe ser CSV, JSON, EXCEL o PDF' })
  format: 'CSV' | 'JSON' | 'EXCEL' | 'PDF';

  @IsOptional()
  @IsArray()
  @IsIn(['basic', 'progress', 'targets', 'resources', 'analytics', 'comments'], { each: true })
  sections?: ('basic' | 'progress' | 'targets' | 'resources' | 'analytics' | 'comments')[] = ['basic', 'progress'];

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeValidationDto)
  dateRange?: DateRangeValidationDto;

  @IsOptional()
  @IsBoolean()
  includeArchived?: boolean = false;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'filename solo puede contener letras, números, guiones y guiones bajos' })
  customFilename?: string;
}