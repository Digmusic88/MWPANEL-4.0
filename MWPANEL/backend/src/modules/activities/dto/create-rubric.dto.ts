import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, ValidateNested, IsEnum, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRubricCriterionDto {
  @ApiProperty({ description: 'Nombre del criterio', example: 'Coherencia del texto' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Descripción del criterio', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Orden del criterio', example: 0 })
  @IsNumber()
  @Min(0)
  order: number;

  @ApiProperty({ description: 'Peso del criterio (0-1)', example: 0.25 })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight: number;
}

export class CreateRubricLevelDto {
  @ApiProperty({ description: 'Nombre del nivel', example: 'Excelente' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Descripción del nivel', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Orden del nivel', example: 3 })
  @IsNumber()
  @Min(0)
  order: number;

  @ApiProperty({ description: 'Valor de puntuación del nivel', example: 4 })
  @IsNumber()
  @Min(0)
  scoreValue: number;

  @ApiProperty({ description: 'Color del nivel', example: '#4CAF50' })
  @IsString()
  color: string;
}

export class CreateRubricCellDto {
  @ApiProperty({ description: 'ID del criterio', required: false })
  @IsOptional()
  @IsString()
  criterionId?: string;

  @ApiProperty({ description: 'ID del nivel', required: false })
  @IsOptional()
  @IsString()
  levelId?: string;

  @ApiProperty({ description: 'Contenido de la celda', example: 'Texto muy claro y coherente' })
  @IsString()
  content: string;
}

export class CreateRubricDto {
  @ApiProperty({ description: 'Nombre de la rúbrica', example: 'Evaluación de redacción' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Descripción de la rúbrica', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Si es plantilla reutilizable', default: false })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiProperty({ description: 'Si es visible para familias', default: false })
  @IsOptional()
  @IsBoolean()
  isVisibleToFamilies?: boolean;

  @ApiProperty({ description: 'ID de la asignación de asignatura', required: false })
  @IsOptional()
  @IsUUID()
  subjectAssignmentId?: string;

  @ApiProperty({ description: 'Puntuación máxima', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxScore?: number;

  @ApiProperty({ description: 'Fuente de importación', required: false })
  @IsOptional()
  @IsString()
  importSource?: string;

  @ApiProperty({ description: 'Datos originales de importación', required: false })
  @IsOptional()
  @IsString()
  originalImportData?: string;

  @ApiProperty({ description: 'Criterios de la rúbrica', type: [CreateRubricCriterionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRubricCriterionDto)
  criteria: CreateRubricCriterionDto[];

  @ApiProperty({ description: 'Niveles de la rúbrica', type: [CreateRubricLevelDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRubricLevelDto)
  levels: CreateRubricLevelDto[];

  @ApiProperty({ description: 'Celdas de la rúbrica', type: [CreateRubricCellDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRubricCellDto)
  cells: CreateRubricCellDto[];
}