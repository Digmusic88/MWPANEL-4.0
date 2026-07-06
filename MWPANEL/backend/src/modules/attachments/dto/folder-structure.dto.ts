import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FolderItem {
  @ApiProperty({
    description: 'ID único de la carpeta',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre de la carpeta',
    example: 'Entregas_Estudiantes',
  })
  name: string;

  @ApiProperty({
    description: 'Tipo de elemento',
    example: 'folder',
    enum: ['folder', 'file'],
  })
  type: 'folder' | 'file';

  @ApiPropertyOptional({
    description: 'ID de la carpeta padre',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Subcarpetas',
    type: [FolderItem],
  })
  children?: FolderItem[];

  @ApiPropertyOptional({
    description: 'Número de archivos en la carpeta',
    example: 15,
  })
  fileCount?: number;

  @ApiPropertyOptional({
    description: 'Tamaño total en bytes',
    example: 2048576,
  })
  totalSize?: number;
}

export class BreadcrumbItem {
  @ApiProperty({
    description: 'ID de la carpeta',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre de la carpeta',
    example: 'Matemáticas',
  })
  name: string;
}

export class FolderStructureDto {
  @ApiProperty({
    description: 'Carpeta actual',
    type: FolderItem,
  })
  currentFolder: FolderItem;

  @ApiProperty({
    description: 'Lista de carpetas',
    type: [FolderItem],
  })
  folders: FolderItem[];

  @ApiProperty({
    description: 'Ruta de navegación',
    type: [BreadcrumbItem],
  })
  breadcrumb: BreadcrumbItem[];

  @ApiProperty({
    description: 'Permisos del usuario en la carpeta actual',
  })
  permissions: {
    canUpload: boolean;
    canDelete: boolean;
    canMove: boolean;
    canCreateFolder: boolean;
  };
}