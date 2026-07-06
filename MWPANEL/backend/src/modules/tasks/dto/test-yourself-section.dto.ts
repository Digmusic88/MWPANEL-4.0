/**
 * @archivo: test-yourself-section.dto.ts
 * @módulo: Tasks - DTOs para Secciones Test Yourself
 * @función: DTOs para crear/actualizar secciones personalizadas
 */

import { IsString, IsOptional, IsHexColor, IsInt, Min, Max, Matches, IsUUID, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTestYourselfSectionDto {
  @ApiProperty({ description: 'Nombre de la sección', example: 'Evaluaciones Finales' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Descripción de la sección', example: 'Test Yourself para evaluaciones finales del trimestre' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Color hex de la sección', example: '#52c41a' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ description: 'Icono de Ant Design', example: 'StarOutlined' })
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

export class UpdateTestYourselfSectionDto {
  @ApiPropertyOptional({ description: 'Nombre de la sección' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Descripción de la sección' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Color hex de la sección' })
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
}

export class AssignTaskToSectionDto {
  @ApiProperty({ description: 'ID de la sección destino' })
  @IsString()
  sectionId: string;

  @ApiPropertyOptional({ description: 'Posición dentro de la sección', example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}

export class BulkAssignTasksDto {
  @ApiProperty({ description: 'ID de la sección destino' })
  @IsUUID()
  sectionId: string;

  @ApiProperty({ description: 'IDs de las tareas a asignar' })
  @IsArray()
  @IsUUID('4', { each: true })
  taskIds: string[];
}

export class ReorderSectionTasksDto {
  @ApiProperty({ description: 'Lista ordenada de task IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  taskIds: string[];
}