import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsEnum,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LearningSituationStatus } from '../entities';

class DUAAdaptationsDto {
  @ApiProperty({ 
    description: 'Formas de presentar la información',
    example: ['Infografías visuales', 'Videos explicativos', 'Mapas conceptuales']
  })
  @IsArray()
  @IsString({ each: true })
  multipleRepresentations: string[];

  @ApiProperty({ 
    description: 'Formas de expresión del aprendizaje',
    example: ['Presentación oral', 'Trabajo escrito', 'Proyecto multimedia']
  })
  @IsArray()
  @IsString({ each: true })
  multipleActions: string[];

  @ApiProperty({ 
    description: 'Formas de motivación e implicación',
    example: ['Trabajo en equipo', 'Elección de temas', 'Gamificación']
  })
  @IsArray()
  @IsString({ each: true })
  multipleEngagements: string[];
}

class SuccessCriterionDto {
  @ApiProperty({ 
    description: 'Descripción del criterio de éxito',
    example: 'Identifica correctamente los elementos del ecosistema'
  })
  @IsString()
  @IsNotEmpty()
  criterion: string;

  @ApiProperty({ 
    description: 'Peso del criterio (0-100)',
    example: 25,
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  weight: number;
}

export class CreateLearningSituationDto {
  @ApiProperty({ 
    description: 'Título de la situación de aprendizaje',
    example: 'Investigamos los ecosistemas de nuestro entorno'
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ 
    description: 'Descripción general',
    example: 'Los estudiantes investigarán los ecosistemas locales...'
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ 
    description: 'Contexto real y significativo',
    example: 'El ayuntamiento ha solicitado un estudio sobre la biodiversidad local...'
  })
  @IsString()
  @IsNotEmpty()
  context: string;

  @ApiProperty({ 
    description: 'Reto o problema a resolver',
    example: '¿Cómo podemos proteger los ecosistemas de nuestro municipio?'
  })
  @IsString()
  @IsNotEmpty()
  challenge: string;

  @ApiProperty({ 
    description: 'Fecha de inicio',
    example: '2025-02-01'
  })
  @IsDateString()
  startDate: Date;

  @ApiProperty({ 
    description: 'Fecha de fin',
    example: '2025-02-28'
  })
  @IsDateString()
  endDate: Date;

  @ApiProperty({ 
    description: 'Número estimado de sesiones',
    example: 12,
    minimum: 1
  })
  @IsNumber()
  @Min(1)
  estimatedSessions: number;

  @ApiPropertyOptional({ 
    description: 'Estado de la situación',
    enum: LearningSituationStatus,
    default: LearningSituationStatus.DRAFT
  })
  @IsOptional()
  @IsEnum(LearningSituationStatus)
  status?: LearningSituationStatus;

  @ApiProperty({ 
    description: 'Metodologías empleadas',
    example: ['Aprendizaje basado en proyectos', 'Trabajo cooperativo', 'Investigación guiada']
  })
  @IsArray()
  @IsString({ each: true })
  methodologies: string[];

  @ApiProperty({ 
    description: 'Recursos necesarios',
    example: ['Tablets', 'Guías de campo', 'Material de laboratorio']
  })
  @IsArray()
  @IsString({ each: true })
  resources: string[];

  @ApiProperty({ 
    description: 'Espacios de aprendizaje',
    example: ['Aula', 'Laboratorio', 'Parque natural', 'Aula de informática']
  })
  @IsArray()
  @IsString({ each: true })
  spaces: string[];

  @ApiProperty({ 
    description: 'Productos finales esperados',
    example: ['Informe de investigación', 'Presentación multimedia', 'Guía de conservación']
  })
  @IsArray()
  @IsString({ each: true })
  expectedProducts: string[];

  @ApiPropertyOptional({ 
    description: 'Adaptaciones DUA',
    type: DUAAdaptationsDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DUAAdaptationsDto)
  duaAdaptations?: DUAAdaptationsDto;

  @ApiProperty({ 
    description: 'Herramientas de evaluación',
    example: ['Rúbrica de evaluación', 'Portfolio', 'Observación directa', 'Autoevaluación']
  })
  @IsArray()
  @IsString({ each: true })
  assessmentTools: string[];

  @ApiPropertyOptional({ 
    description: 'Criterios de éxito con ponderación',
    type: [SuccessCriterionDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SuccessCriterionDto)
  successCriteria?: SuccessCriterionDto[];

  @ApiProperty({ 
    description: 'ID del grupo clase',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  classGroupId: string;

  @ApiProperty({ 
    description: 'ID de la asignatura',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  subjectId: string;

  @ApiProperty({ 
    description: 'IDs de las competencias específicas trabajadas',
    example: ['123e4567-e89b-12d3-a456-426614174000']
  })
  @IsArray()
  @IsUUID('4', { each: true })
  specificCompetencyIds: string[];

  @ApiPropertyOptional({ 
    description: 'IDs de profesores con los que compartir',
    example: ['123e4567-e89b-12d3-a456-426614174000']
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sharedWith?: string[];

  @ApiPropertyOptional({ 
    description: 'Si es una plantilla reutilizable',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;
}