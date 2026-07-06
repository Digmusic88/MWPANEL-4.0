import { IsString, IsOptional, IsArray, IsUUID, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssessActivityDto {
  @ApiProperty({
    description: 'Valor de la valoración (happy/neutral/sad para emoji, número para score)',
    example: 'happy'
  })
  @IsString()
  value: string;

  @ApiPropertyOptional({ description: 'Comentario opcional del profesor' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Peso individual de esta nota (sustituye al peso de la columna para este alumno; null = usa el de la columna)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;
}

export class BulkAssessActivityDto {
  @ApiProperty({ 
    description: 'Valor a aplicar masivamente',
    example: 'happy' 
  })
  @IsString()
  value: string;

  @ApiPropertyOptional({ description: 'Comentario opcional a aplicar a todos' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ 
    description: 'IDs de estudiantes específicos (si no se envía, aplica a todos)',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds?: string[];
}

export class AssessmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  value: string;

  @ApiProperty({ required: false })
  comment?: string;

  @ApiProperty()
  assessedAt: Date;

  @ApiProperty()
  isAssessed: boolean;

  @ApiProperty()
  studentId: string;

  @ApiProperty()
  activityId: string;
}