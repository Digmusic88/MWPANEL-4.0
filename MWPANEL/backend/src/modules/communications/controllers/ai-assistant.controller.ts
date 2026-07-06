import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { AIAssistantService, AIResponse, UserPermissions, UsageStats } from '../services/ai-assistant.service';

interface AIRequestDto {
  messageContent: string;
  options?: {
    tone?: 'formal' | 'empático' | 'informativo' | 'neutro';
    messageContext?: string[];
    senderRole?: string;
    recipientRole?: string;
    relatedStudent?: string;
    senderId?: string;
    recipientId?: string;
    messageId?: string;
  };
}

interface AIComposeRequestDto {
  intention: string; // El prompt/intención de lo que se quiere escribir
  recipientId?: string; // A quién va dirigido
  recipientName?: string; // Nombre del destinatario
  relatedStudent?: string; // Estudiante relacionado
  messageType?: 'announcement' | 'direct' | 'concern' | 'question' | 'request';
  tone?: 'formal' | 'empático' | 'informativo' | 'neutro';
}

@ApiTags('communications-ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('communications/ai')
export class AIAssistantController {
  constructor(private readonly aiAssistantService: AIAssistantService) {}

  @Post('compose-message')
  @ApiOperation({ summary: 'Componer mensaje nuevo con IA desde intención/prompt' })
  @ApiResponse({ 
    status: 200, 
    description: 'Mensaje compuesto exitosamente',
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        suggestions: { type: 'array', items: { type: 'string' } },
        confidence: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Usuario sin permisos para usar IA' })
  @ApiResponse({ status: 503, description: 'Servicio de IA no disponible' })
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async composeMessage(@Request() req: any, @Body() composeRequest: AIComposeRequestDto): Promise<AIResponse> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const userRole = req.user?.role;

    // Verificar permisos específicos
    if (!await this.aiAssistantService.canUserUseAI(userId, userRole)) {
      throw new ForbiddenException('No tienes permisos para usar la funcionalidad de IA');
    }

    // Validar intención del mensaje
    if (!composeRequest.intention?.trim()) {
      throw new BadRequestException('La intención del mensaje es requerida');
    }

    // Verificar si el servicio está habilitado
    if (!await this.aiAssistantService.isServiceEnabled()) {
      throw new ForbiddenException('El servicio de IA está temporalmente deshabilitado');
    }

    try {
      const response = await this.aiAssistantService.composeMessage(
        composeRequest.intention,
        {
          userRole,
          userId,
          recipientId: composeRequest.recipientId,
          recipientName: composeRequest.recipientName,
          relatedStudent: composeRequest.relatedStudent,
          messageType: composeRequest.messageType || 'direct',
          tone: composeRequest.tone || 'empático',
        }
      );

      return response;
    } catch (error) {
      console.error('Error in AI message composition:', error);
      throw new BadRequestException('Error al componer mensaje automático');
    }
  }

  @Post('generate-response')
  @ApiOperation({ summary: 'Generar respuesta automática con IA' })
  @ApiResponse({ 
    status: 200, 
    description: 'Respuesta generada exitosamente',
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        suggestions: { type: 'array', items: { type: 'string' } },
        confidence: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Usuario sin permisos para usar IA' })
  @ApiResponse({ status: 503, description: 'Servicio de IA no disponible' })
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async generateResponse(@Request() req: any, @Body() aiRequest: AIRequestDto): Promise<AIResponse> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const userRole = req.user?.role;

    // Verificar permisos específicos
    if (!await this.aiAssistantService.canUserUseAI(userId, userRole)) {
      throw new ForbiddenException('No tienes permisos para usar la funcionalidad de IA');
    }

    // Validar contenido del mensaje
    if (!aiRequest.messageContent?.trim()) {
      throw new BadRequestException('El contenido del mensaje es requerido');
    }

    // Verificar si el servicio está habilitado
    if (!await this.aiAssistantService.isServiceEnabled()) {
      throw new ForbiddenException('El servicio de IA está temporalmente deshabilitado');
    }

    try {
      const response = await this.aiAssistantService.generateResponse(
        aiRequest.messageContent,
        {
          ...aiRequest.options,
          userRole,
          userId,
          senderId: aiRequest.options?.senderId,
          recipientId: userId, // El usuario actual es quien responde
          messageContent: aiRequest.messageContent,
        }
      );

      return response;
    } catch (error) {
      console.error('Error in AI response generation:', error);
      throw new BadRequestException('Error al generar respuesta automática');
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Verificar estado del servicio de IA' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estado del servicio obtenido',
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        provider: { type: 'string' },
        modelsAvailable: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.FAMILY, UserRole.STUDENT)
  async getAIStatus() {
    const status = await this.aiAssistantService.getServiceStatus();
    return status;
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Verificar permisos de IA del usuario actual' })
  @ApiResponse({ 
    status: 200, 
    description: 'Permisos verificados',
    schema: {
      type: 'object',
      properties: {
        canUseAI: { type: 'boolean' },
        dailyUsage: { type: 'number' },
        dailyLimit: { type: 'number' },
        remainingRequests: { type: 'number' }
      }
    }
  })
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.FAMILY, UserRole.STUDENT)
  async getUserPermissions(@Request() req: any): Promise<UserPermissions> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const userRole = req.user?.role;

    const permissions = await this.aiAssistantService.getUserPermissions(userId, userRole);
    return permissions;
  }

  @Get('usage-stats')
  @ApiOperation({ summary: 'Obtener estadísticas de uso de IA del usuario' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estadísticas obtenidas',
    schema: {
      type: 'object',
      properties: {
        totalRequests: { type: 'number' },
        successfulRequests: { type: 'number' },
        todayUsage: { type: 'number' },
        averageResponseTime: { type: 'number' },
        lastUsed: { type: 'string' }
      }
    }
  })
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getUserUsageStats(@Request() req: any): Promise<UsageStats> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const stats = await this.aiAssistantService.getUserUsageStats(userId);
    return stats;
  }
}