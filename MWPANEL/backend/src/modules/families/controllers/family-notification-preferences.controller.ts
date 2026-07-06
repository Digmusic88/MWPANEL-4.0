/**
 * @archivo: family-notification-preferences.controller.ts
 * @módulo: Families (Controlador de Preferencias de Notificación)
 * @función: API endpoints para gestión de preferencias de email por familia
 * @crítico: SÍ - Control granular de comunicaciones automáticas
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { FamilyNotificationPreferencesService } from '../services/family-notification-preferences.service';

export class UpdateNotificationPreferencesDto {
  immediateAlerts?: boolean;
  dailySummary?: boolean;
  weeklySummary?: boolean;
  enabledAlertTypes?: string;
  maxEmailsPerDay?: number;
  maxImmediateAlertsPerHour?: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  respectQuietHours?: boolean;
  dailySummaryTime?: string;
  weeklySummaryDay?: number;
  weeklySummaryTime?: string;
  language?: 'es' | 'en';
  emailFormat?: 'html' | 'text';
  onlyCriticalImmediate?: boolean;
  includeLowPriorityInSummary?: boolean;
  digestMode?: boolean;
  digestIntervalMinutes?: number;
  sendResolutionNotifications?: boolean;
  additionalEmails?: string[];
  customSettings?: {
    subjectPrefix?: string;
    includeLogo?: boolean;
    customFooter?: string;
    emergencyContactEmail?: string;
  };
}

export class TestEmailDto {
  emailType: 'immediate' | 'daily' | 'weekly';
  recipientEmail?: string;
}

@ApiTags('Family Notification Preferences')
@Controller('families/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FamilyNotificationPreferencesController {
  constructor(
    private readonly preferencesService: FamilyNotificationPreferencesService,
  ) {}

  @Get('preferences')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ 
    summary: 'Obtener preferencias de notificación',
    description: 'Obtiene las preferencias de notificación email configuradas para la familia'
  })
  @ApiResponse({
    status: 200,
    description: 'Preferencias obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        immediateAlerts: { type: 'boolean', example: true },
        dailySummary: { type: 'boolean', example: true },
        weeklySummary: { type: 'boolean', example: true },
        enabledAlertTypes: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['pending_tasks', 'low_subject_grade']
        },
        maxEmailsPerDay: { type: 'number', example: 5 },
        quietHoursStart: { type: 'string', example: '22:00' },
        quietHoursEnd: { type: 'string', example: '08:00' },
        language: { type: 'string', example: 'es' },
        customSettings: {
          type: 'object',
          properties: {
            subjectPrefix: { type: 'string', example: '[MW Panel]' },
            includeLogo: { type: 'boolean', example: true },
            emergencyContactEmail: { type: 'string', example: 'emergencia@familia.com' }
          }
        }
      }
    }
  })
  async getNotificationPreferences(@Request() req) {
    const familyId = await this.getFamilyIdFromUser(req.user.userId);
    return this.preferencesService.getPreferences(familyId);
  }

  @Put('preferences')
  @Roles(UserRole.FAMILY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Actualizar preferencias de notificación',
    description: 'Actualiza las preferencias de notificación email para la familia'
  })
  @ApiResponse({
    status: 200,
    description: 'Preferencias actualizadas exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Preferencias actualizadas exitosamente' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  async updateNotificationPreferences(
    @Request() req,
    @Body() preferences: UpdateNotificationPreferencesDto,
  ) {
    const familyId = await this.getFamilyIdFromUser(req.user.userId);
    
    // Convertir enabledAlertTypes de string a array si es necesario
    const processedPreferences = {
      ...preferences,
      enabledAlertTypes: typeof preferences.enabledAlertTypes === 'string' 
        ? preferences.enabledAlertTypes.split(',') 
        : preferences.enabledAlertTypes
    };
    
    await this.preferencesService.updatePreferences(familyId, processedPreferences as any);
    
    return {
      message: 'Preferencias actualizadas exitosamente',
      updatedAt: new Date(),
    };
  }

  @Get('email-history')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ 
    summary: 'Obtener historial de emails',
    description: 'Obtiene el historial de emails enviados a la familia con estadísticas'
  })
  @ApiResponse({
    status: 200,
    description: 'Historial obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        totalEmails: { type: 'number', example: 25 },
        emailsThisWeek: { type: 'number', example: 5 },
        emailsToday: { type: 'number', example: 1 },
        openRate: { type: 'number', example: 85.5 },
        clickRate: { type: 'number', example: 42.3 },
        emails: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              emailType: { type: 'string', example: 'immediate' },
              subject: { type: 'string', example: 'Alerta importante: Tarea pendiente' },
              recipientEmail: { type: 'string', example: 'familia@email.com' },
              status: { type: 'string', example: 'sent' },
              sentAt: { type: 'string', format: 'date-time' },
              openedAt: { type: 'string', format: 'date-time' },
              alertCount: { type: 'number', example: 2 }
            }
          }
        }
      }
    }
  })
  async getEmailHistory(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const familyId = await this.getFamilyIdFromUser(req.user.userId);
    return this.preferencesService.getEmailHistory(familyId, page, limit);
  }

  @Post('test-email')
  @Roles(UserRole.FAMILY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Enviar email de prueba',
    description: 'Envía un email de prueba para verificar configuración y preferencias'
  })
  @ApiResponse({
    status: 200,
    description: 'Email de prueba enviado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Email de prueba enviado exitosamente' },
        sentTo: { type: 'string', example: 'familia@email.com' },
        emailType: { type: 'string', example: 'immediate' },
        sentAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  async sendTestEmail(
    @Request() req,
    @Body() testData: TestEmailDto,
  ) {
    const familyId = await this.getFamilyIdFromUser(req.user.userId);
    
    const result = await this.preferencesService.sendTestEmail(
      familyId,
      testData.emailType,
      testData.recipientEmail,
    );
    
    return {
      message: 'Email de prueba enviado exitosamente',
      sentTo: result.recipientEmail,
      emailType: testData.emailType,
      sentAt: new Date(),
    };
  }

  @Post('disable-temporarily')
  @Roles(UserRole.FAMILY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Desactivar notificaciones temporalmente',
    description: 'Desactiva temporalmente las notificaciones por email (vacaciones, etc.)'
  })
  @ApiResponse({
    status: 200,
    description: 'Notificaciones desactivadas temporalmente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Notificaciones desactivadas hasta 2024-08-15' },
        disabledUntil: { type: 'string', format: 'date-time' }
      }
    }
  })
  async disableTemporarily(
    @Request() req,
    @Body() data: { disableUntil: string; reason?: string },
  ) {
    const familyId = await this.getFamilyIdFromUser(req.user.userId);
    
    const disableUntil = new Date(data.disableUntil);
    
    await this.preferencesService.disableTemporarily(familyId, disableUntil, data.reason);
    
    return {
      message: `Notificaciones desactivadas hasta ${disableUntil.toLocaleDateString('es-ES')}`,
      disabledUntil: disableUntil,
    };
  }

  @Post('enable')
  @Roles(UserRole.FAMILY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Reactivar notificaciones',
    description: 'Reactiva las notificaciones por email si estaban desactivadas temporalmente'
  })
  @ApiResponse({
    status: 200,
    description: 'Notificaciones reactivadas exitosamente',
  })
  async enableNotifications(@Request() req) {
    const familyId = await this.getFamilyIdFromUser(req.user.userId);
    
    await this.preferencesService.enableNotifications(familyId);
    
    return {
      message: 'Notificaciones reactivadas exitosamente',
      enabledAt: new Date(),
    };
  }

  @Get('statistics')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ 
    summary: 'Obtener estadísticas de notificaciones',
    description: 'Obtiene estadísticas detalladas de emails enviados y engagement'
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        totalEmailsSent: { type: 'number', example: 42 },
        emailsThisMonth: { type: 'number', example: 12 },
        averageOpenRate: { type: 'number', example: 78.5 },
        averageClickRate: { type: 'number', example: 34.2 },
        mostEngagedEmailType: { type: 'string', example: 'immediate' },
        byType: {
          type: 'object',
          properties: {
            immediate: { 
              type: 'object',
              properties: {
                sent: { type: 'number', example: 15 },
                opened: { type: 'number', example: 12 },
                clicked: { type: 'number', example: 8 }
              }
            },
            daily: { 
              type: 'object',
              properties: {
                sent: { type: 'number', example: 20 },
                opened: { type: 'number', example: 18 },
                clicked: { type: 'number', example: 14 }
              }
            },
            weekly: { 
              type: 'object',
              properties: {
                sent: { type: 'number', example: 7 },
                opened: { type: 'number', example: 6 },
                clicked: { type: 'number', example: 5 }
              }
            }
          }
        }
      }
    }
  })
  async getNotificationStatistics(@Request() req) {
    const familyId = await this.getFamilyIdFromUser(req.user.userId);
    return this.preferencesService.getNotificationStatistics(familyId);
  }

  // ==================== MÉTODOS AUXILIARES ====================

  private async getFamilyIdFromUser(userId: string): Promise<string> {
    // Usar el service que ya tiene el método implementado
    return await this.preferencesService.getFamilyIdFromUserId(userId);
  }
}