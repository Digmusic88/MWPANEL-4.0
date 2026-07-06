import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsBoolean, IsNumber, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityValuationType } from '../entities/activity.entity';

export class DuplicateActivityDto {
  @ApiProperty({ description: 'Nuevo nombre de la actividad', example: 'Ejercicios de matemáticas - Copia' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Nueva descripción de la actividad' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Nueva fecha de asignación', example: '2025-01-16' })
  @IsDateString()
  assignedDate: string;

  @ApiPropertyOptional({ description: 'Nueva fecha de revisión opcional', example: '2025-01-21' })
  @IsOptional()
  @IsDateString()
  reviewDate?: string;

  @ApiPropertyOptional({ description: 'Nuevo ID del grupo de clase (opcional, usa el mismo por defecto)' })
  @IsOptional()
  @IsString()
  classGroupId?: string;

  @ApiPropertyOptional({ description: 'Nuevo ID de la asignación de asignatura (opcional, usa el mismo por defecto)' })
  @IsOptional()
  @IsString()
  subjectAssignmentId?: string;

  @ApiPropertyOptional({ 
    description: 'Nuevo tipo de valoración (opcional, usa el mismo por defecto)', 
    enum: ActivityValuationType
  })
  @IsOptional()
  @IsEnum(ActivityValuationType)
  valuationType?: ActivityValuationType;

  @ApiPropertyOptional({ 
    description: 'Nueva puntuación máxima (opcional, usa la misma por defecto)',
    minimum: 1,
    maximum: 100 
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxScore?: number;

  @ApiPropertyOptional({ description: 'Configuración de notificación a familias (opcional, usa la misma por defecto)' })
  @IsOptional()
  @IsBoolean()
  notifyFamilies?: boolean;

  @ApiPropertyOptional({ description: 'Notificar cuando el emoji sea happy (opcional, usa la misma por defecto)' })
  @IsOptional()
  @IsBoolean()
  notifyOnHappy?: boolean;

  @ApiPropertyOptional({ description: 'Notificar cuando el emoji sea neutral (opcional, usa la misma por defecto)' })
  @IsOptional()
  @IsBoolean()
  notifyOnNeutral?: boolean;

  @ApiPropertyOptional({ description: 'Notificar cuando el emoji sea sad (opcional, usa la misma por defecto)' })
  @IsOptional()
  @IsBoolean()
  notifyOnSad?: boolean;

  @ApiPropertyOptional({ description: 'Nuevos IDs de estudiantes específicos (opcional, usa los mismos por defecto)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetStudentIds?: string[];

  @ApiPropertyOptional({ description: 'Guardar como plantilla reutilizable', default: false })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;
}