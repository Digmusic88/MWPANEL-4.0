/**
 * @dto: DuaProfileDto
 * @module: DUA
 * @description: DTOs para gestión de perfiles DUA (Diseño Universal para el Aprendizaje)
 * @features: Validación completa, swagger docs, transformaciones
 */

import { IsUUID, IsOptional, IsArray, IsObject, IsBoolean, IsString, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

/**
 * DTO para estilos de aprendizaje
 */
export class LearningStylesDto {
  @ApiPropertyOptional({ description: 'Nivel de preferencia visual (low, medium, high)' })
  @IsOptional()
  @IsString()
  visual?: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({ description: 'Nivel de preferencia auditiva (low, medium, high)' })
  @IsOptional()
  @IsString()
  auditory?: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({ description: 'Nivel de preferencia kinestésica (low, medium, high)' })
  @IsOptional()
  @IsString()
  kinesthetic?: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({ description: 'Nivel de preferencia lectura/escritura (low, medium, high)' })
  @IsOptional()
  @IsString()
  readingWriting?: 'low' | 'medium' | 'high';
}

/**
 * DTO para inteligencias múltiples
 */
export class MultipleIntelligencesDto {
  @ApiPropertyOptional({ description: 'Inteligencia lingüística (low, medium, high)' })
  @IsOptional()
  @IsString()
  linguistic?: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({ description: 'Inteligencia lógico-matemática (low, medium, high)' })
  @IsOptional()
  @IsString()
  logicalMathematical?: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({ description: 'Inteligencia espacial (low, medium, high)' })
  @IsOptional()
  @IsString()
  spatial?: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({ description: 'Inteligencia corporal-kinestésica (low, medium, high)' })
  @IsOptional()
  @IsString()
  bodilyKinesthetic?: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({ description: 'Inteligencia musical (low, medium, high)' })
  @IsOptional()
  @IsString()
  musical?: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({ description: 'Inteligencia interpersonal (low, medium, high)' })
  @IsOptional()
  @IsString()
  interpersonal?: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({ description: 'Inteligencia intrapersonal (low, medium, high)' })
  @IsOptional()
  @IsString()
  intrapersonal?: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({ description: 'Inteligencia naturalista (low, medium, high)' })
  @IsOptional()
  @IsString()
  naturalistic?: 'low' | 'medium' | 'high';
}

/**
 * DTO para crear un perfil DUA
 */
export class CreateDuaProfileDto {
  @ApiProperty({ description: 'ID del estudiante' })
  @IsUUID()
  studentId: string;

  @ApiPropertyOptional({ 
    description: 'Estilos de aprendizaje del estudiante',
    type: LearningStylesDto 
  })
  @IsOptional()
  @IsObject()
  @Type(() => LearningStylesDto)
  learningStyles?: LearningStylesDto;

  @ApiPropertyOptional({ 
    description: 'Inteligencias múltiples del estudiante',
    type: MultipleIntelligencesDto 
  })
  @IsOptional()
  @IsObject()
  @Type(() => MultipleIntelligencesDto)
  multipleIntelligences?: MultipleIntelligencesDto;

  @ApiPropertyOptional({ 
    description: 'Barreras identificadas en el aprendizaje',
    type: [String] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  barriersIdentified?: string[];

  @ApiPropertyOptional({ 
    description: 'Fortalezas del estudiante',
    type: [String] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  strengths?: string[];

  @ApiPropertyOptional({ 
    description: 'Desafíos del estudiante',
    type: [String] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  challenges?: string[];

  @ApiPropertyOptional({ 
    description: 'Objetivos de aprendizaje',
    type: [String] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];

  @ApiPropertyOptional({ 
    description: 'Acomodaciones recomendadas',
    type: [String] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendedAccommodations?: string[];

  @ApiPropertyOptional({ description: 'Notas adicionales sobre el perfil' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ 
    description: 'Fecha de evaluación (opcional, por defecto actual)',
    example: '2023-12-01T10:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  assessmentDate?: string;

  @ApiPropertyOptional({ 
    description: 'Estado activo del perfil',
    default: true 
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}

/**
 * DTO para actualizar un perfil DUA
 */
export class UpdateDuaProfileDto extends PartialType(CreateDuaProfileDto) {
  @ApiPropertyOptional({ description: 'ID del estudiante (no se puede cambiar)' })
  studentId?: never; // No permitir cambiar el studentId en updates
}

/**
 * DTO para filtros de búsqueda de perfiles DUA
 */
export class DuaProfileFiltersDto {
  @ApiPropertyOptional({ description: 'ID del estudiante' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ description: 'ID del evaluador' })
  @IsOptional()
  @IsUUID()
  evaluatedBy?: string;

  @ApiPropertyOptional({ description: 'Estado activo del perfil' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({ 
    description: 'Fecha de inicio del rango de búsqueda',
    example: '2023-01-01'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ 
    description: 'Fecha de fin del rango de búsqueda',
    example: '2023-12-31'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ 
    description: 'Número de página',
    default: 1,
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ 
    description: 'Cantidad de elementos por página',
    default: 20,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

/**
 * DTO de respuesta para perfil DUA
 */
export class DuaProfileResponseDto {
  @ApiProperty({ description: 'ID del perfil DUA' })
  id: string;

  @ApiProperty({ description: 'ID del estudiante' })
  studentId: string;

  @ApiProperty({ description: 'ID del evaluador' })
  evaluatedBy: string;

  @ApiPropertyOptional({ description: 'Estilos de aprendizaje' })
  learningStyles?: LearningStylesDto;

  @ApiPropertyOptional({ description: 'Inteligencias múltiples' })
  multipleIntelligences?: MultipleIntelligencesDto;

  @ApiPropertyOptional({ description: 'Barreras identificadas' })
  barriersIdentified?: string[];

  @ApiPropertyOptional({ description: 'Fortalezas' })
  strengths?: string[];

  @ApiPropertyOptional({ description: 'Desafíos' })
  challenges?: string[];

  @ApiPropertyOptional({ description: 'Objetivos' })
  goals?: string[];

  @ApiPropertyOptional({ description: 'Acomodaciones recomendadas' })
  recommendedAccommodations?: string[];

  @ApiProperty({ description: 'Fecha de evaluación' })
  assessmentDate: Date;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  notes?: string;

  @ApiProperty({ description: 'Estado activo' })
  isActive: boolean;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Información del estudiante' })
  student?: {
    id: string;
    user: {
      id: string;
      profile: {
        firstName: string;
        lastName: string;
      };
    };
    classGroup: {
      id: string;
      name: string;
    };
    educationalLevel: {
      id: string;
      name: string;
    };
  };

  @ApiPropertyOptional({ description: 'Información del evaluador' })
  evaluator?: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

/**
 * DTO de respuesta paginada para perfiles DUA
 */
export class DuaProfileListResponseDto {
  @ApiProperty({ description: 'Lista de perfiles DUA', type: [DuaProfileResponseDto] })
  data: DuaProfileResponseDto[];

  @ApiProperty({ description: 'Total de registros' })
  total: number;

  @ApiProperty({ description: 'Página actual' })
  page: number;

  @ApiProperty({ description: 'Elementos por página' })
  limit: number;

  @ApiProperty({ description: 'Total de páginas' })
  totalPages: number;

  @ApiProperty({ description: 'Hay página siguiente' })
  hasNext: boolean;

  @ApiProperty({ description: 'Hay página anterior' })
  hasPrev: boolean;
}