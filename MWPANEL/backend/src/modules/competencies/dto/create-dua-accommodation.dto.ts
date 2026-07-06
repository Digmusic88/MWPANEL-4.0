import {
  IsUUID,
  IsEnum,
  IsString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  AccommodationCategory, 
  AccommodationType, 
  AccommodationStatus 
} from '../entities/dua-accommodation.entity';

class AccommodationSpecificationsDto {
  @ApiPropertyOptional({ description: 'Multiplicador de tiempo (1.5x, 2x, etc.)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  timeMultiplier?: number;

  @ApiPropertyOptional({ description: 'Duración máxima en minutos' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDuration?: number;

  @ApiPropertyOptional({ description: 'Tamaño de fuente' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(48)
  fontSize?: number;

  @ApiPropertyOptional({ description: 'Familia de fuente' })
  @IsOptional()
  @IsString()
  fontFamily?: string;

  @ApiPropertyOptional({ description: 'Espaciado entre líneas' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  lineSpacing?: number;

  @ApiPropertyOptional({ description: 'Velocidad de habla' })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  speechRate?: number;

  @ApiPropertyOptional({ description: 'Voz para texto a voz' })
  @IsOptional()
  @IsString()
  voice?: string;

  @ApiPropertyOptional({ description: 'Frecuencia de descansos en minutos' })
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(120)
  breakFrequency?: number;

  @ApiPropertyOptional({ description: 'Duración de descansos en minutos' })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(30)
  breakDuration?: number;

  @ApiPropertyOptional({ description: 'Especificaciones personalizadas' })
  @IsOptional()
  @IsObject()
  custom?: Record<string, any>;
}

class AccommodationApplicabilityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allSubjects?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  subjectIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allActivities?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activityTypes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allEvaluations?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evaluationTypes?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specificSituations?: string[];
}

export class CreateDuaAccommodationDto {
  @ApiProperty({ description: 'ID del perfil DUA' })
  @IsUUID()
  @IsNotEmpty()
  duaProfileId: string;

  @ApiProperty({
    description: 'Categoría de la acomodación',
    enum: AccommodationCategory,
  })
  @IsEnum(AccommodationCategory)
  @IsNotEmpty()
  category: AccommodationCategory;

  @ApiProperty({
    description: 'Tipo de acomodación',
    enum: AccommodationType,
  })
  @IsEnum(AccommodationType)
  @IsNotEmpty()
  type: AccommodationType;

  @ApiProperty({ description: 'Nombre de la acomodación' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Descripción detallada' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Especificaciones técnicas',
    type: AccommodationSpecificationsDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AccommodationSpecificationsDto)
  specifications?: AccommodationSpecificationsDto;

  @ApiPropertyOptional({
    description: 'Aplicabilidad de la acomodación',
    type: AccommodationApplicabilityDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AccommodationApplicabilityDto)
  applicability?: AccommodationApplicabilityDto;

  @ApiPropertyOptional({ description: 'ID de la materia específica' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ description: 'ID del criterio de evaluación específico' })
  @IsOptional()
  @IsUUID()
  evaluationCriterionId?: string;

  @ApiPropertyOptional({ description: 'ID de la situación de aprendizaje específica' })
  @IsOptional()
  @IsUUID()
  learningSituationId?: string;

  @ApiProperty({ description: 'Fecha de inicio' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiPropertyOptional({ description: 'Fecha de fin (si es temporal)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Es temporal' })
  @IsOptional()
  @IsBoolean()
  isTemporary?: boolean;

  @ApiProperty({ description: 'Justificación pedagógica' })
  @IsString()
  @IsNotEmpty()
  rationale: string;

  @ApiPropertyOptional({
    description: 'Evidencia de apoyo',
  })
  @IsOptional()
  @IsObject()
  supportingEvidence?: {
    documents?: string[];
    evaluations?: string[];
    observations?: string[];
    recommendations?: string[];
  };

  @ApiPropertyOptional({
    description: 'Notas de implementación',
  })
  @IsOptional()
  @IsObject()
  implementationNotes?: {
    requiredResources?: string[];
    trainingNeeded?: boolean;
    costEstimate?: number;
    responsibleStaff?: string[];
    setupInstructions?: string;
  };
}