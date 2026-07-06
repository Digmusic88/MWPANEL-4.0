import { IsString, IsUUID, IsOptional, IsEnum, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ 
    description: 'ID del usuario participante en la conversación',
    example: 'e1234567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  participantId: string;

  @ApiPropertyOptional({ 
    description: 'Título opcional para la conversación',
    example: 'Consulta sobre calificaciones de Juan'
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ 
    description: 'Mensaje inicial de la conversación',
    example: 'Hola, me gustaría consultarle sobre las calificaciones de mi hijo.'
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  initialMessage: string;

  @ApiPropertyOptional({ 
    description: 'Tipo de contenido del mensaje inicial',
    example: 'html',
    enum: ['text', 'html', 'markdown'],
    default: 'html'
  })
  @IsOptional()
  @IsEnum(['text', 'html', 'markdown'])
  contentType?: 'text' | 'html' | 'markdown';
}

export class CreateConversationMessageDto {
  @ApiProperty({ 
    description: 'Contenido del mensaje',
    example: '<p>Gracias por la información. <strong>Muy útil</strong>.</p>'
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({ 
    description: 'Tipo de contenido del mensaje',
    example: 'html',
    enum: ['text', 'html', 'markdown'],
    default: 'html'
  })
  @IsOptional()
  @IsEnum(['text', 'html', 'markdown'])
  contentType?: 'text' | 'html' | 'markdown';

  @ApiPropertyOptional({ 
    description: 'ID del mensaje padre (para respuestas en hilo)',
    example: 'e1234567-e89b-12d3-a456-426614174001'
  })
  @IsOptional()
  @IsUUID()
  parentMessageId?: string;
}

export class ConversationSummaryDto {
  @ApiProperty({ 
    description: 'ID de la conversación',
    example: 'e1234567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiPropertyOptional({ 
    description: 'Título de la conversación',
    example: 'Consulta sobre calificaciones'
  })
  title?: string;

  @ApiProperty({ 
    description: 'Información del participante',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'e1234567-e89b-12d3-a456-426614174001' },
      profile: {
        type: 'object',
        properties: {
          firstName: { type: 'string', example: 'María' },
          lastName: { type: 'string', example: 'García' }
        }
      },
      role: { type: 'string', example: 'teacher' }
    }
  })
  participant: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
    role: string;
  };

  @ApiPropertyOptional({ 
    description: 'Último mensaje de la conversación',
    type: 'object',
    properties: {
      id: { type: 'string' },
      content: { type: 'string' },
      sender: { type: 'object' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  })
  lastMessage?: {
    id: string;
    content: string;
    sender: {
      id: string;
      profile: {
        firstName: string;
        lastName: string;
      };
    };
    createdAt: string;
  };

  @ApiProperty({ 
    description: 'Número de mensajes no leídos',
    example: 2
  })
  unreadCount: number;

  @ApiProperty({ 
    description: 'Fecha y hora del último mensaje',
    example: '2025-01-15T10:30:00Z'
  })
  lastMessageAt: string;

  @ApiProperty({ 
    description: 'Estado activo de la conversación',
    example: true
  })
  isActive: boolean;
}

export class ConversationMessageDto {
  @ApiProperty({ description: 'ID del mensaje' })
  id: string;

  @ApiProperty({ description: 'Contenido del mensaje' })
  content: string;

  @ApiProperty({ description: 'Tipo de contenido', enum: ['text', 'html', 'markdown'] })
  contentType: 'text' | 'html' | 'markdown';

  @ApiProperty({
    description: 'Información del remitente',
    type: 'object'
  })
  sender: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };

  @ApiPropertyOptional({
    description: 'Información del destinatario',
    type: 'object'
  })
  recipient?: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };

  @ApiProperty({ description: 'Estado de lectura del mensaje' })
  isRead: boolean;

  @ApiPropertyOptional({ description: 'Fecha y hora de lectura' })
  readAt?: string;

  @ApiProperty({ description: 'Fecha y hora de creación' })
  createdAt: string;

  @ApiPropertyOptional({ description: 'ID del mensaje padre' })
  parentMessageId?: string;

  @ApiPropertyOptional({ description: 'Indica si el mensaje ha sido editado' })
  isEdited?: boolean;

  @ApiPropertyOptional({ description: 'Fecha y hora de la última edición' })
  editedAt?: string;
}

export class ConversationDetailDto {
  @ApiProperty({ description: 'ID de la conversación' })
  id: string;

  @ApiPropertyOptional({ description: 'Título de la conversación' })
  title?: string;

  @ApiProperty({ description: 'Participante de la conversación' })
  participant: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };

  @ApiProperty({ 
    description: 'Mensajes de la conversación',
    type: [ConversationMessageDto]
  })
  messages: ConversationMessageDto[];

  @ApiProperty({ description: 'Fecha del último mensaje' })
  lastMessageAt: string;

  @ApiProperty({ description: 'Estado activo de la conversación' })
  isActive: boolean;
}