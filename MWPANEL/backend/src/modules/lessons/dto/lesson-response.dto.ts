import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LessonResourceType, LessonResourceVisibility } from '../entities/lesson-resource.entity';

export class LessonWorkspaceResponseDto {
  @ApiProperty({
    description: 'ID único del workspace',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'ID de la asignación de asignatura',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  subjectAssignmentId: string;

  @ApiPropertyOptional({
    description: 'ID de la carpeta raíz en Google Drive'
  })
  driveFolderId?: string;

  @ApiProperty({
    description: 'Estado activo del workspace'
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Fecha de creación'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización'
  })
  updatedAt: Date;

  // Computed properties
  @ApiPropertyOptional({
    description: 'Información del profesor (computed)',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174002',
      name: 'María García',
      email: 'maria.garcia@colegio.es'
    }
  })
  teacher?: {
    id: string;
    name: string;
    email: string;
  };

  @ApiPropertyOptional({
    description: 'Información de la asignatura (computed)',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174003',
      name: 'Matemáticas',
      code: 'MAT'
    }
  })
  subject?: {
    id: string;
    name: string;
    code: string;
  };

  @ApiPropertyOptional({
    description: 'Información de la clase (computed)',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174004',
      name: '5º A',
      academicYear: '2023-2024'
    }
  })
  classGroup?: {
    id: string;
    name: string;
    academicYear: string;
  };

  @ApiPropertyOptional({
    description: 'Estadísticas del workspace (opcional)',
    example: {
      totalFolders: 5,
      totalResources: 25,
      resourcesByType: {
        FILE: 10,
        YOUTUBE_LINK: 5,
        INTERNAL_DOC: 8,
        TSX_ARTIFACT: 2
      }
    }
  })
  stats?: {
    totalFolders: number;
    totalResources: number;
    resourcesByType: Record<string, number>;
  };

  @ApiPropertyOptional({
    description: 'Carpetas del workspace (opcional)',
    type: [Object]
  })
  folders?: LessonFolderResponseDto[];
}

export class LessonFolderResponseDto {
  @ApiProperty({
    description: 'ID único de la carpeta',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'ID del workspace padre',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  workspaceId: string;

  @ApiProperty({
    description: 'Nombre de la lección',
    example: 'Fracciones Básicas'
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción de la lección'
  })
  description?: string;

  @ApiProperty({
    description: 'Índice de orden para presentación'
  })
  orderIndex: number;

  @ApiPropertyOptional({
    description: 'ID de la carpeta en Google Drive'
  })
  driveFolderId?: string;

  @ApiProperty({
    description: 'Estado activo de la carpeta'
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Fecha de creación'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización'
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Recursos de la carpeta (opcional)',
    type: [Object]
  })
  resources?: LessonResourceResponseDto[];

  @ApiPropertyOptional({
    description: 'Estadísticas de la carpeta (opcional)',
    example: {
      totalResources: 8,
      resourcesByType: {
        FILE: 3,
        YOUTUBE_LINK: 2,
        INTERNAL_DOC: 2,
        TSX_ARTIFACT: 1
      },
      totalViews: 156,
      lastAccessedAt: '2024-01-15T10:30:00Z'
    }
  })
  stats?: {
    totalResources: number;
    resourcesByType: Record<string, number>;
    totalViews: number;
    lastAccessedAt?: Date;
  };
}

export class LessonResourceResponseDto {
  @ApiProperty({
    description: 'ID único del recurso',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'ID de la carpeta padre',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  folderId: string;

  @ApiProperty({
    description: 'Nombre del recurso',
    example: 'Video explicativo de fracciones'
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción del recurso'
  })
  description?: string;

  @ApiProperty({
    description: 'Tipo de recurso',
    enum: LessonResourceType
  })
  type: LessonResourceType;

  @ApiProperty({
    description: 'Nivel de visibilidad',
    enum: LessonResourceVisibility
  })
  visibility: LessonResourceVisibility;

  @ApiProperty({
    description: 'Índice de orden'
  })
  orderIndex: number;

  @ApiProperty({
    description: 'Estado activo del recurso'
  })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Tags del recurso',
    type: [String]
  })
  tags?: string[];

  @ApiProperty({
    description: 'Fecha de creación'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización'
  })
  updatedAt: Date;

  // Campos específicos por tipo de recurso
  @ApiPropertyOptional({
    description: 'ID del archivo en Google Drive (para tipo FILE y PRESENTATION)'
  })
  driveFileId?: string;

  @ApiPropertyOptional({
    description: 'Nombre original del archivo (para tipo FILE)'
  })
  originalFileName?: string;

  @ApiPropertyOptional({
    description: 'Tipo MIME del archivo (para tipo FILE)'
  })
  mimeType?: string;

  @ApiPropertyOptional({
    description: 'Tamaño del archivo en bytes (para tipo FILE)'
  })
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'URL de YouTube (para tipo YOUTUBE_LINK)'
  })
  youtubeUrl?: string;

  @ApiPropertyOptional({
    description: 'ID del video de YouTube (para tipo YOUTUBE_LINK)'
  })
  youtubeVideoId?: string;

  @ApiPropertyOptional({
    description: 'Título del video de YouTube (para tipo YOUTUBE_LINK)'
  })
  youtubeTitle?: string;

  @ApiPropertyOptional({
    description: 'Duración del video en segundos (para tipo YOUTUBE_LINK)'
  })
  youtubeDuration?: number;

  @ApiPropertyOptional({
    description: 'URL del enlace web (para tipo WEB_LINK)'
  })
  webUrl?: string;

  @ApiPropertyOptional({
    description: 'Título de la página web (para tipo WEB_LINK)'
  })
  webTitle?: string;

  @ApiPropertyOptional({
    description: 'Descripción de la página web (para tipo WEB_LINK)'
  })
  webDescription?: string;

  @ApiPropertyOptional({
    description: 'Contenido HTML (para tipo INTERNAL_DOC)'
  })
  htmlContent?: string;

  @ApiPropertyOptional({
    description: 'Contenido en texto plano (para tipo INTERNAL_DOC)'
  })
  plainTextContent?: string;

  @ApiPropertyOptional({
    description: 'Tipo de presentación (para tipo PRESENTATION)'
  })
  presentationType?: string;

  @ApiPropertyOptional({
    description: 'Número de diapositivas (para tipo PRESENTATION)'
  })
  slideCount?: number;

  @ApiPropertyOptional({
    description: 'Código fuente del componente (para tipo TSX_ARTIFACT)'
  })
  sourceCode?: string;

  @ApiPropertyOptional({
    description: 'Props del componente (para tipo TSX_ARTIFACT)'
  })
  componentProps?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Dependencias del componente (para tipo TSX_ARTIFACT)'
  })
  dependencies?: string[];

  @ApiPropertyOptional({
    description: 'Estilos CSS personalizados (para tipo TSX_ARTIFACT)'
  })
  customStyles?: string;

  @ApiPropertyOptional({
    description: 'Configuración de sandbox (para tipo TSX_ARTIFACT)'
  })
  sandboxConfig?: Record<string, any>;

  // Información de creador
  @ApiPropertyOptional({
    description: 'Información del creador del recurso',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174002',
      name: 'María García',
      email: 'maria.garcia@colegio.es'
    }
  })
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };

  // Estadísticas de uso
  @ApiPropertyOptional({
    description: 'Estadísticas de uso del recurso',
    example: {
      viewCount: 45,
      downloadCount: 12,
      shareCount: 3,
      lastAccessedAt: '2024-01-15T10:30:00Z',
      avgRating: 4.5,
      totalRatings: 8
    }
  })
  stats?: {
    viewCount: number;
    downloadCount: number;
    shareCount: number;
    lastAccessedAt?: Date;
    avgRating?: number;
    totalRatings?: number;
  };

  // Información de compartición
  @ApiPropertyOptional({
    description: 'Información si el recurso está compartido conmigo',
    example: {
      sharedById: '123e4567-e89b-12d3-a456-426614174003',
      sharedByName: 'Carlos López',
      permissionLevel: 'view',
      sharedAt: '2024-01-10T09:00:00Z'
    }
  })
  shareInfo?: {
    sharedById: string;
    sharedByName: string;
    permissionLevel: string;
    sharedAt: Date;
    expiresAt?: Date;
  };
}

// DTOs para respuestas paginadas
export class PaginatedLessonResourcesResponseDto {
  @ApiProperty({
    description: 'Lista de recursos',
    type: [LessonResourceResponseDto]
  })
  data: LessonResourceResponseDto[];

  @ApiProperty({
    description: 'Información de paginación',
    example: {
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
      hasNext: true,
      hasPrev: false
    }
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  @ApiPropertyOptional({
    description: 'Filtros aplicados',
    example: {
      type: 'YOUTUBE_LINK',
      visibility: 'CLASS',
      tags: ['matemáticas', 'fracciones']
    }
  })
  filters?: Record<string, any>;
}