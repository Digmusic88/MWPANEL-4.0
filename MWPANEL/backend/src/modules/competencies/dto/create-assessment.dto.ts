import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  IsDateString,
  ValidateNested,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class CompetencyScoreDto {
  @ApiProperty({ 
    description: 'ID de la competencia específica evaluada',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  specificCompetencyId: string;

  @ApiProperty({ 
    description: 'Puntuación obtenida (1-4)',
    example: 3,
    minimum: 1,
    maximum: 4
  })
  @IsNumber()
  @Min(1)
  @Max(4)
  score: number;

  @ApiPropertyOptional({ 
    description: 'Observaciones sobre esta competencia',
    example: 'Muestra buen dominio pero necesita mejorar la expresión escrita'
  })
  @IsOptional()
  @IsString()
  observation?: string;
}

export class CreateAssessmentDto {
  @ApiProperty({ 
    description: 'ID del estudiante evaluado',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  studentId: string;

  @ApiProperty({ 
    description: 'Fecha de la evaluación',
    example: '2025-02-15'
  })
  @IsDateString()
  assessmentDate: Date;

  @ApiProperty({ 
    description: 'Puntuación global (1-10)',
    example: 7.5,
    minimum: 0,
    maximum: 10
  })
  @IsNumber()
  @Min(0)
  @Max(10)
  overallScore: number;

  @ApiProperty({ 
    description: 'Puntuaciones por competencia',
    type: [CompetencyScoreDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompetencyScoreDto)
  competencyScores: CompetencyScoreDto[];

  @ApiProperty({ 
    description: 'Observaciones generales',
    example: 'El estudiante ha mostrado gran interés y participación activa...'
  })
  @IsString()
  @IsNotEmpty()
  generalObservations: string;

  @ApiPropertyOptional({ 
    description: 'Fortalezas identificadas',
    example: ['Trabajo en equipo', 'Creatividad', 'Pensamiento crítico']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  strengths?: string[];

  @ApiPropertyOptional({ 
    description: 'Áreas de mejora',
    example: ['Organización del tiempo', 'Expresión oral']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  areasForImprovement?: string[];

  @ApiPropertyOptional({ 
    description: 'Próximos pasos recomendados',
    example: 'Trabajar en la estructuración de las presentaciones orales'
  })
  @IsOptional()
  @IsString()
  nextSteps?: string;

  @ApiPropertyOptional({ 
    description: 'Productos entregados',
    example: ['Informe de investigación', 'Presentación']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliveredProducts?: string[];

  @ApiPropertyOptional({ 
    description: 'Nivel de logro de los criterios de éxito',
    example: { 'criterion1': 85, 'criterion2': 70 }
  })
  @IsOptional()
  successCriteriaScores?: Record<string, number>;
}