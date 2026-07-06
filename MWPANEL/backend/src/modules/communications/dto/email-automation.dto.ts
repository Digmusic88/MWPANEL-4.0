/**
 * @archivo: email-automation.dto.ts
 * @módulo: Communications - Email Notifications System
 * @función: DTOs para validación de automatizaciones de email
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum, IsNumber, IsObject } from 'class-validator';
import { EmailEventType, EmailRecipientType } from '../entities/email-automation.entity';

export class CreateEmailAutomationDto {
  @ApiProperty({ description: 'Nombre de la automatización' })
  @IsString()
  name: string;

  @ApiProperty({ enum: EmailEventType, description: 'Tipo de evento que dispara la automatización' })
  @IsEnum(EmailEventType)
  eventType: EmailEventType;

  @ApiProperty({ description: 'ID de la plantilla a usar' })
  @IsString()
  templateId: string;

  @ApiProperty({ enum: EmailRecipientType, description: 'Tipo de destinatario' })
  @IsEnum(EmailRecipientType)
  recipientType: EmailRecipientType;

  @ApiPropertyOptional({ description: 'Días antes del evento para enviar recordatorio' })
  @IsOptional()
  @IsNumber()
  reminderDaysBefore?: number;

  @ApiPropertyOptional({ description: 'Hora del día para enviar (HH:MM)' })
  @IsOptional()
  @IsString()
  reminderTime?: string;

  @ApiPropertyOptional({ description: 'Condiciones adicionales (JSON)' })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Enviar solo una vez por evento', default: false })
  @IsOptional()
  @IsBoolean()
  sendOnlyOnce?: boolean;

  @ApiPropertyOptional({ description: 'Máximo de emails por día' })
  @IsOptional()
  @IsNumber()
  maxEmailsPerDay?: number;

  @ApiPropertyOptional({ description: 'Estado activo de la automatización', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'ID del usuario que creó la automatización' })
  @IsOptional()
  @IsString()
  createdById?: string;
}

export class UpdateEmailAutomationDto {
  @ApiPropertyOptional({ description: 'Nombre de la automatización' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: EmailEventType, description: 'Tipo de evento que dispara la automatización' })
  @IsOptional()
  @IsEnum(EmailEventType)
  eventType?: EmailEventType;

  @ApiPropertyOptional({ description: 'ID de la plantilla a usar' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ enum: EmailRecipientType, description: 'Tipo de destinatario' })
  @IsOptional()
  @IsEnum(EmailRecipientType)
  recipientType?: EmailRecipientType;

  @ApiPropertyOptional({ description: 'Días antes del evento para enviar recordatorio' })
  @IsOptional()
  @IsNumber()
  reminderDaysBefore?: number;

  @ApiPropertyOptional({ description: 'Hora del día para enviar (HH:MM)' })
  @IsOptional()
  @IsString()
  reminderTime?: string;

  @ApiPropertyOptional({ description: 'Condiciones adicionales (JSON)' })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Enviar solo una vez por evento' })
  @IsOptional()
  @IsBoolean()
  sendOnlyOnce?: boolean;

  @ApiPropertyOptional({ description: 'Máximo de emails por día' })
  @IsOptional()
  @IsNumber()
  maxEmailsPerDay?: number;

  @ApiPropertyOptional({ description: 'Estado activo de la automatización' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}