/**
 * @dto: CreateEffectivenessDto
 * @module: DUA
 * @description: DTO para registrar efectividad de acomodaciones
 * @validation: class-validator decorators
 */

import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  IsObject,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EffectivenessRating } from '../entities/accommodation-effectiveness.entity';

class AcademicProgressDto {
  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  preAccommodationPerformance?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  postAccommodationPerformance?: number;

  @ApiPropertyOptional({ minimum: -100, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  improvementPercentage?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competenciesImproved?: string[];
}

class ParticipationMetricsDto {
  @ApiPropertyOptional({ enum: EffectivenessRating })
  @IsOptional()
  @IsEnum(EffectivenessRating)
  classEngagement?: EffectivenessRating;

  @ApiPropertyOptional({ enum: EffectivenessRating })
  @IsOptional()
  @IsEnum(EffectivenessRating)
  taskCompletion?: EffectivenessRating;

  @ApiPropertyOptional({ enum: EffectivenessRating })
  @IsOptional()
  @IsEnum(EffectivenessRating)
  independenceLevel?: EffectivenessRating;

  @ApiPropertyOptional({ enum: EffectivenessRating })
  @IsOptional()
  @IsEnum(EffectivenessRating)
  peerInteraction?: EffectivenessRating;
}

class WellbeingMetricsDto {
  @ApiPropertyOptional({ enum: EffectivenessRating })
  @IsOptional()
  @IsEnum(EffectivenessRating)
  anxietyReduction?: EffectivenessRating;

  @ApiPropertyOptional({ enum: EffectivenessRating })
  @IsOptional()
  @IsEnum(EffectivenessRating)
  confidenceIncrease?: EffectivenessRating;

  @ApiPropertyOptional({ enum: EffectivenessRating })
  @IsOptional()
  @IsEnum(EffectivenessRating)
  motivationLevel?: EffectivenessRating;

  @ApiPropertyOptional({ enum: EffectivenessRating })
  @IsOptional()
  @IsEnum(EffectivenessRating)
  frustrationDecrease?: EffectivenessRating;
}

class ImplementationMetricsDto {
  @ApiPropertyOptional({ enum: EffectivenessRating })
  @IsOptional()
  @IsEnum(EffectivenessRating)
  easeOfUse?: EffectivenessRating;

  @ApiPropertyOptional({ enum: EffectivenessRating })
  @IsOptional()
  @IsEnum(EffectivenessRating)
  consistencyOfApplication?: EffectivenessRating;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  resourceRequirements?: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({ enum: ['decreased', 'same', 'increased'] })
  @IsOptional()
  @IsEnum(['decreased', 'same', 'increased'])
  teacherWorkload?: 'decreased' | 'same' | 'increased';
}

class EffectivenessMetricsDto {
  @ApiPropertyOptional({ type: AcademicProgressDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AcademicProgressDto)
  academicProgress?: AcademicProgressDto;

  @ApiPropertyOptional({ type: ParticipationMetricsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ParticipationMetricsDto)
  participation?: ParticipationMetricsDto;

  @ApiPropertyOptional({ type: WellbeingMetricsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WellbeingMetricsDto)
  wellbeing?: WellbeingMetricsDto;

  @ApiPropertyOptional({ type: ImplementationMetricsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ImplementationMetricsDto)
  implementation?: ImplementationMetricsDto;
}

export class CreateEffectivenessDto {
  @ApiProperty()
  @IsUUID()
  accommodationId: string;

  @ApiProperty()
  @IsUUID()
  studentId: string;

  @ApiProperty()
  @IsDateString()
  evaluationDate: string;

  @ApiProperty({ enum: EffectivenessRating })
  @IsEnum(EffectivenessRating)
  overallRating: EffectivenessRating;

  @ApiProperty({ type: EffectivenessMetricsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => EffectivenessMetricsDto)
  metrics: EffectivenessMetricsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceFiles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recommendations?: string;

  @ApiProperty()
  @IsBoolean()
  suggestContinuation: boolean;

  @ApiProperty()
  @IsBoolean()
  suggestModification: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modificationSuggestions?: string;
}

export class EffectivenessFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  accommodationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  evaluatedById?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: EffectivenessRating })
  @IsOptional()
  @IsEnum(EffectivenessRating)
  minRating?: EffectivenessRating;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  onlyEffective?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;
}