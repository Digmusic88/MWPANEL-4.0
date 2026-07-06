/**
 * @archivo: family-alerts.controller.ts
 * @módulo: Families (Controlador de Alertas)
 * @función: API endpoints para sistema de avisos importantes familiares
 * @crítico: SÍ - API para alertas automáticas del dashboard familiar
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { FamilyAlertsService, AlertSummaryDto } from '../services/family-alerts.service';
import { FamiliesService } from '../families.service';

@ApiTags('Family Alerts')
@Controller('families/alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FamilyAlertsController {
  private readonly logger = new Logger(FamilyAlertsController.name);

  constructor(
    private readonly familyAlertsService: FamilyAlertsService,
    private readonly familiesService: FamiliesService,
  ) {}

  @Get()
  @Roles(UserRole.FAMILY)
  @ApiOperation({ 
    summary: 'Obtener alertas familiares',
    description: 'Obtiene todas las alertas activas para la familia logueada, incluyendo resumen y detalles'
  })
  @ApiResponse({
    status: 200,
    description: 'Alertas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        totalAlerts: { type: 'number', example: 5 },
        unviewedAlerts: { type: 'number', example: 3 },
        criticalAlerts: { type: 'number', example: 1 },
        alertsByType: {
          type: 'object',
          properties: {
            pending_tasks: { type: 'number', example: 2 },
            low_subject_grade: { type: 'number', example: 1 },
            low_task_grade: { type: 'number', example: 1 },
            unjustified_absence: { type: 'number', example: 1 }
          }
        },
        alerts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid' },
              alertType: { type: 'string', example: 'pending_tasks' },
              priority: { type: 'string', example: 'high' },
              title: { type: 'string', example: '2 tarea(s) pendiente(s)' },
              description: { type: 'string', example: 'María tiene 2 tarea(s) sin entregar que ya han vencido.' },
              isViewed: { type: 'boolean', example: false },
              createdAt: { type: 'string', format: 'date-time' },
              student: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'uuid' },
                  firstName: { type: 'string', example: 'María' },
                  lastName: { type: 'string', example: 'García' }
                }
              }
            }
          }
        }
      }
    }
  })
  async getFamilyAlerts(@Request() req): Promise<AlertSummaryDto> {
    this.logger.error(`🔥 FAMILY ALERTS ENDPOINT CALLED! 🔥`);
    try {
      // Debug: log complete user object
      this.logger.log(`Debug user object: ${JSON.stringify(req.user, null, 2)}`);
      this.logger.log(`Getting family alerts for user: ${req.user.userId || req.user.sub || req.user.id}`);
      
      // Use fallback logic for user ID
      const userId = req.user.userId || req.user.sub || req.user.id;
      if (!userId) {
        throw new Error('No user ID found in request');
      }
      
      // Obtener familyId del usuario logueado
      this.logger.log(`Calling getFamilyIdFromUser with userId: ${userId}`);
      const familyId = await this.getFamilyIdFromUser(userId);
      this.logger.log(`Found family ID: ${familyId}`);
      
      // Generar alertas actualizadas
      this.logger.log(`Generating alerts for family: ${familyId}`);
      await this.familyAlertsService.generateAlertsForFamily(familyId);
      this.logger.log(`Alert generation completed for family: ${familyId}`);
      
      // Obtener y retornar alertas
      this.logger.log(`Getting family alerts for family: ${familyId}`);
      const alerts = await this.familyAlertsService.getFamilyAlerts(familyId);
      
      this.logger.log(`Successfully retrieved ${alerts.totalAlerts} alerts (${alerts.unviewedAlerts} unviewed)`);
      this.logger.log(`Alert breakdown: ${JSON.stringify(alerts.alertsByType)}`);
      return alerts;
    } catch (error) {
      this.logger.error('Error in getFamilyAlerts:', error);
      this.logger.error('Stack trace:', error.stack);
      throw error;
    }
  }

  @Post('refresh')
  @Roles(UserRole.FAMILY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Actualizar alertas familiares',
    description: 'Fuerza la regeneración de alertas para detectar cambios recientes'
  })
  @ApiResponse({
    status: 200,
    description: 'Alertas actualizadas exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Alertas actualizadas exitosamente' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  async refreshFamilyAlerts(@Request() req): Promise<{ message: string; timestamp: Date }> {
    const userId = req.user.userId || req.user.sub || req.user.id;
    const familyId = await this.getFamilyIdFromUser(userId);
    
    await this.familyAlertsService.generateAlertsForFamily(familyId);
    
    return {
      message: 'Alertas actualizadas exitosamente',
      timestamp: new Date()
    };
  }

  @Post(':alertId/view')
  @Roles(UserRole.FAMILY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Marcar alerta como vista',
    description: 'Marca una alerta específica como vista por la familia'
  })
  @ApiResponse({
    status: 200,
    description: 'Alerta marcada como vista exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Alerta marcada como vista' },
        alertId: { type: 'string', example: 'uuid' },
        viewedAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  async markAlertAsViewed(
    @Param('alertId') alertId: string,
    @Request() req
  ): Promise<{ message: string; alertId: string; viewedAt: Date }> {
    const userId = req.user.userId || req.user.sub || req.user.id;
    const familyId = await this.getFamilyIdFromUser(userId);
    
    await this.familyAlertsService.markAlertAsViewed(alertId, familyId);
    
    return {
      message: 'Alerta marcada como vista',
      alertId,
      viewedAt: new Date()
    };
  }

  @Post('view-all')
  @Roles(UserRole.FAMILY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Marcar todas las alertas como vistas',
    description: 'Marca todas las alertas activas como vistas por la familia'
  })
  @ApiResponse({
    status: 200,
    description: 'Todas las alertas marcadas como vistas exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Todas las alertas marcadas como vistas' },
        viewedAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  async markAllAlertsAsViewed(@Request() req): Promise<{ message: string; viewedAt: Date }> {
    const userId = req.user.userId || req.user.sub || req.user.id;
    const familyId = await this.getFamilyIdFromUser(userId);
    
    await this.familyAlertsService.markAllAlertsAsViewed(familyId);
    
    return {
      message: 'Todas las alertas marcadas como vistas',
      viewedAt: new Date()
    };
  }

  // ==================== MÉTODOS AUXILIARES ====================

  private async getFamilyIdFromUser(userId: string): Promise<string> {
    // Usar el servicio existente que ya maneja correctamente la lógica de familias
    try {
      const family = await this.familiesService.findFamilyByUserId(userId);
      
      if (!family) {
        throw new Error('Familia no encontrada para este usuario');
      }

      return family.id;
    } catch (error) {
      this.logger.error(`Error obteniendo familia para usuario ${userId}:`, error);
      throw new Error('Error al obtener información de la familia');
    }
  }
}