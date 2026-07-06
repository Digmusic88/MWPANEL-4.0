import { IsNumber, IsOptional, IsString, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GradeTaskDto {
  @ApiProperty({
    description: 'Puntuación obtenida',
    example: 8.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  grade: number;

  @ApiPropertyOptional({
    description: 'Comentarios del profesor sobre la entrega',
    example: 'Excelente trabajo. Solo mejorar la conclusión.',
  })
  @IsOptional()
  @IsString()
  teacherFeedback?: string;

  @ApiPropertyOptional({
    description: 'Notas privadas del profesor (no visibles para el estudiante)',
    example: 'Estudiante muestra gran progreso este trimestre.',
  })
  @IsOptional()
  @IsString()
  privateNotes?: string;

  @ApiPropertyOptional({
    description: 'Indica si la entrega necesita revisión y reenvío',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  needsRevision?: boolean;
}

export class BulkGradeTaskDto {
  @ApiProperty({
    description: 'Lista de calificaciones por estudiante',
    example: [
      {
        submissionId: 'uuid-1',
        grade: 8.5,
        teacherFeedback: 'Muy bien',
      },
      {
        submissionId: 'uuid-2',
        grade: 7.0,
        teacherFeedback: 'Mejorar redacción',
      },
    ],
  })
  @IsOptional()
  grades: Array<{
    submissionId: string;
    grade: number;
    teacherFeedback?: string;
    privateNotes?: string;
    needsRevision?: boolean;
  }>;
}

export class ReturnTaskDto {
  @ApiProperty({
    description: 'Motivo de devolución para revisión',
    example: 'Por favor, amplía la conclusión y añade más fuentes bibliográficas.',
  })
  @IsString()
  returnReason: string;

  @ApiPropertyOptional({
    description: 'Comentarios adicionales para el estudiante',
    example: 'Buen trabajo en general, solo necesita algunas mejoras.',
  })
  @IsOptional()
  @IsString()
  additionalComments?: string;
}