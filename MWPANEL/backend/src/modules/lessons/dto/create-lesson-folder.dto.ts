import { IsString, IsOptional, IsInt, Min, MaxLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLessonFolderDto {
  @ApiProperty({
    description: 'Nombre de la lección',
    example: 'Fracciones Básicas',
    maxLength: 255
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada de la lección',
    example: 'Introducción a las fracciones: conceptos básicos, representación gráfica y operaciones elementales'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Índice de orden para la presentación de lecciones',
    example: 1,
    minimum: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'ID de la carpeta en Google Drive (se genera automáticamente si no se proporciona)',
    example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  })
  @IsOptional()
  @IsString()
  driveFolderId?: string;

  @ApiPropertyOptional({
    description: 'Estado activo de la lección',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLessonFolderDto {
  @ApiPropertyOptional({
    description: 'Nombre de la lección',
    example: 'Fracciones Avanzadas',
    maxLength: 255
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Descripción de la lección'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Índice de orden',
    minimum: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'Estado activo'
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReorderLessonFoldersDto {
  @ApiProperty({
    description: 'Array de IDs de lecciones en el nuevo orden',
    example: [
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
      '123e4567-e89b-12d3-a456-426614174003'
    ]
  })
  @IsString({ each: true })
  folderIds: string[];
}