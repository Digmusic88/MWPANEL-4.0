/**
 * @archivo: email-template.dto.ts
 * @módulo: Communications - Email Notifications System
 * @función: DTOs para validación de plantillas de correo
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum, IsArray, MaxLength } from 'class-validator';
import { EmailTemplateType } from '../entities/email-template.entity';

export class CreateEmailTemplateDto {
  @ApiProperty({ description: 'Nombre de la plantilla' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: EmailTemplateType, description: 'Tipo de plantilla' })
  @IsEnum(EmailTemplateType)
  type: EmailTemplateType;

  @ApiProperty({ description: 'Asunto del email' })
  @IsString()
  @MaxLength(500)
  subject: string;

  @ApiProperty({ description: 'Contenido HTML de la plantilla' })
  @IsString()
  htmlContent: string;

  @ApiProperty({ description: 'Contenido de texto plano' })
  @IsString()
  textContent: string;

  @ApiPropertyOptional({ description: 'Variables disponibles en la plantilla' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableVariables?: string[];

  @ApiPropertyOptional({ description: 'Estado activo de la plantilla', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'ID del usuario que creó la plantilla' })
  @IsOptional()
  @IsString()
  createdById?: string;
}

export class UpdateEmailTemplateDto {
  @ApiPropertyOptional({ description: 'Nombre de la plantilla' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Asunto del email' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  @ApiPropertyOptional({ description: 'Contenido HTML de la plantilla' })
  @IsOptional()
  @IsString()
  htmlContent?: string;

  @ApiPropertyOptional({ description: 'Contenido de texto plano' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({ description: 'Variables disponibles en la plantilla' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableVariables?: string[];

  @ApiPropertyOptional({ description: 'Estado activo de la plantilla' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'ID del usuario que editó la plantilla' })
  @IsOptional()
  @IsString()
  lastEditedById?: string;
}

export class PreviewEmailTemplateDto {
  @ApiPropertyOptional({ description: 'Datos para vista previa' })
  @IsOptional()
  previewData?: Record<string, any>;
}

export class CloneEmailTemplateDto {
  @ApiProperty({ description: 'Nombre para la plantilla clonada' })
  @IsString()
  @MaxLength(200)
  newName: string;
}