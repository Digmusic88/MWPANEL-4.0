import { IsNotEmpty, IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Título de la notificación' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Contenido de la notificación' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ enum: NotificationType, description: 'Tipo de notificación' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'ID del usuario destinatario' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'ID del usuario que generó la notificación' })
  @IsOptional()
  @IsUUID()
  triggeredById?: string;

  @ApiPropertyOptional({ description: 'ID del estudiante relacionado' })
  @IsOptional()
  @IsUUID()
  relatedStudentId?: string;

  @ApiPropertyOptional({ description: 'ID del grupo relacionado' })
  @IsOptional()
  @IsUUID()
  relatedGroupId?: string;

  @ApiPropertyOptional({ description: 'ID del recurso relacionado' })
  @IsOptional()
  @IsString()
  relatedResourceId?: string;

  @ApiPropertyOptional({ description: 'Tipo del recurso relacionado' })
  @IsOptional()
  @IsString()
  relatedResourceType?: string;

  @ApiPropertyOptional({ description: 'URL de acción' })
  @IsOptional()
  @IsString()
  actionUrl?: string;
}