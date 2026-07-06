/**
 * @archivo: integrations.dto.ts
 * @módulo: Assignments - DTOs
 * @función: DTOs para integraciones externas, webhooks y APIs
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * DTOs para integración con sistemas externos, webhooks, APIs de terceros,
 * sincronización de datos y comunicación entre servicios.
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
  Length,
  IsObject,
  IsEmail,
  IsUrl,
  Matches,
  IsJSON,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * DTO para webhook events
 */
export class WebhookEventDto {
  @IsString()
  @Length(1, 100)
  eventType: string; // campaign.created, progress.updated, etc.

  @IsUUID()
  eventId: string;

  @IsDateString()
  timestamp: string;

  @IsUUID()
  sourceId: string; // ID del objeto que generó el evento

  @IsEnum(['assignments', 'progress', 'campaigns', 'users'], {
    message: 'sourceType debe ser un valor válido',
  })
  sourceType: 'assignments' | 'progress' | 'campaigns' | 'users';

  @IsObject()
  payload: Record<string, any>;

  @IsOptional()
  @IsUUID()
  userId?: string; // Usuario que generó el evento

  @IsOptional()
  @IsString()
  @Length(1, 50)
  version?: string = '1.0';
}

/**
 * DTO para configuración de webhook
 */
export class WebhookConfigDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsUrl({}, { message: 'endpoint debe ser una URL válida' })
  endpoint: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'Debe suscribirse a al menos un evento' })
  events: string[]; // ['campaign.created', 'progress.updated', etc.]

  @IsOptional()
  @IsString()
  @Length(10, 100)
  secret?: string; // Para validar firma HMAC

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  retryAttempts?: number = 3;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(60000)
  timeoutMs?: number = 5000;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsObject()
  filters?: {
    campaignIds?: string[];
    userRoles?: string[];
    customFilters?: Record<string, any>;
  };
}

/**
 * DTO para sincronización con sistemas externos
 */
export class ExternalSyncDto {
  @IsEnum(['LMS', 'SIS', 'GOOGLE_CLASSROOM', 'MOODLE', 'CANVAS', 'CUSTOM'], {
    message: 'systemType debe ser un valor válido',
  })
  systemType: 'LMS' | 'SIS' | 'GOOGLE_CLASSROOM' | 'MOODLE' | 'CANVAS' | 'CUSTOM';

  @IsString()
  @Length(1, 200)
  systemName: string;

  @IsUrl()
  baseUrl: string;

  @IsObject()
  credentials: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    token?: string;
    customAuth?: Record<string, any>;
  };

  @IsArray()
  @IsString({ each: true })
  syncEntities: string[]; // ['campaigns', 'progress', 'users', 'grades']

  @IsOptional()
  @IsEnum(['REALTIME', 'SCHEDULED', 'MANUAL'], {
    message: 'syncMode debe ser un valor válido',
  })
  syncMode?: 'REALTIME' | 'SCHEDULED' | 'MANUAL' = 'SCHEDULED';

  @IsOptional()
  @IsString()
  @Matches(/^(\*\/\d+|\d+\-\d+\/\d+|\d+(,\d+)*|\*) (\*\/\d+|\d+\-\d+\/\d+|\d+(,\d+)*|\*) (\*\/\d+|\d+\-\d+\/\d+|\d+(,\d+)*|\*) (\*\/\d+|\d+\-\d+\/\d+|\d+(,\d+)*|\*) (\*\/\d+|\d+\-\d+\/\d+|\d+(,\d+)*|\*)$/, {
    message: 'schedule debe ser una expresión cron válida',
  })
  schedule?: string; // Expresión cron para syncMode SCHEDULED

  @IsOptional()
  @IsObject()
  mappingRules?: {
    fieldMappings?: Record<string, string>;
    valueTransformations?: Record<string, any>;
    filters?: Record<string, any>;
  };
}

/**
 * DTO para integración con Google Classroom
 */
export class GoogleClassroomIntegrationDto {
  @IsString()
  @Length(1, 100)
  courseId: string; // ID del curso en Google Classroom

  @IsOptional()
  @IsString()
  @Length(1, 200)
  courseName?: string;

  @IsArray()
  @IsUUID(4, { each: true })
  campaignIds: string[]; // Campañas a sincronizar

  @IsOptional()
  @IsBoolean()
  syncGrades?: boolean = true;

  @IsOptional()
  @IsBoolean()
  syncSubmissions?: boolean = true;

  @IsOptional()
  @IsBoolean()
  createAssignments?: boolean = true; // Crear tareas en Google Classroom

  @IsOptional()
  @IsObject()
  gradingConfig?: {
    pointsValue?: number;
    dueDate?: string;
    assigneeMode?: 'ALL_STUDENTS' | 'INDIVIDUAL_STUDENTS';
  };
}

/**
 * DTO para integración con Canvas LMS
 */
export class CanvasIntegrationDto {
  @IsNumber()
  courseId: number; // ID numérico del curso en Canvas

  @IsOptional()
  @IsString()
  @Length(1, 200)
  courseName?: string;

  @IsString()
  @Length(1, 100)
  canvasUrl: string; // URL base de Canvas

  @IsArray()
  @IsUUID(4, { each: true })
  campaignIds: string[];

  @IsOptional()
  @IsBoolean()
  syncGradebook?: boolean = true;

  @IsOptional()
  @IsBoolean()
  syncModules?: boolean = false;

  @IsOptional()
  @IsObject()
  assignmentConfig?: {
    assignmentGroupId?: number;
    pointsPossible?: number;
    submissionTypes?: string[];
    gradingType?: 'pass_fail' | 'percent' | 'letter_grade' | 'points';
  };
}

/**
 * DTO para integración con Moodle
 */
export class MoodleIntegrationDto {
  @IsNumber()
  courseId: number;

  @IsString()
  @Length(1, 200)
  moodleUrl: string;

  @IsString()
  @Length(1, 100)
  wsToken: string; // Web service token

  @IsArray()
  @IsUUID(4, { each: true })
  campaignIds: string[];

  @IsOptional()
  @IsBoolean()
  syncGrades?: boolean = true;

  @IsOptional()
  @IsBoolean()
  syncActivities?: boolean = true;

  @IsOptional()
  @IsString()
  @IsIn(['assign', 'quiz', 'forum', 'lesson'])
  activityType?: string = 'assign';
}

/**
 * DTO para exportación a sistemas externos
 */
export class ExternalExportDto {
  @IsEnum(['SCORM', 'QTI', 'CSV', 'JSON', 'XML'], {
    message: 'format debe ser un valor válido',
  })
  format: 'SCORM' | 'QTI' | 'CSV' | 'JSON' | 'XML';

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(4, { each: true })
  campaignIds: string[];

  @IsOptional()
  @IsObject()
  exportOptions?: {
    includeProgress?: boolean;
    includeMedia?: boolean;
    packageType?: 'SCORM_1_2' | 'SCORM_2004';
    compressionLevel?: number;
  };

  @IsOptional()
  @IsString()
  @Length(1, 100)
  customFilename?: string;
}

/**
 * DTO para importación desde sistemas externos
 */
export class ExternalImportDto {
  @IsEnum(['SCORM', 'QTI', 'CSV', 'JSON', 'XML', 'BLACKBOARD', 'BRIGHTSPACE'], {
    message: 'sourceFormat debe ser un valor válido',
  })
  sourceFormat: 'SCORM' | 'QTI' | 'CSV' | 'JSON' | 'XML' | 'BLACKBOARD' | 'BRIGHTSPACE';

  @IsString()
  @Length(1, 10000000) // 10MB máximo
  fileContent: string; // Base64 encoded

  @IsOptional()
  @IsObject()
  importOptions?: {
    preserveIds?: boolean;
    mapUsers?: boolean;
    createMissingUsers?: boolean;
    defaultRole?: string;
    skipInvalid?: boolean;
  };

  @IsOptional()
  @IsObject()
  fieldMappings?: Record<string, string>;
}

/**
 * DTO para notificaciones a sistemas externos
 */
export class ExternalNotificationDto {
  @IsEnum(['EMAIL', 'SMS', 'PUSH', 'SLACK', 'TEAMS', 'WEBHOOK'], {
    message: 'notificationType debe ser un valor válido',
  })
  notificationType: 'EMAIL' | 'SMS' | 'PUSH' | 'SLACK' | 'TEAMS' | 'WEBHOOK';

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  recipients: string[]; // Emails, phone numbers, webhook URLs, etc.

  @IsString()
  @Length(1, 200)
  subject: string;

  @IsString()
  @Length(1, 2000)
  message: string;

  @IsOptional()
  @IsObject()
  templateData?: Record<string, any>;

  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' = 'NORMAL';

  @IsOptional()
  @IsDateString()
  scheduledAt?: string; // Para notificaciones programadas

  @IsOptional()
  @IsObject()
  attachments?: Array<{
    filename: string;
    content: string; // Base64
    contentType: string;
  }>;
}

/**
 * DTO para API rate limiting
 */
export class RateLimitConfigDto {
  @IsString()
  @Length(1, 100)
  identifier: string; // IP, user ID, API key, etc.

  @IsInt()
  @Min(1)
  @Max(10000)
  requestsPerHour: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  burstLimit?: number; // Límite de ráfaga

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exemptEndpoints?: string[];

  @IsOptional()
  @IsObject()
  customRules?: {
    [endpoint: string]: {
      requestsPerHour: number;
      burstLimit?: number;
    };
  };
}

/**
 * DTO para autenticación de API externa
 */
export class ExternalAuthDto {
  @IsEnum(['API_KEY', 'OAUTH2', 'JWT', 'BASIC', 'CUSTOM'], {
    message: 'authType debe ser un valor válido',
  })
  authType: 'API_KEY' | 'OAUTH2' | 'JWT' | 'BASIC' | 'CUSTOM';

  @IsOptional()
  @IsString()
  @Length(1, 200)
  apiKey?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  clientId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  clientSecret?: string;

  @IsOptional()
  @IsUrl()
  authUrl?: string;

  @IsOptional()
  @IsUrl()
  tokenUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  accessToken?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  refreshToken?: string;

  @IsOptional()
  @IsDateString()
  tokenExpiry?: string;

  @IsOptional()
  @IsObject()
  customHeaders?: Record<string, string>;
}

/**
 * DTO para sincronización de estado
 */
export class SyncStatusDto {
  @IsUUID()
  syncId: string;

  @IsEnum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'], {
    message: 'status debe ser un valor válido',
  })
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

  @IsDateString()
  startedAt: string;

  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  progressPercentage: number;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  errorMessage?: string;

  @IsOptional()
  @IsObject()
  statistics?: {
    totalRecords?: number;
    processedRecords?: number;
    successfulRecords?: number;
    failedRecords?: number;
    skippedRecords?: number;
  };

  @IsOptional()
  @IsArray()
  logs?: Array<{
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
    details?: any;
  }>;
}