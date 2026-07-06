import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateFromTemplateDto {
  @ApiProperty({ description: 'ID de la plantilla de actividad' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ description: 'Nueva fecha de asignación', example: '2025-01-15' })
  @IsString()
  @IsNotEmpty()
  assignedDate: string;

  @ApiPropertyOptional({ description: 'Nueva fecha de revisión opcional', example: '2025-01-20' })
  @IsOptional()
  @IsString()
  reviewDate?: string;

  @ApiPropertyOptional({ description: 'IDs de estudiantes específicos (opcional, usa los originales si no se especifica)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetStudentIds?: string[];
}