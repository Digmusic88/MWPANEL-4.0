/**
 * @archivo: custom-tab.dto.ts
 * @módulo: Tasks - DTOs para Custom Tabs
 * @función: DTOs para crear/actualizar pestañas personalizadas
 */

import { IsString, IsOptional, IsHexColor, IsInt, Min, Max, Matches, IsUUID, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomTabDto {
  @ApiProperty({ description: 'Nombre de la pestaña personalizada', example: 'Matemáticas Avanzadas' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Descripción de la pestaña', example: 'Test Yourself para matemáticas de nivel avanzado' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Color hex de la pestaña', example: '#52c41a' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ description: 'Icono de Ant Design', example: 'CalculatorOutlined' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z][a-zA-Z]*Outlined$/, { message: 'Icon must be a valid Ant Design icon name ending with "Outlined"' })
  icon?: string;

  @ApiPropertyOptional({ description: 'Orden de visualización', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  orderIndex?: number;
}

export class UpdateCustomTabDto {
  @ApiPropertyOptional({ description: 'Nombre de la pestaña personalizada' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Descripción de la pestaña' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Color hex de la pestaña' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ description: 'Icono de Ant Design' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z][a-zA-Z]*Outlined$/, { message: 'Icon must be a valid Ant Design icon name ending with "Outlined"' })
  icon?: string;

  @ApiPropertyOptional({ description: 'Orden de visualización' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  orderIndex?: number;

  @ApiPropertyOptional({ description: 'Estado activo/inactivo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignTaskToTabDto {
  @ApiProperty({ description: 'ID de la pestaña destino' })
  @IsString()
  tabId: string;
}

export class BulkAssignTasksToTabDto {
  @ApiProperty({ description: 'ID de la pestaña destino' })
  @IsUUID()
  tabId: string;

  @ApiProperty({ description: 'IDs de las tareas a asignar' })
  @IsArray()
  @IsUUID('4', { each: true })
  taskIds: string[];
}

export class CustomTabResponseDto {
  @ApiProperty({ description: 'ID de la pestaña' })
  id: string;

  @ApiProperty({ description: 'Nombre de la pestaña' })
  name: string;

  @ApiPropertyOptional({ description: 'Descripción de la pestaña' })
  description?: string;

  @ApiProperty({ description: 'Color de la pestaña' })
  color: string;

  @ApiProperty({ description: 'Icono de la pestaña' })
  icon: string;

  @ApiProperty({ description: 'Orden de visualización' })
  orderIndex: number;

  @ApiProperty({ description: 'ID del profesor propietario' })
  teacherId: string;

  @ApiProperty({ description: 'Estado activo' })
  isActive: boolean;

  @ApiProperty({ description: 'Es pestaña por defecto' })
  isDefault: boolean;

  @ApiProperty({ description: 'Número de tareas asignadas' })
  taskCount: number;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt: Date;
}