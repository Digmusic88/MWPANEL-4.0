import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsArray, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export enum ModerationAction {
  FLAG = 'flag',
  APPROVE = 'approve',
  REJECT = 'reject',
  DELETE = 'delete',
  WARN_USER = 'warn_user'
}

export enum ModerationReason {
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  VIOLENCE = 'violence',
  ADULT_CONTENT = 'adult_content',
  COPYRIGHT = 'copyright',
  FAKE_NEWS = 'fake_news',
  OTHER = 'other'
}

export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged'
}

export class CreateModerationReportDto {
  @ApiProperty({
    description: 'ID del apunte reportado',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  noteId: string;

  @ApiPropertyOptional({
    description: 'ID del comentario reportado (opcional, para reportes de comentarios específicos)',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  commentId?: string;

  @ApiProperty({
    description: 'Razón del reporte',
    enum: ModerationReason,
    example: ModerationReason.INAPPROPRIATE_CONTENT
  })
  @IsEnum(ModerationReason)
  reason: ModerationReason;

  @ApiPropertyOptional({
    description: 'Descripción adicional del reporte',
    example: 'Contiene lenguaje inapropiado para estudiantes'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'ID del usuario que reporta (opcional, puede ser anónimo)',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  reportedBy?: string;
}

export class ModerationActionDto {
  @ApiProperty({
    description: 'Acción de moderación a realizar',
    enum: ModerationAction,
    example: ModerationAction.APPROVE
  })
  @IsEnum(ModerationAction)
  action: ModerationAction;

  @ApiPropertyOptional({
    description: 'Comentarios del moderador',
    example: 'Contenido apropiado para el contexto educativo'
  })
  @IsOptional()
  @IsString()
  moderatorComments?: string;

  @ApiPropertyOptional({
    description: 'Notificar al autor sobre la acción',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  notifyAuthor?: boolean;
}

export class ModerationFiltersDto {
  @ApiPropertyOptional({
    description: 'Estado de moderación',
    enum: ModerationStatus
  })
  @IsOptional()
  @IsEnum(ModerationStatus)
  status?: ModerationStatus;

  @ApiPropertyOptional({
    description: 'Razón del reporte',
    enum: ModerationReason
  })
  @IsOptional()
  @IsEnum(ModerationReason)
  reason?: ModerationReason;

  @ApiPropertyOptional({
    description: 'ID del moderador asignado'
  })
  @IsOptional()
  @IsUUID()
  moderatorId?: string;

  @ApiPropertyOptional({
    description: 'Fecha desde (ISO string)',
    example: '2024-01-01T00:00:00Z'
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Fecha hasta (ISO string)',
    example: '2024-12-31T23:59:59Z'
  })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Página para paginación',
    example: 1,
    default: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Elementos por página',
    example: 20,
    default: 20
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class AutoModerationConfigDto {
  @ApiPropertyOptional({
    description: 'Habilitar moderación automática',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Lista de palabras prohibidas',
    example: ['palabra1', 'palabra2']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bannedWords?: string[];

  @ApiPropertyOptional({
    description: 'Lista de frases sospechosas',
    example: ['frase1', 'frase2']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suspiciousPhrases?: string[];

  @ApiPropertyOptional({
    description: 'Sensibilidad del filtro (1-10)',
    example: 5
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  sensitivity?: number;

  @ApiPropertyOptional({
    description: 'Auto-aprobar contenido de usuarios confiables',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  autoApproveTrustedUsers?: boolean;

  @ApiPropertyOptional({
    description: 'IDs de usuarios confiables',
    example: ['123e4567-e89b-12d3-a456-426614174000']
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  trustedUserIds?: string[];

  @ApiPropertyOptional({
    description: 'Notificar moderadores cuando se crean nuevos reportes',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  notifyModeratorsOnReport?: boolean;

  @ApiPropertyOptional({
    description: 'Notificar usuarios cuando se toman acciones sobre sus contenidos',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  notifyUsersOnAction?: boolean;

  @ApiPropertyOptional({
    description: 'Máximo de horas para moderación antes de auto-aprobar',
    example: 24
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  maxModerationHours?: number;
}

export class ModerationStatsDto {
  @ApiPropertyOptional({
    description: 'Período para estadísticas',
    enum: ['today', 'week', 'month', 'year'],
    example: 'month'
  })
  @IsOptional()
  @IsEnum(['today', 'week', 'month', 'year'])
  period?: string = 'month';
}