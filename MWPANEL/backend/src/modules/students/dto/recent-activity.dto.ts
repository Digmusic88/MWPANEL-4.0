import { ApiProperty } from '@nestjs/swagger';

export class RecentActivityItemDto {
  @ApiProperty({ description: 'Tipo de actividad', example: 'user_created' })
  type: string;

  @ApiProperty({ description: 'Título de la actividad', example: 'Nuevo usuario registrado' })
  title: string;

  @ApiProperty({ description: 'Descripción detallada', example: 'Se registró un nuevo estudiante en el sistema' })
  description: string;

  @ApiProperty({ description: 'Timestamp de la actividad', example: '2025-01-15T10:30:00Z' })
  timestamp: Date;

  @ApiProperty({ description: 'Icono para mostrar', example: 'UserOutlined' })
  icon: string;

  @ApiProperty({ description: 'Color del icono', example: 'blue' })
  color: string;

  @ApiProperty({ description: 'ID del usuario relacionado', example: 'uuid', required: false })
  userId?: string;

  @ApiProperty({ description: 'Información adicional', required: false })
  metadata?: any;
}