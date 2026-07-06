import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, IsHexColor, MinLength, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomTabDto {
  @ApiProperty({
    description: 'Nombre de la pestaña personalizada',
    example: 'Evaluaciones Finales',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción de la pestaña',
    example: 'Evaluaciones del final del trimestre'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Color de la pestaña en formato hexadecimal',
    example: '#1890ff',
    default: '#1890ff'
  })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({
    description: 'Icono de la pestaña',
    example: 'FolderOutlined',
    default: 'FolderOutlined'
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({
    description: 'Índice de orden para la pestaña',
    example: 0,
    default: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'Si es la pestaña por defecto',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateCustomTabDto {
  @ApiPropertyOptional({
    description: 'Nombre de la pestaña personalizada',
    example: 'Evaluaciones Finales Actualizadas'
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Descripción de la pestaña',
    example: 'Nueva descripción de la pestaña'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Color de la pestaña en formato hexadecimal',
    example: '#52c41a'
  })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({
    description: 'Icono de la pestaña',
    example: 'StarOutlined'
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({
    description: 'Índice de orden para la pestaña',
    example: 1
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'Si la pestaña está activa',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignTaskToTabDto {
  @ApiProperty({
    description: 'ID de la pestaña personalizada',
    example: 'uuid-de-la-pestana'
  })
  @IsString()
  @IsNotEmpty()
  customTabId: string;
}

export class BulkAssignTasksDto {
  @ApiProperty({
    description: 'IDs de las tareas a asignar',
    example: ['task-id-1', 'task-id-2']
  })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  taskIds: string[];

  @ApiProperty({
    description: 'ID de la pestaña personalizada',
    example: 'uuid-de-la-pestana'
  })
  @IsString()
  @IsNotEmpty()
  customTabId: string;
}

export class ReorderTabsDto {
  @ApiProperty({
    description: 'Array de IDs de pestañas en el nuevo orden',
    example: ['tab-id-1', 'tab-id-2', 'tab-id-3']
  })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  tabIds: string[];
}