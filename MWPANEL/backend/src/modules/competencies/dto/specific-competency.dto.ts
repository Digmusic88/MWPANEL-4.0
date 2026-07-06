import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsArray,
  Min,
} from 'class-validator';

export class CreateSpecificCompetencyDto {
  @ApiProperty({
    description: 'Código de la competencia específica',
    example: 'CE.MAT.1',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Nombre de la competencia específica',
    example: 'Pensamiento numérico',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Descripción de la competencia específica',
    example: 'El alumno es capaz de utilizar los números y las operaciones...',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Orden dentro de la materia',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiProperty({
    description: 'ID de la asignatura',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty({
    description: 'ID del nivel educativo',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  educationalLevelId: string;

  @ApiPropertyOptional({
    description: 'IDs de las competencias clave relacionadas (M:N)',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyCompetencyIds?: string[];
}

export class UpdateSpecificCompetencyDto extends PartialType(CreateSpecificCompetencyDto) {}
