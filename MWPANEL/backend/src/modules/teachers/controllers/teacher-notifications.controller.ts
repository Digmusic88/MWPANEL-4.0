/**
 * @archivo: teacher-notifications.controller.ts
 * @módulo: Teachers (Controlador de Notificaciones)
 * @función: API endpoints para notificaciones en tiempo real de profesores
 * @características:
 *   - Solicitudes de ausencia pendientes
 *   - Solicitudes de reuniones
 *   - Tareas urgentes
 *   - Notificaciones del sistema
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { Teacher } from '../entities/teacher.entity';
import { AttendanceRequest, AttendanceRequestStatus } from '../../attendance/entities/attendance-request.entity';
import { MeetingBooking, MeetingBookingStatus } from '../../meetings/entities/meeting-booking.entity';

export interface TeacherNotification {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  isViewed: boolean;
  createdAt: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  family?: {
    id: string;
    primaryContactName: string;
  };
  metadata?: any;
}

export interface TeacherNotificationSummary {
  totalNotifications: number;
  unviewedNotifications: number;
  criticalNotifications: number;
  notificationsByType: Record<string, number>;
  notifications: TeacherNotification[];
}

@ApiTags('Teacher Notifications')
@Controller('teacher-notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TeacherNotificationsController {
  private readonly logger = new Logger(TeacherNotificationsController.name);
  
  // Simple in-memory storage for demo viewed states
  private viewedNotifications = new Set<string>();

  constructor(
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(AttendanceRequest)
    private readonly attendanceRequestRepository: Repository<AttendanceRequest>,
    @InjectRepository(MeetingBooking)
    private readonly meetingBookingRepository: Repository<MeetingBooking>,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Obtener notificaciones del profesor',
    description: 'Devuelve todas las notificaciones pendientes para el profesor'
  })
  @ApiQuery({ name: 'includeViewed', required: false, type: Boolean, description: 'Incluir notificaciones ya vistas' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Límite de notificaciones' })
  @ApiResponse({
    status: 200,
    description: 'Notificaciones obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        totalNotifications: { type: 'number', example: 5 },
        unviewedNotifications: { type: 'number', example: 3 },
        criticalNotifications: { type: 'number', example: 1 },
        notificationsByType: {
          type: 'object',
          properties: {
            attendance_request: { type: 'number', example: 2 },
            meeting_request: { type: 'number', example: 1 },
            urgent_task: { type: 'number', example: 2 }
          }
        },
        notifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              priority: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              isViewed: { type: 'boolean' },
              createdAt: { type: 'string' },
              student: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' }
                }
              },
              family: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  primaryContactName: { type: 'string' }
                }
              },
              metadata: { type: 'object' }
            }
          }
        }
      }
    }
  })
  async getTeacherNotifications(
    @Request() req,
    @Query('includeViewed') includeViewed: boolean = false,
    @Query('limit') limit: number = 20,
  ): Promise<TeacherNotificationSummary> {
    this.logger.log(`📬 Obteniendo notificaciones para profesor ${req.user.email}`);
    try {
      const realNotifications: TeacherNotification[] = [];

      // Usar repositorio TypeORM en lugar de query SQL directo
      const notificationRepository = this.dataSource.getRepository('Notification');
      
      const queryBuilder = notificationRepository.createQueryBuilder('notification')
        .where('notification.userId = :userId', { userId: req.user.sub })
        .orderBy('notification.createdAt', 'DESC')
        .limit(Number(limit) || 20);

      if (!includeViewed) {
        queryBuilder.andWhere('notification.status = :status', { status: 'unread' });
      }

      const systemNotifications = await queryBuilder.getMany();
      
      this.logger.log(`🔍 Encontradas ${systemNotifications.length} notificaciones para usuario ${req.user.sub}`);

      // Convertir notificaciones de base de datos al formato esperado
      for (const notification of systemNotifications) {
        const notificationPrefix = notification.type === 'shared_note' ? 'shared_note' : 'system';
        const notificationId = `${notificationPrefix}_${notification.id}`;
        const priority = this.getNotificationPriority(notification.type);
        
        realNotifications.push({
          id: notificationId,
          type: notification.type,
          priority: priority,
          title: notification.title,
          description: notification.content,
          isViewed: this.viewedNotifications.has(notificationId) || notification.status === 'read',
          createdAt: notification.createdAt.toISOString(),
          metadata: {
            notificationId: notification.id,
            notificationType: notification.type,
            relatedResourceId: notification.relatedResourceId,
            relatedResourceType: notification.relatedResourceType,
            actionUrl: notification.actionUrl,
          },
        });
      }

      // Calculate summary
      const unviewedNotifications = realNotifications.filter(n => !n.isViewed).length;
      const criticalNotifications = realNotifications.filter(n => n.priority === 'critical').length;
      
      const notificationsByType = realNotifications.reduce((acc, notification) => {
        acc[notification.type] = (acc[notification.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const result: TeacherNotificationSummary = {
        totalNotifications: realNotifications.length,
        unviewedNotifications,
        criticalNotifications,
        notificationsByType,
        notifications: realNotifications,
      };

      this.logger.log(`📤 Devolviendo ${result.totalNotifications} notificaciones, ${result.unviewedNotifications} sin leer`);
      this.logger.log(`📊 Tipos: ${JSON.stringify(result.notificationsByType)}`);
      return result;

    } catch (error) {
      this.logger.error('❌ Error obteniendo notificaciones del profesor:', error);
      // Return empty result on error to prevent crashes
      return {
        totalNotifications: 0,
        unviewedNotifications: 0,
        criticalNotifications: 0,
        notificationsByType: {},
        notifications: [],
      };
    }
  }

  @Post(':id/view')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Marcar notificación como vista',
    description: 'Marca una notificación específica como vista'
  })
  @ApiResponse({
    status: 200,
    description: 'Notificación marcada como vista exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  async markNotificationAsViewed(
    @Request() req,
    @Param('id') notificationId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`🔔 Marcando notificación como vista: ${notificationId} para usuario ${req.user.email}`);
      
      // Extraer el ID real de la notificación (remover prefijo)
      const realNotificationId = notificationId.replace(/^(shared_note_|system_)/, '');
      
      // Actualizar en la base de datos
      const notificationRepository = this.dataSource.getRepository('Notification');
      const updateResult = await notificationRepository.update(
        { 
          id: realNotificationId, 
          userId: req.user.sub 
        },
        { 
          status: 'read',
          readAt: new Date()
        }
      );

      // También mantener en memoria para compatibilidad
      this.viewedNotifications.add(notificationId);
      
      this.logger.log(`✅ Notificación ${realNotificationId} marcada como leída. Filas afectadas: ${updateResult.affected}`);
      
      return {
        success: true,
        message: 'Notificación marcada como vista',
      };
    } catch (error) {
      this.logger.error('❌ Error marcando notificación como vista:', error);
      throw error;
    }
  }

  @Post('view-all')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Marcar todas las notificaciones como vistas',
    description: 'Marca todas las notificaciones del profesor como vistas'
  })
  @ApiResponse({
    status: 200,
    description: 'Todas las notificaciones marcadas como vistas exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        updated: { type: 'number' }
      }
    }
  })
  async markAllNotificationsAsViewed(
    @Request() req,
  ): Promise<{ success: boolean; message: string; updated: number }> {
    try {
      this.logger.log(`📋 Marcando todas las notificaciones como vistas para usuario ${req.user.email}`);
      
      // Actualizar todas las notificaciones no leídas del usuario en la base de datos
      const notificationRepository = this.dataSource.getRepository('Notification');
      const updateResult = await notificationRepository.update(
        { 
          userId: req.user.sub,
          status: 'unread'
        },
        { 
          status: 'read',
          readAt: new Date()
        }
      );

      // Limpiar el set en memoria también
      const oldSize = this.viewedNotifications.size;
      this.viewedNotifications.clear();
      
      this.logger.log(`✅ Marcadas ${updateResult.affected} notificaciones como leídas. Limpiado set memoria: ${oldSize}`);
      
      return {
        success: true,
        message: 'Todas las notificaciones marcadas como vistas',
        updated: updateResult.affected || 0,
      };
    } catch (error) {
      this.logger.error('❌ Error marcando todas las notificaciones como vistas:', error);
      throw error;
    }
  }

  private getAttendanceRequestTypeLabel(type: string): string {
    switch (type) {
      case 'absence':
        return 'Ausencia';
      case 'late_arrival':
        return 'Retraso';
      case 'early_departure':
        return 'Salida anticipada';
      default:
        return 'Solicitud de asistencia';
    }
  }

  private getAttendanceRequestPriority(date: string, type: string): 'low' | 'medium' | 'high' | 'critical' {
    const requestDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // If request is for today or tomorrow, it's high priority
    if (requestDate <= tomorrow) {
      return 'high';
    }

    // If it's for this week, medium priority
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    if (requestDate <= nextWeek) {
      return 'medium';
    }

    return 'low';
  }

  private getMeetingPriority(meetingDateTime: string): 'low' | 'medium' | 'high' | 'critical' {
    const meetingDate = new Date(meetingDateTime);
    const now = new Date();
    const hoursUntilMeeting = (meetingDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // If meeting is within 24 hours, high priority
    if (hoursUntilMeeting <= 24) {
      return 'high';
    }

    // If meeting is within 3 days, medium priority
    if (hoursUntilMeeting <= 72) {
      return 'medium';
    }

    return 'low';
  }

  private getNotificationPriority(type: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (type) {
      case 'shared_note':
        return 'high';
      case 'attendance':
      case 'evaluation':
        return 'medium';
      case 'system':
      case 'announcement':
      case 'academic':
        return 'medium';
      case 'reminder':
        return 'low';
      case 'message':
        return 'medium';
      default:
        return 'low';
    }
  }
}