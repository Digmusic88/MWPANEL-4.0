import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SettingType, SettingCategory } from '../entities/system-setting.entity';

export class CreateSystemSettingDto {
  @ApiProperty({
    description: 'Clave única del setting',
    example: 'module_expedientes_enabled',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    description: 'Nombre descriptivo del setting',
    example: 'Módulo de Expedientes Habilitado',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción del setting',
    example: 'Habilita o deshabilita el módulo de expedientes académicos',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Tipo de dato del setting',
    enum: SettingType,
    example: SettingType.BOOLEAN,
  })
  @IsEnum(SettingType)
  type: SettingType;

  @ApiProperty({
    description: 'Categoría del setting',
    enum: SettingCategory,
    example: SettingCategory.MODULES,
  })
  @IsEnum(SettingCategory)
  category: SettingCategory;

  @ApiProperty({
    description: 'Valor del setting (como string)',
    example: 'true',
  })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({
    description: 'Valor por defecto',
    example: 'false',
  })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional({
    description: 'Si el setting es editable',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isEditable?: boolean;

  @ApiPropertyOptional({
    description: 'Si requiere reinicio para aplicarse',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresRestart?: boolean;

  @ApiPropertyOptional({
    description: 'Reglas de validación (JSON)',
    example: '{"min": 0, "max": 100}',
  })
  @IsOptional()
  @IsString()
  validationRules?: string;

  @ApiPropertyOptional({
    description: 'Orden de clasificación',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateSystemSettingDto {
  @ApiPropertyOptional({
    description: 'Nombre descriptivo del setting',
    example: 'Módulo de Expedientes Habilitado',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Descripción del setting',
    example: 'Habilita o deshabilita el módulo de expedientes académicos',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Valor del setting (como string)',
    example: 'true',
  })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({
    description: 'Orden de clasificación',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class SystemSettingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description?: string;

  @ApiProperty({ enum: SettingType })
  type: SettingType;

  @ApiProperty({ enum: SettingCategory })
  category: SettingCategory;

  @ApiProperty()
  value: string;

  @ApiProperty()
  parsedValue: any;

  @ApiProperty()
  defaultValue?: string;

  @ApiProperty()
  isEditable: boolean;

  @ApiProperty()
  requiresRestart: boolean;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}