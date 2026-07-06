/**
 * @archivo: grade-configuration.dto.ts
 * @módulo: Grades - DTOs
 * @función: DTOs para configuración de ponderaciones con validación
 * @crítico: SÍ - Validación de entrada para API de configuraciones
 * @actualizado: Julio 2025 - Implementación completa
 */

import { IsString, IsOptional, IsObject, IsNumber, IsEnum, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GradingScale, RoundingPolicy } from '../entities/grade-configuration.entity';

export class WeightComponentDto {
  @ApiProperty({ description: 'Weight percentage (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  weight: number;

  @ApiProperty({ description: 'Whether this component is enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Minimum number of items required', minimum: 1 })
  @IsNumber()
  minimumItems: number;

  @ApiPropertyOptional({ description: 'Grading scale for this component' })
  @IsString()
  @IsOptional()
  scale?: string;
}

export class CreateGradeConfigurationDto {
  @ApiProperty({ description: 'Teacher ID' })
  @IsString()
  teacherId: string;

  @ApiProperty({ description: 'Subject ID' })
  @IsString()
  subjectId: string;

  @ApiPropertyOptional({ description: 'Course ID' })
  @IsString()
  @IsOptional()
  courseId?: string;

  @ApiProperty({ description: 'Educational Level ID' })
  @IsString()
  educationalLevelId: string;

  @ApiProperty({ description: 'Weight configuration object' })
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => WeightComponentDto)
  weightConfiguration: Record<string, WeightComponentDto>;

  @ApiPropertyOptional({ description: 'Default grading scale', enum: GradingScale })
  @IsEnum(GradingScale)
  @IsOptional()
  defaultScale?: GradingScale;

  @ApiPropertyOptional({ description: 'Rounding policy', enum: RoundingPolicy })
  @IsEnum(RoundingPolicy)
  @IsOptional()
  roundingPolicy?: RoundingPolicy;

  @ApiPropertyOptional({ description: 'Passing grade threshold', minimum: 0 })
  @IsNumber()
  @IsOptional()
  passingGrade?: number;

  @ApiPropertyOptional({ description: 'Enable AI assessments' })
  @IsBoolean()
  @IsOptional()
  enableAIAssessments?: boolean;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateGradeConfigurationDto {
  @ApiPropertyOptional({ description: 'Weight configuration object' })
  @IsOptional()
  @IsObject()
  weightConfiguration?: Record<string, any>;  // Flexible for updates, no nested validation

  @ApiPropertyOptional({ description: 'Default grading scale' })
  @IsOptional()
  @IsString()
  defaultScale?: string;

  @ApiPropertyOptional({ description: 'Rounding policy' })
  @IsOptional()
  @IsString()
  roundingPolicy?: string;

  @ApiPropertyOptional({ description: 'Passing grade threshold' })
  @IsOptional()
  @IsNumber()
  passingGrade?: number;

  @ApiPropertyOptional({ description: 'Enable AI assessments' })
  @IsOptional()
  @IsBoolean()
  enableAIAssessments?: boolean;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}