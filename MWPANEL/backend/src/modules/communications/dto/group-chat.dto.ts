import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsEnum,
  MaxLength,
  MinLength,
  ArrayMinSize,
  ArrayMaxSize
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationType } from '../entities/conversation.entity';

// DTO para crear un grupo de chat
export class CreateGroupChatDto {
  @ApiProperty({
    description: 'Nombre del grupo',
    example: 'Profesores de Primaria',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  @MinLength(1, { message: 'El nombre del grupo es requerido' })
  @MaxLength(100, { message: 'El nombre del grupo no puede exceder 100 caracteres' })
  title: string;

  @ApiPropertyOptional({
    description: 'Descripcion del grupo',
    example: 'Grupo para coordinacion de profesores de primaria',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La descripcion no puede exceder 500 caracteres' })
  description?: string;

  @ApiProperty({
    description: 'IDs de los usuarios a incluir en el grupo',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    type: [String]
  })
  @IsArray()
  @IsUUID('4', { each: true, message: 'Cada ID de participante debe ser un UUID valido' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un participante' })
  @ArrayMaxSize(256, { message: 'No puede haber mas de 256 participantes' })
  participantIds: string[];

  @ApiPropertyOptional({
    description: 'Mensaje inicial opcional para el grupo',
    example: 'Bienvenidos al grupo de coordinacion'
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  initialMessage?: string;
}

// DTO para actualizar un grupo de chat
export class UpdateGroupChatDto {
  @ApiPropertyOptional({
    description: 'Nuevo nombre del grupo',
    example: 'Profesores de Primaria 2025'
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({
    description: 'Nueva descripcion del grupo',
    example: 'Grupo actualizado para coordinacion'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'URL del avatar del grupo',
    example: 'https://example.com/avatar.png'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;
}

// DTO para gestionar miembros del grupo
export class ManageGroupMembersDto {
  @ApiProperty({
    description: 'IDs de los usuarios a agregar/quitar del grupo',
    example: ['uuid-1', 'uuid-2'],
    type: [String]
  })
  @IsArray()
  @IsUUID('4', { each: true, message: 'Cada ID de usuario debe ser un UUID valido' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un usuario' })
  @ArrayMaxSize(100, { message: 'No puede agregar mas de 100 usuarios a la vez' })
  userIds: string[];
}

// DTO para enviar mensaje al grupo
export class SendGroupMessageDto {
  @ApiPropertyOptional({
    description: 'Contenido del mensaje (puede estar vacío si se envía un archivo adjunto como nota de voz)',
    example: '<p>Hola a todos!</p>'
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000, { message: 'El mensaje no puede exceder 10000 caracteres' })
  content?: string;

  @ApiPropertyOptional({
    description: 'Tipo de contenido del mensaje',
    example: 'html',
    enum: ['text', 'html', 'markdown'],
    default: 'html'
  })
  @IsOptional()
  @IsEnum(['text', 'html', 'markdown'])
  contentType?: 'text' | 'html' | 'markdown';
}

// DTO de respuesta para resumen de grupo
export class GroupChatSummaryDto {
  @ApiProperty({ description: 'ID del grupo' })
  id: string;

  @ApiProperty({ description: 'Nombre del grupo' })
  title: string;

  @ApiPropertyOptional({ description: 'Descripcion del grupo' })
  description?: string;

  @ApiPropertyOptional({ description: 'Avatar del grupo' })
  avatarUrl?: string;

  @ApiProperty({ description: 'Tipo de conversacion', enum: ConversationType })
  type: ConversationType;

  @ApiProperty({ description: 'Numero de participantes' })
  participantCount: number;

  @ApiProperty({ description: 'Numero de mensajes no leidos' })
  unreadCount: number;

  @ApiPropertyOptional({
    description: 'Ultimo mensaje del grupo',
    type: 'object'
  })
  lastMessage?: {
    id: string;
    content: string;
    sender: {
      id: string;
      firstName: string;
      lastName: string;
    };
    createdAt: string;
  };

  @ApiPropertyOptional({ description: 'Fecha del ultimo mensaje' })
  lastMessageAt?: string;

  @ApiProperty({ description: 'Si el grupo esta activo' })
  isActive: boolean;

  @ApiProperty({ description: 'Si el grupo esta archivado' })
  isArchived: boolean;

  @ApiProperty({ description: 'Fecha de creacion' })
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Creador del grupo',
    type: 'object'
  })
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

// DTO de respuesta para detalle de grupo
export class GroupChatDetailDto {
  @ApiProperty({ description: 'ID del grupo' })
  id: string;

  @ApiProperty({ description: 'Nombre del grupo' })
  title: string;

  @ApiPropertyOptional({ description: 'Descripcion del grupo' })
  description?: string;

  @ApiPropertyOptional({ description: 'Avatar del grupo' })
  avatarUrl?: string;

  @ApiProperty({ description: 'Tipo de conversacion' })
  type: ConversationType;

  @ApiProperty({
    description: 'Lista de participantes',
    type: 'array'
  })
  participants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    role: string;
    avatarUrl?: string;
    isCreator: boolean;
    isAdmin: boolean;
  }>;

  @ApiProperty({ description: 'Numero de participantes' })
  participantCount: number;

  @ApiProperty({ description: 'Si el grupo esta activo' })
  isActive: boolean;

  @ApiProperty({ description: 'Si el grupo esta archivado' })
  isArchived: boolean;

  @ApiProperty({ description: 'Fecha de creacion' })
  createdAt: string;

  @ApiPropertyOptional({ description: 'ID del creador del grupo' })
  createdById?: string;

  @ApiPropertyOptional({
    description: 'Creador del grupo',
    type: 'object'
  })
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

// DTO de respuesta para mensaje de grupo
export class GroupMessageDto {
  @ApiProperty({ description: 'ID del mensaje' })
  id: string;

  @ApiProperty({ description: 'Contenido del mensaje' })
  content: string;

  @ApiProperty({ description: 'Tipo de contenido' })
  contentType: 'text' | 'html' | 'markdown';

  @ApiProperty({
    description: 'Remitente del mensaje',
    type: 'object'
  })
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl?: string;
  };

  @ApiProperty({ description: 'Estado de lectura' })
  isRead: boolean;

  @ApiPropertyOptional({ description: 'Fecha de lectura' })
  readAt?: string;

  @ApiProperty({ description: 'Fecha de creacion' })
  createdAt: string;

  @ApiPropertyOptional({ description: 'Si fue editado' })
  isEdited?: boolean;

  @ApiPropertyOptional({ description: 'Fecha de edicion' })
  editedAt?: string;

  @ApiPropertyOptional({
    description: 'Archivos adjuntos',
    type: 'array'
  })
  attachments?: Array<{
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url?: string; // Google Drive URL for audio notes
  }>;

  @ApiPropertyOptional({
    description: 'Lista de usuarios que han visto el mensaje (solo para admins)',
    type: 'array',
  })
  seenBy?: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    readAt: string;
    viewCount: number;
  }>;
}
