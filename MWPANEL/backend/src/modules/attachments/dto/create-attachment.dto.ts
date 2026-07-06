import { IsString, IsUUID, IsOptional, IsBoolean, IsArray, MaxLength, IsJSON } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAttachmentDto {
  @ApiProperty({
    description: 'ID de la tarea a la que pertenece el archivo',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  taskId: string;

  @ApiPropertyOptional({
    description: 'ID de la actividad relacionada (opcional)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  activityId?: string;

  @ApiPropertyOptional({
    description: 'Descripción del archivo',
    example: 'Solución de ejercicios de matemáticas',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Indica si es una entrega de estudiante',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isStudentSubmission?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si es material del profesor',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isTeacherMaterial?: boolean;

  @ApiPropertyOptional({
    description: 'Etiquetas del archivo',
    example: ['matematicas', 'ejercicios', 'algebra'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Nivel de grado',
    example: '3º ESO',
  })
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiPropertyOptional({
    description: 'Asignatura',
    example: 'Matemáticas',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    description: 'Año académico',
    example: '2024-2025',
  })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({
    description: 'Metadatos adicionales en formato JSON',
    example: { customField: 'value' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}