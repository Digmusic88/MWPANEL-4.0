import { IsString, IsNotEmpty, IsUUID, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EducationalStage } from '../entities/auto-activity-evaluation.entity';

export class SuggestCompetenciesDto {
  @ApiProperty({
    description: 'Título de la actividad educativa',
    example: 'Investigamos el agua',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiProperty({
    description: 'Descripción detallada de la actividad',
    example: 'Los alumnos analizarán el ciclo del agua, harán experimentos y expondrán sus conclusiones en grupo.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Etapa educativa',
    enum: EducationalStage,
    example: EducationalStage.PRIMARIA,
  })
  @IsEnum(EducationalStage)
  stage: EducationalStage;

  @ApiProperty({
    description: 'ID de la asignatura (opcional)',
    example: 'uuid_asignatura',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiProperty({
    description: 'Número máximo de sugerencias a devolver',
    example: 10,
    default: 10,
    required: false,
  })
  @IsOptional()
  maxSuggestions?: number = 10;

  @ApiProperty({
    description: 'Puntuación mínima de similitud para incluir sugerencias',
    example: 0.5,
    default: 0.5,
    required: false,
  })
  @IsOptional()
  minScore?: number = 0.5;
}