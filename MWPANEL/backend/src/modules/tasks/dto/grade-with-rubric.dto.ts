import { IsString, IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SelectedRubricCellDto {
  @ApiProperty({
    description: 'ID del criterio de la rúbrica',
    example: 'uuid-criterion-1',
  })
  @IsString()
  criterionId: string;

  @ApiProperty({
    description: 'ID del nivel de la rúbrica',
    example: 'uuid-level-1',
  })
  @IsString()
  levelId: string;
}

export class GradeWithRubricDto {
  @ApiProperty({
    description: 'Celdas seleccionadas en la rúbrica',
    type: [SelectedRubricCellDto],
    example: [
      {
        criterionId: 'uuid-criterion-1',
        levelId: 'uuid-level-3'
      },
      {
        criterionId: 'uuid-criterion-2', 
        levelId: 'uuid-level-2'
      }
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedRubricCellDto)
  selectedCells: SelectedRubricCellDto[];

  @ApiPropertyOptional({
    description: 'Comentarios del profesor sobre la entrega',
    example: 'Excelente trabajo. La metodología está muy bien aplicada.',
  })
  @IsOptional()
  @IsString()
  teacherFeedback?: string;

  @ApiPropertyOptional({
    description: 'Notas privadas del profesor (no visibles para el estudiante)',
    example: 'Estudiante muestra gran progreso en investigación.',
  })
  @IsOptional()
  @IsString()
  privateNotes?: string;
}

export class RubricGradeResponseDto {
  @ApiProperty({
    description: 'Nota final calculada automáticamente',
    example: 8.5,
  })
  finalGrade: number;

  @ApiProperty({
    description: 'Porcentaje obtenido',
    example: 85,
  })
  percentage: number;

  @ApiProperty({
    description: 'Celdas seleccionadas en la evaluación',
    type: [SelectedRubricCellDto],
  })
  selectedCells: SelectedRubricCellDto[];

  @ApiProperty({
    description: 'Feedback del profesor',
  })
  teacherFeedback?: string;

  @ApiProperty({
    description: 'ID del assessment de rúbrica creado',
  })
  rubricAssessmentId: string;
}