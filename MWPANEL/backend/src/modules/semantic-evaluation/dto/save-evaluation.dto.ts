import { IsString, IsNotEmpty, IsUUID, IsEnum, IsArray, IsBoolean, IsInt, IsNumber, ValidateNested, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EducationalStage, DescriptorType } from '../entities/auto-activity-evaluation.entity';

export class EvaluationSelectionDto {
  @ApiProperty({
    description: 'ID del descriptor seleccionado',
    example: 'uuid1',
  })
  @IsUUID()
  descriptorId: string;

  @ApiProperty({
    description: 'Tipo de descriptor',
    enum: DescriptorType,
    example: DescriptorType.SPECIFIC,
  })
  @IsEnum(DescriptorType)
  descriptorType: DescriptorType;

  @ApiProperty({
    description: 'Puntuación de similitud original',
    example: 0.89,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  similarityScore: number;

  @ApiProperty({
    description: 'Peso asignado por el docente (0-100)',
    example: 30,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  weight: number;

  @ApiProperty({
    description: 'Si el docente acepta esta sugerencia',
    example: true,
  })
  @IsBoolean()
  accepted: boolean;
}

export class SaveEvaluationDto {
  @ApiProperty({
    description: 'Título de la actividad educativa',
    example: 'Investigamos el agua',
  })
  @IsString()
  @IsNotEmpty()
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
  @IsUUID()
  subjectId?: string;

  @ApiProperty({
    description: 'Selecciones del docente',
    type: [EvaluationSelectionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluationSelectionDto)
  selections: EvaluationSelectionDto[];
}