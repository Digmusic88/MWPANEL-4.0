import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsArray,
  Min,
} from 'class-validator';

export class CreateEvaluationCriterionDto {
  @ApiProperty({
    description: 'Código del criterio de evaluación',
    example: '1.1',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Descripción del criterio de evaluación',
    example: 'El alumno es capaz de identificar y clasificar...',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Orden dentro de la competencia específica',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiProperty({
    description: 'ID de la competencia específica a la que pertenece',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  specificCompetencyId: string;

  @ApiPropertyOptional({
    description: 'ID del ciclo (para Infantil/Primaria)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  cycleId?: string;

  @ApiPropertyOptional({
    description: 'ID del curso (para ESO)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({
    description: 'Indicadores observables para evaluación formativa',
    example: ['Identifica correctamente...', 'Aplica el procedimiento...'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  observableIndicators?: string[];

  @ApiPropertyOptional({
    description: 'Métodos de evaluación (para DUA)',
    example: ['Prueba escrita', 'Proyecto', 'Observación directa'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assessmentMethods?: string[];
}

export class UpdateEvaluationCriterionDto extends PartialType(CreateEvaluationCriterionDto) {}
