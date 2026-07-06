import { IsString, IsOptional, IsDateString, IsBoolean, IsEnum, IsArray, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCoordinationSheetDto {
  @ApiProperty({ description: 'Título de la reunión', example: 'Reunión Claustro 15/11/2024' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Descripción opcional de la reunión', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Fecha de la reunión', example: '2024-11-15' })
  @IsDateString()
  meeting_date: string;

  @ApiProperty({ description: 'Nivel de permisos', enum: ['open', 'restricted', 'readonly'], default: 'open' })
  @IsEnum(['open', 'restricted', 'readonly'])
  @IsOptional()
  permission_level?: 'open' | 'restricted' | 'readonly';

  @ApiProperty({ description: 'IDs de usuarios con permisos de edición', required: false })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  allowed_editors?: string[];

  @ApiProperty({ description: 'Si la hoja es editable', default: true })
  @IsOptional()
  @IsBoolean()
  is_editable?: boolean;

  @ApiProperty({ description: 'Si la hoja está activa', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}