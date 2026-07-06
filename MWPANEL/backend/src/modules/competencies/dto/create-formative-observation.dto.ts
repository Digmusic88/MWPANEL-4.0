import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

enum ObservationContext {
  CLASSROOM = 'CLASSROOM',
  PLAYGROUND = 'PLAYGROUND',
  LAB = 'LAB',
  WORKSHOP = 'WORKSHOP',
  FIELD_TRIP = 'FIELD_TRIP',
  OTHER = 'OTHER',
}

enum ObservationType {
  ACHIEVEMENT = 'ACHIEVEMENT',
  PROCESS = 'PROCESS',
  DIFFICULTY = 'DIFFICULTY',
  BEHAVIOR = 'BEHAVIOR',
  INTERACTION = 'INTERACTION',
}

enum ProgressIndicator {
  EMERGING = 'EMERGING',
  DEVELOPING = 'DEVELOPING',
  ACHIEVING = 'ACHIEVING',
  EXCEEDING = 'EXCEEDING',
}

class DevelopmentAspectsDto {
  @ApiPropertyOptional({ description: 'Desarrollo motor' })
  @IsOptional()
  @IsBoolean()
  motor?: boolean;

  @ApiPropertyOptional({ description: 'Desarrollo cognitivo' })
  @IsOptional()
  @IsBoolean()
  cognitive?: boolean;

  @ApiPropertyOptional({ description: 'Desarrollo lingüístico' })
  @IsOptional()
  @IsBoolean()
  linguistic?: boolean;

  @ApiPropertyOptional({ description: 'Desarrollo social' })
  @IsOptional()
  @IsBoolean()
  social?: boolean;

  @ApiPropertyOptional({ description: 'Desarrollo emocional' })
  @IsOptional()
  @IsBoolean()
  emotional?: boolean;

  @ApiPropertyOptional({ description: 'Desarrollo de autonomía' })
  @IsOptional()
  @IsBoolean()
  autonomous?: boolean;
}

export class CreateFormativeObservationDto {
  @ApiProperty({ 
    description: 'ID del estudiante observado',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  studentId: string;

  @ApiPropertyOptional({ 
    description: 'ID de la competencia específica observada',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  specificCompetencyId?: string;

  @ApiPropertyOptional({ 
    description: 'ID del criterio de evaluación observado',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  evaluationCriterionId?: string;

  @ApiProperty({ 
    description: 'Contexto de la observación',
    enum: ObservationContext,
    example: ObservationContext.CLASSROOM
  })
  @IsEnum(ObservationContext)
  context: ObservationContext;

  @ApiPropertyOptional({ 
    description: 'Descripción adicional del contexto',
    example: 'Durante la actividad de trabajo en grupos pequeños'
  })
  @IsOptional()
  @IsString()
  contextDescription?: string;

  @ApiProperty({ 
    description: 'La observación realizada',
    example: 'El estudiante muestra gran iniciativa al proponer soluciones creativas al problema planteado'
  })
  @IsString()
  @IsNotEmpty()
  observation: string;

  @ApiProperty({ 
    description: 'Tipo de observación',
    enum: ObservationType,
    example: ObservationType.ACHIEVEMENT
  })
  @IsEnum(ObservationType)
  observationType: ObservationType;

  @ApiPropertyOptional({ 
    description: 'Aspectos del desarrollo (especialmente para Educación Infantil)',
    type: DevelopmentAspectsDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DevelopmentAspectsDto)
  developmentAspects?: DevelopmentAspectsDto;

  @ApiPropertyOptional({ 
    description: 'Indicador de progreso',
    enum: ProgressIndicator,
    example: ProgressIndicator.ACHIEVING
  })
  @IsOptional()
  @IsEnum(ProgressIndicator)
  progressIndicator?: ProgressIndicator;

  @ApiPropertyOptional({ 
    description: 'URLs de archivos adjuntos (evidencias)',
    example: ['https://example.com/photo1.jpg', 'https://example.com/video1.mp4']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiProperty({ 
    description: 'Fecha y hora de la observación',
    example: '2025-02-15T10:30:00Z'
  })
  @IsDateString()
  observationDateTime: Date;

  @ApiPropertyOptional({ 
    description: 'Requiere seguimiento',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  requiresFollowUp?: boolean;

  @ApiPropertyOptional({ 
    description: 'Notas para el seguimiento',
    example: 'Observar si mantiene esta actitud en próximas actividades colaborativas'
  })
  @IsOptional()
  @IsString()
  followUpNotes?: string;
}