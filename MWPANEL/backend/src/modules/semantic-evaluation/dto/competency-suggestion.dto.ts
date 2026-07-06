import { ApiProperty } from '@nestjs/swagger';
import { DescriptorType } from '../entities/auto-activity-evaluation.entity';

export class CompetencySuggestionDto {
  @ApiProperty({
    description: 'ID único del descriptor',
    example: 'uuid1',
  })
  id: string;

  @ApiProperty({
    description: 'Tipo de descriptor',
    enum: DescriptorType,
    example: DescriptorType.SPECIFIC,
  })
  type: DescriptorType;

  @ApiProperty({
    description: 'Texto/descripción del descriptor',
    example: 'Analiza y comprende ideas relativas a la dimensión social y ciudadana...',
  })
  text: string;

  @ApiProperty({
    description: 'Código del descriptor (si aplica)',
    example: 'CC1',
    required: false,
  })
  code?: string;

  @ApiProperty({
    description: 'Puntuación de similitud semántica (0-1)',
    example: 0.89,
  })
  score: number;

  @ApiProperty({
    description: 'Puntuación de similitud como porcentaje',
    example: 89,
  })
  percentage: number;

  @ApiProperty({
    description: 'Nivel de confianza de la sugerencia',
    example: 'high',
    enum: ['high', 'medium', 'low'],
  })
  confidence: 'high' | 'medium' | 'low';

  @ApiProperty({
    description: 'Competencia clave relacionada (si aplica)',
    example: 'CC',
    required: false,
  })
  competencyCode?: string;

  @ApiProperty({
    description: 'Nombre de la competencia clave (si aplica)',
    example: 'Competencia ciudadana',
    required: false,
  })
  competencyName?: string;

  @ApiProperty({
    description: 'Área o asignatura relacionada (si aplica)',
    example: 'Ciencias Sociales',
    required: false,
  })
  subjectArea?: string;
}