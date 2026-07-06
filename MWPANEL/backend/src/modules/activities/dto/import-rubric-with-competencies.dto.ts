import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ImportRubricDto } from './import-rubric.dto';

export class CompetencyMappingDto {
  @ApiProperty({ description: 'Índice del criterio (0-based)', example: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  criterionIndex?: number;

  @ApiProperty({ description: 'ID de la competencia (puede ser UUID o código)', example: 'cd-1' })
  @IsString()
  competencyId: string;

  @ApiProperty({ description: 'Texto del criterio para referencia', required: false })
  @IsOptional()
  @IsString()
  criterionText?: string;

  @ApiProperty({ description: 'Confianza de la asignación automática (0-1)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}

export class ImportRubricWithCompetenciesDto extends ImportRubricDto {
  @ApiProperty({ 
    description: 'Si esta rúbrica incluye competencias asociadas a criterios',
    default: false 
  })
  @IsBoolean()
  includeCompetencies: boolean;

  @ApiProperty({ 
    description: 'Mapeo de criterios a competencias',
    type: [CompetencyMappingDto],
    required: false 
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompetencyMappingDto)
  competencyMappings?: CompetencyMappingDto[];

  @ApiProperty({ 
    description: 'Usar mapeo automático de competencias basado en análisis de texto',
    default: true,
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  useAutomaticMapping?: boolean;
}