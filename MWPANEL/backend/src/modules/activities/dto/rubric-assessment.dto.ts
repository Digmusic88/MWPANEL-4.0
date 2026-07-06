import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRubricAssessmentCriterionDto {
  @ApiProperty({ description: 'ID del criterio' })
  @IsUUID()
  criterionId: string;

  @ApiProperty({ description: 'ID del nivel seleccionado' })
  @IsUUID()
  levelId: string;

  @ApiProperty({ description: 'ID de la celda seleccionada' })
  @IsUUID()
  cellId: string;

  @ApiProperty({ description: 'Comentarios específicos del criterio', required: false })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class CreateRubricAssessmentDto {
  @ApiProperty({ description: 'ID de la actividad (assessment)' })
  @IsUUID()
  activityAssessmentId: string;

  @ApiProperty({ description: 'ID de la rúbrica' })
  @IsUUID()
  rubricId: string;

  @ApiProperty({ description: 'ID del estudiante' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ description: 'Comentarios generales', required: false })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiProperty({ description: 'Evaluaciones por criterio', type: [CreateRubricAssessmentCriterionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRubricAssessmentCriterionDto)
  criterionAssessments: CreateRubricAssessmentCriterionDto[];
}

export class UpdateRubricAssessmentDto {
  @ApiProperty({ description: 'Comentarios generales', required: false })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiProperty({ description: 'Evaluaciones por criterio', type: [CreateRubricAssessmentCriterionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRubricAssessmentCriterionDto)
  criterionAssessments?: CreateRubricAssessmentCriterionDto[];
}

export class RubricAssessmentResponseDto {
  @ApiProperty({ description: 'ID de la evaluación' })
  id: string;

  @ApiProperty({ description: 'Puntuación total obtenida' })
  totalScore: number;

  @ApiProperty({ description: 'Puntuación máxima posible' })
  maxPossibleScore: number;

  @ApiProperty({ description: 'Porcentaje obtenido' })
  percentage: number;

  @ApiProperty({ description: 'Comentarios generales' })
  comments: string;

  @ApiProperty({ description: 'Si está completa la evaluación' })
  isComplete: boolean;

  @ApiProperty({ description: 'Evaluaciones por criterio' })
  criterionAssessments: any[];

  @ApiProperty({ description: 'Información del estudiante' })
  student: any;

  @ApiProperty({ description: 'Información de la rúbrica' })
  rubric: any;
}