import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsInt, 
  Min, 
  Max,
  IsUUID,
  IsArray,
  IsBoolean
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { LessonResourceType, LessonResourceVisibility } from '../entities/lesson-resource.entity';

export class LessonResourceQueryDto {
  @ApiPropertyOptional({
    description: 'ID de la carpeta de lección para filtrar recursos',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de recurso',
    enum: LessonResourceType,
    example: LessonResourceType.YOUTUBE_LINK
  })
  @IsOptional()
  @IsEnum(LessonResourceType)
  type?: LessonResourceType;

  @ApiPropertyOptional({
    description: 'Filtrar por nivel de visibilidad',
    enum: LessonResourceVisibility,
    example: LessonResourceVisibility.CLASS
  })
  @IsOptional()
  @IsEnum(LessonResourceVisibility)
  visibility?: LessonResourceVisibility;

  @ApiPropertyOptional({
    description: 'Filtrar solo recursos activos',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Búsqueda por texto en nombre y descripción',
    example: 'fracciones matemáticas'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por tags (array de strings)',
    example: ['matemáticas', 'fracciones'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Página para paginación',
    example: 1,
    minimum: 1
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Número de elementos por página',
    example: 20,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Campo por el cual ordenar',
    example: 'orderIndex',
    enum: ['name', 'createdAt', 'updatedAt', 'orderIndex', 'type']
  })
  @IsOptional()
  @IsEnum(['name', 'createdAt', 'updatedAt', 'orderIndex', 'type'])
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'orderIndex' | 'type' = 'orderIndex';

  @ApiPropertyOptional({
    description: 'Dirección del ordenamiento',
    example: 'ASC',
    enum: ['ASC', 'DESC']
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';

  @ApiPropertyOptional({
    description: 'Incluir recursos compartidos conmigo',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeShared?: boolean = false;

  @ApiPropertyOptional({
    description: 'Solo recursos creados por el usuario actual',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  ownOnly?: boolean = false;
}

export class LessonWorkspaceQueryDto {
  @ApiPropertyOptional({
    description: 'ID del usuario para filtrar workspaces',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar solo workspaces activos',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir estadísticas de uso',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeStats?: boolean = false;

  @ApiPropertyOptional({
    description: 'Incluir carpetas del workspace',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeFolders?: boolean = false;
}

export class LessonFolderQueryDto {
  @ApiPropertyOptional({
    description: 'ID del workspace para filtrar carpetas',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar solo carpetas activas',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir recursos de cada carpeta',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeResources?: boolean = false;

  @ApiPropertyOptional({
    description: 'Incluir estadísticas de cada carpeta',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeStats?: boolean = false;

  @ApiPropertyOptional({
    description: 'Ordenar por',
    example: 'orderIndex',
    enum: ['name', 'createdAt', 'orderIndex']
  })
  @IsOptional()
  @IsEnum(['name', 'createdAt', 'orderIndex'])
  sortBy?: 'name' | 'createdAt' | 'orderIndex' = 'orderIndex';

  @ApiPropertyOptional({
    description: 'Dirección del ordenamiento',
    example: 'ASC',
    enum: ['ASC', 'DESC']
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}