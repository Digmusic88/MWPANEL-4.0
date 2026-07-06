/**
 * @archivo: report.dto.ts
 * @módulo: Student Reports - DTOs de Informes
 * @función: Validación para creación/edición de informes cualitativos
 */

import { IsUUID, IsString, IsOptional, IsInt, IsBoolean, Min, Max, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para crear un informe cualitativo
 * El profesor escribe MANUALMENTE la etiqueta de contexto
 */
export class CreateQualitativeReportDto {
  @ApiProperty({ description: 'ID del estudiante' })
  @IsUUID()
  studentId: string;

  @ApiProperty({
    description: 'Etiqueta de contexto MANUAL (ej: "Matemáticas", "Inglés", "Comportamiento")',
    example: 'Matemáticas'
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  contextTag: string;

  @ApiProperty({ description: 'Contenido del informe (texto enriquecido)' })
  @IsString()
  @MinLength(10)
  content: string;

  @ApiPropertyOptional({
    description: 'Prioridad: 1=info, 2=normal, 3=importante, 4=urgente',
    default: 2
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Si el informe es visible para la familia',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  visibleToFamily?: boolean;

  @ApiPropertyOptional({ description: 'ID del año académico (si no se especifica, usa el activo)' })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;
}

/**
 * DTO para actualizar un informe existente
 */
export class UpdateQualitativeReportDto {
  @ApiPropertyOptional({ description: 'Etiqueta de contexto' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  contextTag?: string;

  @ApiPropertyOptional({ description: 'Contenido del informe' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  content?: string;

  @ApiPropertyOptional({ description: 'Prioridad' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  priority?: number;

  @ApiPropertyOptional({ description: 'Visible para familia' })
  @IsOptional()
  @IsBoolean()
  visibleToFamily?: boolean;
}

/**
 * DTO para consultar informes con filtros
 */
export class QueryReportsDto {
  @ApiPropertyOptional({ description: 'Filtrar por estudiante' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por autor (profesor)' })
  @IsOptional()
  @IsUUID()
  authorTeacherId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por año académico' })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por etiqueta de contexto' })
  @IsOptional()
  @IsString()
  contextTag?: string;

  @ApiPropertyOptional({ description: 'Filtrar por prioridad mínima' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  minPriority?: number;
}

/**
 * Etiquetas de contexto predefinidas (sugerencias para el profesor)
 */
export const PREDEFINED_CONTEXT_TAGS = [
  'Matemáticas',
  'Lengua Castellana',
  'Inglés',
  'Ciencias Naturales',
  'Ciencias Sociales',
  'Educación Física',
  'Música',
  'Plástica',
  'Tecnología',
  'Religión/Valores',
  'Francés',
  'Tutoría',
  'Comportamiento General',
  'Participación en Clase',
  'Trabajo en Equipo',
  'Otro',
];
