/**
 * @archivo: progress-tracking.controller.ts
 * @módulo: Assignments - Controllers
 * @función: Controlador especializado para tracking de progreso y analytics
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Controlador especializado en operaciones de seguimiento de progreso, analytics
 * y métricas de engagement. Complementa al controlador principal de campañas.
 * 
 * FUNCIONALIDADES:
 * - Endpoints de tracking de actividad
 * - Dashboards personalizados por rol
 * - Analytics y reportes avanzados
 * - Métricas de engagement en tiempo real
 * - Alertas y notificaciones automáticas
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.3
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  Logger,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { 
  ProgressTrackingService, 
  StudentProgressDashboard, 
  ProgressReport, 
  RecordActivityDto, 
  MarkCompletionDto 
} from '../services/progress-tracking.service';

/**
 * Interface para request autenticado
 */
interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * DTOs para endpoints específicos
 */
export class BatchActivityDto {
  activities: RecordActivityDto[];
  userId?: string; // Para admins que registran actividad de otros
}

export class ProgressMetricsQueryDto {
  userIds?: string[];
  campaignIds?: string[];
  startDate?: string;
  endDate?: string;
  includeDetailedMetrics?: boolean;
  groupBy?: 'day' | 'week' | 'month';
}

export class AlertConfigDto {
  userId: string;
  campaignId: string;
  alertType: 'OVERDUE' | 'LOW_ENGAGEMENT' | 'COMPLETION_MILESTONE' | 'TIME_REMINDER';
  thresholds: {
    overdueHours?: number;
    minEngagementScore?: number;
    completionPercentage?: number;
    reminderHours?: number;
  };
  notificationMethods: ('EMAIL' | 'IN_APP' | 'PUSH')[];
  isActive: boolean;
}

@ApiTags('Progress Tracking')
@ApiBearerAuth()
@Controller('assignments/progress')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ProgressTrackingController {
  private readonly logger = new Logger(ProgressTrackingController.name);

  constructor(
    private readonly progressService: ProgressTrackingService,
  ) {}

  // === ENDPOINTS DE TRACKING DE ACTIVIDAD ===

  /**
   * Registrar actividad individual
   */
  @Post('activity')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Registrar actividad individual',
    description: 'Registra una actividad específica del usuario en tiempo real.'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        campaignId: { type: 'string', description: 'UUID de la campaña' },
        resourceId: { type: 'string', description: 'UUID del recurso' },
        activityType: { 
          type: 'string', 
          enum: ['VIEW', 'DOWNLOAD', 'INTERACTION', 'TIME_SPENT', 'COMPLETION'],
          description: 'Tipo de actividad'
        },
        activityData: {
          type: 'object',
          properties: {
            duration: { type: 'number', description: 'Duración en segundos' },
            pageViews: { type: 'number', description: 'Número de vistas' },
            interactions: { type: 'array', description: 'Lista de interacciones detalladas' },
            completionPercentage: { type: 'number', minimum: 0, maximum: 100 },
            contextData: { type: 'object', description: 'Datos contextuales adicionales' }
          }
        },
        timestamp: { type: 'string', format: 'date-time', description: 'Timestamp de la actividad' }
      },
      required: ['campaignId', 'resourceId', 'activityType', 'activityData']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Actividad registrada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Actividad registrada exitosamente' },
        data: {
          type: 'object',
          properties: {
            progressId: { type: 'string' },
            engagementScore: { type: 'number' },
            completionPercentage: { type: 'number' },
            timeSpent: { type: 'number' }
          }
        }
      }
    }
  })
  async recordActivity(
    @Body() activityData: RecordActivityDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.logger.log(`Recording activity for user ${req.user.userId}: ${activityData.activityType}`);

    const result = await this.progressService.recordActivity(
      req.user.userId,
      {
        ...activityData,
        timestamp: activityData.timestamp || new Date(),
      },
    );

    return {
      success: true,
      message: 'Actividad registrada exitosamente',
      data: {
        progressId: result.id,
        engagementScore: result.engagementScore,
        completionPercentage: result.completionPercentage,
        timeSpent: result.timeSpent,
      },
    };
  }

  /**
   * Registrar múltiples actividades (batch)
   */
  @Post('activity/batch')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Registrar múltiples actividades',
    description: 'Registra múltiples actividades de forma masiva para optimizar rendimiento.'
  })
  @ApiBody({ 
    type: BatchActivityDto,
    description: 'Lista de actividades a registrar'
  })
  @ApiResponse({
    status: 201,
    description: 'Actividades registradas exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Actividades registradas exitosamente' },
        data: {
          type: 'object',
          properties: {
            processed: { type: 'number', description: 'Número de actividades procesadas' },
            successful: { type: 'number', description: 'Número de actividades exitosas' },
            errors: { type: 'array', description: 'Lista de errores si los hubiera' }
          }
        }
      }
    }
  })
  async recordBatchActivity(
    @Body() batchData: BatchActivityDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const targetUserId = batchData.userId || req.user.userId;
    this.logger.log(`Recording batch activity for user ${targetUserId}: ${batchData.activities.length} activities`);

    const results = {
      processed: batchData.activities.length,
      successful: 0,
      errors: [] as any[],
    };

    for (const activity of batchData.activities) {
      try {
        await this.progressService.recordActivity(targetUserId, {
          ...activity,
          timestamp: activity.timestamp || new Date(),
        });
        results.successful++;
      } catch (error) {
        results.errors.push({
          activity,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      message: 'Actividades registradas exitosamente',
      data: results,
    };
  }

  /**
   * Marcar recurso como completado
   */
  @Post('completion')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Marcar recurso como completado',
    description: 'Marca un recurso como completado con feedback y evaluación del estudiante.'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        campaignId: { type: 'string', description: 'UUID de la campaña' },
        resourceId: { type: 'string', description: 'UUID del recurso' },
        completionData: {
          type: 'object',
          properties: {
            selfRating: { type: 'number', minimum: 1, maximum: 5, description: 'Auto-evaluación del estudiante' },
            feedback: { type: 'string', maxLength: 1000, description: 'Comentario del estudiante' },
            learningOutcomeAchieved: { type: 'boolean', description: 'Objetivo de aprendizaje logrado' },
            difficultyPerceived: { type: 'number', minimum: 1, maximum: 5, description: 'Dificultad percibida' },
            timeSpent: { type: 'number', minimum: 0, description: 'Tiempo total empleado en segundos' },
            finalCompletionPercentage: { type: 'number', minimum: 0, maximum: 100, description: 'Porcentaje final completado' }
          },
          required: ['timeSpent']
        }
      },
      required: ['campaignId', 'resourceId', 'completionData']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Recurso marcado como completado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Recurso completado exitosamente' },
        data: {
          type: 'object',
          properties: {
            progressId: { type: 'string' },
            campaignCompleted: { type: 'boolean', description: 'Si la campaña completa fue terminada' },
            achievements: { type: 'array', description: 'Logros desbloqueados' },
            nextRecommendations: { type: 'array', description: 'Próximas recomendaciones' }
          }
        }
      }
    }
  })
  async markAsCompleted(
    @Body() completionData: MarkCompletionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.logger.log(`Marking completion for user ${req.user.userId}: ${completionData.resourceId}`);

    const result = await this.progressService.markAsCompleted(
      req.user.userId,
      completionData,
    );

    return {
      success: true,
      message: 'Recurso completado exitosamente',
      data: {
        progressId: result.id,
        campaignCompleted: result.isCompleted,
        achievements: [], // TODO: Implementar sistema de logros
        nextRecommendations: [], // TODO: Implementar recomendaciones
      },
    };
  }

  // === ENDPOINTS DE DASHBOARDS ===

  /**
   * Dashboard de progreso individual
   */
  @Get('dashboard/:userId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ 
    summary: 'Dashboard de progreso individual',
    description: 'Dashboard completo con campañas activas, completadas, logros y estadísticas.'
  })
  @ApiParam({ 
    name: 'userId', 
    type: 'string', 
    description: 'UUID del usuario (o "me" para el usuario actual)' 
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            activeCampaigns: { type: 'array' },
            completedCampaigns: { type: 'array' },
            upcomingDeadlines: { type: 'array' },
            achievements: { type: 'array' },
            overallStats: {
              type: 'object',
              properties: {
                totalCampaignsAssigned: { type: 'number' },
                totalCampaignsCompleted: { type: 'number' },
                averageCompletionTime: { type: 'number' },
                averageRating: { type: 'number' },
                totalTimeSpent: { type: 'number' },
                currentStreak: { type: 'number' }
              }
            }
          }
        }
      }
    }
  })
  async getProgressDashboard(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const targetUserId = userId === 'me' ? req.user.userId : userId;
    
    this.logger.log(`Getting progress dashboard for user: ${targetUserId}`);

    // TODO: Validar permisos de acceso a datos de otro usuario
    const result = await this.progressService.getStudentProgressDashboard(targetUserId);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Dashboard comparativo de clase
   */
  @Get('dashboard/class/:classId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ 
    summary: 'Dashboard comparativo de clase',
    description: 'Vista comparativa del progreso de todos los estudiantes de una clase.'
  })
  @ApiParam({ 
    name: 'classId', 
    type: 'string', 
    description: 'UUID de la clase' 
  })
  @ApiQuery({ 
    name: 'campaignId', 
    type: 'string', 
    required: false, 
    description: 'Filtrar por campaña específica' 
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard de clase obtenido exitosamente'
  })
  async getClassProgressDashboard(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Request() req: AuthenticatedRequest,
    @Query('campaignId') campaignId?: string,
  ) {
    this.logger.log(`Getting class progress dashboard: ${classId} for user: ${req.user.userId}`);

    // TODO: Implementar dashboard de clase
    const result = {
      classInfo: { id: classId, name: 'Clase Ejemplo' },
      students: [],
      aggregatedMetrics: {
        totalStudents: 0,
        averageCompletion: 0,
        averageEngagement: 0,
        strugglingStudents: [],
        topPerformers: [],
      },
      campaignProgress: [],
    };

    return {
      success: true,
      data: result,
    };
  }

  // === ENDPOINTS DE ANALYTICS ===

  /**
   * Métricas de progreso agregadas
   */
  @Get('metrics')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ 
    summary: 'Métricas de progreso agregadas',
    description: 'Obtiene métricas agregadas de progreso con filtros avanzados y agrupación.'
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas obtenidas exitosamente'
  })
  async getProgressMetrics(
    @Query() query: ProgressMetricsQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.logger.log(`Getting progress metrics for user: ${req.user.userId}`);

    // TODO: Implementar métricas agregadas
    const result = {
      timeRange: {
        start: query.startDate || new Date().toISOString(),
        end: query.endDate || new Date().toISOString(),
        groupBy: query.groupBy || 'day',
      },
      aggregatedMetrics: {
        totalActivities: 0,
        averageCompletionRate: 0,
        averageEngagementScore: 0,
        totalTimeSpent: 0,
        uniqueParticipants: 0,
      },
      timeSeriesData: [],
      campaignBreakdown: [],
      resourceEffectiveness: [],
    };

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Análisis de engagement
   */
  @Get('analytics/engagement')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ 
    summary: 'Análisis de engagement',
    description: 'Análisis detallado de patrones de engagement y participación.'
  })
  @ApiQuery({ 
    name: 'timeframe', 
    type: 'string', 
    enum: ['day', 'week', 'month', 'quarter'], 
    required: false,
    description: 'Marco temporal para el análisis'
  })
  @ApiResponse({
    status: 200,
    description: 'Análisis de engagement obtenido exitosamente'
  })
  async getEngagementAnalytics(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'quarter' = 'week',
    @Request() req: AuthenticatedRequest,
  ) {
    this.logger.log(`Getting engagement analytics for user: ${req.user.userId}, timeframe: ${timeframe}`);

    // TODO: Implementar análisis de engagement
    const result = {
      overview: {
        averageEngagement: 0,
        engagementTrend: 'STABLE' as const,
        activeUsers: 0,
        sessionsPerUser: 0,
      },
      engagementPatterns: {
        peakHours: [],
        peakDays: [],
        averageSessionDuration: 0,
        bounceRate: 0,
      },
      contentAnalysis: {
        mostEngagingResources: [],
        leastEngagingResources: [],
        resourceTypeEngagement: [],
      },
      userSegmentation: {
        highEngagement: { count: 0, percentage: 0 },
        mediumEngagement: { count: 0, percentage: 0 },
        lowEngagement: { count: 0, percentage: 0 },
      },
    };

    return {
      success: true,
      data: result,
    };
  }

  // === ENDPOINTS DE REPORTES ===

  /**
   * Reporte detallado de progreso
   */
  @Post('reports/detailed')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Generar reporte detallado de progreso',
    description: 'Genera reporte exhaustivo con análisis, tendencias y recomendaciones.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userIds: { type: 'array', items: { type: 'string' }, description: 'Usuarios a incluir' },
        campaignIds: { type: 'array', items: { type: 'string' }, description: 'Campañas a incluir (opcional)' },
        dateRange: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' }
          }
        },
        includeRecommendations: { type: 'boolean', description: 'Incluir recomendaciones automáticas' },
        reportFormat: { type: 'string', enum: ['JSON', 'PDF', 'EXCEL'], description: 'Formato del reporte' }
      },
      required: ['userIds']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Reporte generado exitosamente'
  })
  async generateDetailedReport(
    @Body() reportRequest: {
      userIds: string[];
      campaignIds?: string[];
      dateRange?: { start: Date; end: Date };
      includeRecommendations?: boolean;
      reportFormat?: 'JSON' | 'PDF' | 'EXCEL';
    },
    @Request() req: AuthenticatedRequest,
  ) {
    this.logger.log(`Generating detailed report for ${reportRequest.userIds.length} users by ${req.user.userId}`);

    const result = await this.progressService.generateProgressReport(
      reportRequest.userIds,
      reportRequest.campaignIds,
      reportRequest.dateRange,
    );

    return {
      success: true,
      message: 'Reporte generado exitosamente',
      data: result,
      metadata: {
        generatedBy: req.user.userId,
        generatedAt: new Date(),
        format: reportRequest.reportFormat || 'JSON',
        userCount: reportRequest.userIds.length,
        campaignCount: reportRequest.campaignIds?.length || 0,
      },
    };
  }

  // === ENDPOINTS DE ALERTAS ===

  /**
   * Configurar alertas de progreso
   */
  @Post('alerts')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Configurar alertas de progreso',
    description: 'Configura alertas automáticas para seguimiento de estudiantes.'
  })
  @ApiBody({ 
    type: AlertConfigDto,
    description: 'Configuración de la alerta'
  })
  @ApiResponse({
    status: 201,
    description: 'Alerta configurada exitosamente'
  })
  async configureAlert(
    @Body() alertConfig: AlertConfigDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.logger.log(`Configuring alert: ${alertConfig.alertType} for user ${alertConfig.userId} by ${req.user.userId}`);

    // TODO: Implementar sistema de alertas
    const result = {
      alertId: 'generated-alert-id',
      status: 'active',
      nextCheck: new Date(Date.now() + 3600000), // 1 hora
    };

    return {
      success: true,
      message: 'Alerta configurada exitosamente',
      data: result,
    };
  }

  /**
   * Obtener alertas activas
   */
  @Get('alerts')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ 
    summary: 'Obtener alertas activas',
    description: 'Lista de alertas configuradas y su estado actual.'
  })
  @ApiQuery({ 
    name: 'userId', 
    type: 'string', 
    required: false, 
    description: 'Filtrar por usuario específico' 
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de alertas obtenida exitosamente'
  })
  async getActiveAlerts(
    @Request() req: AuthenticatedRequest,
    @Query('userId') userId?: string,
  ) {
    this.logger.log(`Getting active alerts for user: ${req.user.userId}`);

    // TODO: Implementar listado de alertas
    const result = {
      alerts: [],
      totalActive: 0,
      triggeredToday: 0,
    };

    return {
      success: true,
      data: result,
    };
  }
}