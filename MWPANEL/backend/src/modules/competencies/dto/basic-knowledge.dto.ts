import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsArray,
  IsEnum,
  Min,
} from 'class-validator';

export enum KnowledgeType {
  KNOWLEDGE = 'KNOWLEDGE',
  SKILL = 'SKILL',
  ATTITUDE = 'ATTITUDE',
}

export class CreateBasicKnowledgeDto {
  @ApiProperty({
    description: 'Código del saber básico',
    example: 'A.1.1',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Bloque temático al que pertenece',
    example: 'A. Números y operaciones',
  })
  @IsString()
  @IsNotEmpty()
  block: string;

  @ApiProperty({
    description: 'Título del saber básico',
    example: 'Números naturales',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Descripción del saber básico',
    example: 'Conocimiento y uso de los números naturales hasta el millón',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Orden dentro de la competencia específica',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiProperty({
    description: 'ID de la competencia específica a la que pertenece',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  specificCompetencyId: string;

  @ApiPropertyOptional({
    description: 'ID del ciclo (para Infantil/Primaria)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  cycleId?: string;

  @ApiPropertyOptional({
    description: 'ID del curso (para ESO)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({
    description: 'Tipo de saber',
    enum: KnowledgeType,
    example: KnowledgeType.KNOWLEDGE,
  })
  @IsOptional()
  @IsEnum(KnowledgeType)
  knowledgeType?: KnowledgeType;

  @ApiPropertyOptional({
    description: 'Representaciones alternativas para DUA',
    example: ['Diagrama visual', 'Ejemplo práctico'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alternativeRepresentations?: string[];
}

export class UpdateBasicKnowledgeDto extends PartialType(CreateBasicKnowledgeDto) {}
