import { PartialType } from '@nestjs/swagger';
import { CreateMessageDto } from './create-message.dto';
import { IsOptional, IsBoolean, IsEnum, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MessageStatus } from '../entities/message.entity';

export class UpdateMessageDto extends PartialType(CreateMessageDto) {
  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;

  @ApiPropertyOptional({ description: 'Nuevo contenido del mensaje (para edición)' })
  @IsOptional()
  @IsString()
  newContent?: string;

  @ApiPropertyOptional({ description: 'Nuevo asunto del mensaje (para edición)' })
  @IsOptional()
  @IsString()
  newSubject?: string;
}

export class SaveConversationDraftDto {
  @ApiPropertyOptional({ description: 'Contenido del borrador' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Asunto del borrador' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Tipo de contenido (text, html, markdown)', default: 'html' })
  @IsOptional()
  @IsString()
  contentType?: string;
}

export class EditMessageDto {
  @ApiPropertyOptional({ description: 'Nuevo contenido del mensaje' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Nuevo asunto del mensaje' })
  @IsOptional()
  @IsString()
  subject?: string;
}

export class DeleteForAllDto {
  @ApiPropertyOptional({ description: 'Confirmar eliminación para todos', default: false })
  @IsOptional()
  @IsBoolean()
  confirmDeleteForAll?: boolean;
}