import { IsNotEmpty, IsString, IsEnum, IsOptional, IsUUID, IsBoolean, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { MessageType, MessagePriority } from '../entities/message.entity';

export class CreateMessageDto {
  @ApiProperty({ description: 'Asunto del mensaje' })
  @ValidateIf((o) => !o.isDraft) // Solo requerido si NO es borrador
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Contenido del mensaje' })
  @ValidateIf((o) => !o.isDraft) // Solo requerido si NO es borrador
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Guardar como borrador (no se enviará hasta que se publique)',
    default: false
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isDraft?: boolean;

  @ApiPropertyOptional({ 
    description: 'Tipo de contenido (text, html, markdown)',
    default: 'html'
  })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional({ enum: MessageType, description: 'Tipo de mensaje' })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional({ enum: MessagePriority, description: 'Prioridad del mensaje' })
  @IsOptional()
  @IsEnum(MessagePriority)
  priority?: MessagePriority;

  @ApiPropertyOptional({ description: 'ID del destinatario (para mensajes directos)' })
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @ApiPropertyOptional({
    description: 'IDs de múltiples destinatarios (para mensajes directos múltiples)',
    type: [String]
  })
  @IsOptional()
  @IsUUID('4', { each: true })
  recipientIds?: string[];

  @ApiPropertyOptional({ description: 'ID del grupo destinatario (para mensajes grupales)' })
  @IsOptional()
  @IsUUID()
  targetGroupId?: string;

  @ApiPropertyOptional({ description: 'ID del grupo de difusión (para envío a grupo personalizado)' })
  @IsOptional()
  @IsUUID()
  messageGroupId?: string;

  @ApiPropertyOptional({ description: 'ID del estudiante relacionado' })
  @IsOptional()
  @IsUUID()
  relatedStudentId?: string;

  @ApiPropertyOptional({ description: 'ID del mensaje padre (para respuestas)' })
  @IsOptional()
  @IsUUID()
  parentMessageId?: string;

  @ApiPropertyOptional({ description: 'ID de la solicitud de asistencia (para mensajes de tipo ATTENDANCE_REQUEST)' })
  @IsOptional()
  @IsUUID()
  attendanceRequestId?: string;
}