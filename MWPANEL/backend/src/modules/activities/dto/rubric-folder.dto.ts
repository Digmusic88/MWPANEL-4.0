import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUUID, IsArray, IsNumber, Length, IsHexColor, Min } from 'class-validator';

export class CreateRubricFolderDto {
  @ApiProperty({ 
    description: 'Nombre de la carpeta', 
    example: 'Rúbricas de Matemáticas',
    maxLength: 255
  })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty({ 
    description: 'Descripción de la carpeta', 
    example: 'Carpeta para todas las rúbricas de la asignatura de matemáticas',
    required: false 
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Color hexadecimal de la carpeta', 
    example: '#4CAF50',
    required: false 
  })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiProperty({ 
    description: 'Icono de Ant Design para la carpeta', 
    example: 'folder',
    required: false 
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  icon?: string;

  @ApiProperty({ 
    description: 'ID de la carpeta padre (null para carpeta raíz)', 
    example: 'uuid-string',
    required: false 
  })
  @IsOptional()
  @IsUUID()
  parentFolderId?: string;

  @ApiProperty({ 
    description: 'Si la carpeta es compartida con otros profesores', 
    default: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isShared?: boolean;

  @ApiProperty({ 
    description: 'Array de IDs de profesores con acceso', 
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  sharedWith?: string[];

  @ApiProperty({ 
    description: 'Orden de visualización', 
    default: 0,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderIndex?: number;
}

export class UpdateRubricFolderDto {
  @ApiProperty({ 
    description: 'Nombre de la carpeta', 
    maxLength: 255,
    required: false
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @ApiProperty({ 
    description: 'Descripción de la carpeta',
    required: false 
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Color hexadecimal de la carpeta',
    required: false 
  })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiProperty({ 
    description: 'Icono de Ant Design para la carpeta',
    required: false 
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  icon?: string;

  @ApiProperty({ 
    description: 'ID de la carpeta padre',
    required: false 
  })
  @IsOptional()
  @IsUUID()
  parentFolderId?: string;

  @ApiProperty({ 
    description: 'Si la carpeta es compartida',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isShared?: boolean;

  @ApiProperty({ 
    description: 'Array de IDs de profesores con acceso',
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  sharedWith?: string[];

  @ApiProperty({ 
    description: 'Orden de visualización',
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderIndex?: number;
}

export class MoveRubricToFolderDto {
  @ApiProperty({ 
    description: 'ID de la rúbrica a mover', 
    example: 'uuid-string'
  })
  @IsUUID()
  rubricId: string;

  @ApiProperty({ 
    description: 'ID de la carpeta destino (null para mover a raíz)', 
    example: 'uuid-string',
    required: false
  })
  @IsOptional()
  @IsUUID()
  folderId?: string;
}

export class BulkMoveRubricsDto {
  @ApiProperty({ 
    description: 'Array de IDs de rúbricas a mover', 
    type: [String],
    example: ['uuid-1', 'uuid-2', 'uuid-3']
  })
  @IsArray()
  @IsUUID(4, { each: true })
  rubricIds: string[];

  @ApiProperty({ 
    description: 'ID de la carpeta destino (null para mover a raíz)', 
    example: 'uuid-string',
    required: false
  })
  @IsOptional()
  @IsUUID()
  folderId?: string;
}

export class RubricFolderStatsDto {
  @ApiProperty({ description: 'ID de la carpeta' })
  id: string;

  @ApiProperty({ description: 'Nombre de la carpeta' })
  name: string;

  @ApiProperty({ description: 'Número de rúbricas directas en la carpeta' })
  directRubrics: number;

  @ApiProperty({ description: 'Número total de rúbricas (incluyendo subcarpetas)' })
  totalRubrics: number;

  @ApiProperty({ description: 'Número de subcarpetas' })
  subfolders: number;

  @ApiProperty({ description: 'Fecha de última modificación' })
  lastModified: Date;
}

export class FolderTreeDto {
  @ApiProperty({ description: 'ID de la carpeta' })
  id: string;

  @ApiProperty({ description: 'Nombre de la carpeta' })
  name: string;

  @ApiProperty({ description: 'Descripción de la carpeta', required: false })
  description?: string;

  @ApiProperty({ description: 'Color de la carpeta', required: false })
  color?: string;

  @ApiProperty({ description: 'Icono de la carpeta', required: false })
  icon?: string;

  @ApiProperty({ description: 'Si es carpeta del sistema' })
  isSystemFolder: boolean;

  @ApiProperty({ description: 'Orden de visualización' })
  orderIndex: number;

  @ApiProperty({ description: 'Número de rúbricas en la carpeta' })
  rubricsCount: number;

  @ApiProperty({ description: 'Subcarpetas', type: [FolderTreeDto] })
  children: FolderTreeDto[];
}