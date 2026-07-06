import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsInt, 
  Min, 
  MaxLength, 
  IsBoolean,
  IsUUID,
  IsUrl,
  ValidateNested,
  IsObject,
  IsArray,
  ArrayMaxSize,
  Matches
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LessonResourceType, LessonResourceVisibility } from '../entities/lesson-resource.entity';

export class CreateLessonResourceDto {
  @ApiProperty({
    description: 'Nombre del recurso',
    example: 'Video explicativo de fracciones',
    maxLength: 255
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción del recurso',
    example: 'Video que explica los conceptos básicos de fracciones con ejemplos visuales'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Tipo de recurso',
    enum: LessonResourceType,
    example: LessonResourceType.YOUTUBE_LINK
  })
  @IsEnum(LessonResourceType)
  type: LessonResourceType;

  @ApiProperty({
    description: 'Nivel de visibilidad del recurso',
    enum: LessonResourceVisibility,
    example: LessonResourceVisibility.CLASS
  })
  @IsEnum(LessonResourceVisibility)
  visibility: LessonResourceVisibility;

  @ApiPropertyOptional({
    description: 'Índice de orden para presentación',
    example: 1,
    minimum: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'Estado activo del recurso',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Tags para categorización del recurso',
    example: ['matemáticas', 'fracciones', 'primaria'],
    maxItems: 10
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  tags?: string[];
}

// DTO específico para archivos
export class CreateFileResourceDto extends CreateLessonResourceDto {
  @ApiProperty({
    description: 'ID del archivo en Google Drive',
    example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  })
  @IsString()
  driveFileId: string;

  @ApiProperty({
    description: 'Nombre original del archivo',
    example: 'fracciones_ejercicios.pdf'
  })
  @IsString()
  originalFileName: string;

  @ApiProperty({
    description: 'Tipo MIME del archivo',
    example: 'application/pdf'
  })
  @IsString()
  mimeType: string;

  @ApiProperty({
    description: 'Tamaño del archivo en bytes',
    example: 2048576
  })
  @IsInt()
  @Min(0)
  fileSize: number;
}

// DTO específico para enlaces de YouTube
export class CreateYouTubeResourceDto extends CreateLessonResourceDto {
  @ApiProperty({
    description: 'URL completa del video de YouTube',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  })
  @IsUrl()
  @Matches(/^https:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+(&[\w=&-]*)?$|^https:\/\/youtu\.be\/[\w-]+(\?[\w=&-]*)?$/, {
    message: 'Debe ser una URL válida de YouTube'
  })
  youtubeUrl: string;

  @ApiProperty({
    description: 'ID del video de YouTube extraído de la URL',
    example: 'dQw4w9WgXcQ'
  })
  @IsString()
  @Matches(/^[\w-]{11}$/, { message: 'ID de YouTube debe tener 11 caracteres' })
  youtubeVideoId: string;

  @ApiPropertyOptional({
    description: 'Título del video obtenido de YouTube',
    example: 'Fracciones para principiantes'
  })
  @IsOptional()
  @IsString()
  youtubeTitle?: string;

  @ApiPropertyOptional({
    description: 'Duración del video en segundos',
    example: 300
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  youtubeDuration?: number;
}

// DTO específico para enlaces web
export class CreateWebLinkResourceDto extends CreateLessonResourceDto {
  @ApiProperty({
    description: 'URL del enlace web',
    example: 'https://www.khanacademy.org/math/fractions'
  })
  @IsUrl()
  webUrl: string;

  @ApiPropertyOptional({
    description: 'Título de la página web',
    example: 'Khan Academy - Fracciones'
  })
  @IsOptional()
  @IsString()
  webTitle?: string;

  @ApiPropertyOptional({
    description: 'Descripción obtenida de la página',
    example: 'Aprende fracciones con ejercicios interactivos'
  })
  @IsOptional()
  @IsString()
  webDescription?: string;
}

// DTO específico para documentos internos WYSIWYG
export class CreateInternalDocResourceDto extends CreateLessonResourceDto {
  @ApiProperty({
    description: 'Contenido del documento en formato HTML',
    example: '<h1>Fracciones</h1><p>Las fracciones representan...</p>'
  })
  @IsString()
  htmlContent: string;

  @ApiPropertyOptional({
    description: 'Contenido en texto plano para búsquedas',
    example: 'Fracciones Las fracciones representan...'
  })
  @IsOptional()
  @IsString()
  plainTextContent?: string;
}

// DTO específico para presentaciones
export class CreatePresentationResourceDto extends CreateLessonResourceDto {
  @ApiProperty({
    description: 'ID del archivo de presentación en Google Drive',
    example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  })
  @IsString()
  driveFileId: string;

  @ApiProperty({
    description: 'Tipo de presentación',
    example: 'google_slides',
    enum: ['google_slides', 'powerpoint', 'pdf']
  })
  @IsEnum(['google_slides', 'powerpoint', 'pdf'])
  presentationType: 'google_slides' | 'powerpoint' | 'pdf';

  @ApiPropertyOptional({
    description: 'Número total de diapositivas',
    example: 15
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  slideCount?: number;
}

// DTO específico para artefactos TSX
export class CreateTsxArtifactResourceDto extends CreateLessonResourceDto {
  @ApiProperty({
    description: 'Código TypeScript/React del componente',
    example: `import React, { useState } from 'react';
export default function FractionCalculator() {
  const [numerator, setNumerator] = useState(0);
  const [denominator, setDenominator] = useState(1);
  return (
    <div>
      <h2>Calculadora de Fracciones</h2>
      <input 
        type="number" 
        value={numerator} 
        onChange={(e) => setNumerator(Number(e.target.value))}
        placeholder="Numerador" 
      />
      <span>/</span>
      <input 
        type="number" 
        value={denominator} 
        onChange={(e) => setDenominator(Number(e.target.value))}
        placeholder="Denominador" 
      />
      <p>Resultado: {numerator}/{denominator}</p>
    </div>
  );
}`
  })
  @IsString()
  sourceCode: string;

  @ApiPropertyOptional({
    description: 'Props del componente en formato JSON',
    example: JSON.stringify({
      initialNumerator: 1,
      initialDenominator: 2,
      showHelp: true
    })
  })
  @IsOptional()
  @IsObject()
  componentProps?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Dependencias adicionales requeridas',
    example: ['@ant-design/icons', 'framer-motion'],
    maxItems: 5
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  dependencies?: string[];

  @ApiPropertyOptional({
    description: 'Estilos CSS adicionales',
    example: '.fraction-calculator { margin: 20px; padding: 15px; }'
  })
  @IsOptional()
  @IsString()
  customStyles?: string;

  @ApiPropertyOptional({
    description: 'Configuración de sandbox para seguridad',
    example: JSON.stringify({
      allowNetworkRequests: false,
      allowLocalStorage: false,
      maxExecutionTime: 5000
    })
  })
  @IsOptional()
  @IsObject()
  sandboxConfig?: {
    allowNetworkRequests?: boolean;
    allowLocalStorage?: boolean;
    maxExecutionTime?: number;
    allowedDomains?: string[];
  };
}

// DTO de actualización
export class UpdateLessonResourceDto {
  @ApiPropertyOptional({
    description: 'Nombre del recurso',
    maxLength: 255
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Descripción del recurso'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Nivel de visibilidad',
    enum: LessonResourceVisibility
  })
  @IsOptional()
  @IsEnum(LessonResourceVisibility)
  visibility?: LessonResourceVisibility;

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

  @ApiPropertyOptional({
    description: 'Tags del recurso',
    maxItems: 10
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  tags?: string[];

  // *** CRITICAL FIX: Add TSX artifact fields to UpdateDto ***
  @ApiPropertyOptional({
    description: 'Código TypeScript/React del componente (para TSX artifacts)',
    example: `import React, { useState } from 'react';
export default function Component() {
  return <div>Updated component</div>;
}`
  })
  @IsOptional()
  @IsString()
  sourceCode?: string;

  @ApiPropertyOptional({
    description: 'Props del componente en formato JSON (para TSX artifacts)',
    example: JSON.stringify({ prop1: 'value1' })
  })
  @IsOptional()
  @IsObject()
  componentProps?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Dependencias adicionales requeridas (para TSX artifacts)',
    example: ['@ant-design/icons', 'framer-motion'],
    maxItems: 5
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  dependencies?: string[];

  @ApiPropertyOptional({
    description: 'Estilos CSS adicionales (para TSX artifacts)',
    example: '.component { margin: 20px; }'
  })
  @IsOptional()
  @IsString()
  customStyles?: string;

  @ApiPropertyOptional({
    description: 'Configuración de sandbox para seguridad (para TSX artifacts)',
    example: JSON.stringify({
      allowNetworkRequests: false,
      allowLocalStorage: false,
      maxExecutionTime: 5000
    })
  })
  @IsOptional()
  @IsObject()
  sandboxConfig?: {
    allowNetworkRequests?: boolean;
    allowLocalStorage?: boolean;
    maxExecutionTime?: number;
    allowedDomains?: string[];
  };

  // Security fields for auto-fixing tracking
  @ApiPropertyOptional({
    description: 'Indica si el código fue validado por seguridad',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  securityValidated?: boolean;

  @ApiPropertyOptional({
    description: 'Nivel de seguridad del código TSX',
    example: 'low',
    enum: ['low', 'medium', 'high']
  })
  @IsOptional()
  @IsString()
  securityLevel?: string;

  @ApiPropertyOptional({
    description: 'Indica si se aplicaron auto-fixes al código',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  wasAutoFixed?: boolean;

  @ApiPropertyOptional({
    description: 'Lista de auto-fixes aplicados',
    example: ['Added React import', 'Removed dangerous patterns'],
    maxItems: 10
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  appliedFixes?: string[];
}

// DTO para reordenar recursos
export class ReorderLessonResourcesDto {
  @ApiProperty({
    description: 'Array de IDs de recursos en el nuevo orden',
    example: [
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
      '123e4567-e89b-12d3-a456-426614174003'
    ]
  })
  @IsArray()
  @IsString({ each: true })
  resourceIds: string[];
}

// DTO para compartir recursos
export class ShareLessonResourceDto {
  @ApiProperty({
    description: 'ID del usuario con quien compartir',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  sharedWithId: string;

  @ApiProperty({
    description: 'Nivel de permisos',
    example: 'view',
    enum: ['view', 'edit', 'admin']
  })
  @IsEnum(['view', 'edit', 'admin'])
  permissionLevel: 'view' | 'edit' | 'admin';

  @ApiPropertyOptional({
    description: 'Fecha de expiración del compartir',
    example: '2024-12-31T23:59:59.000Z'
  })
  @IsOptional()
  expiresAt?: Date;
}