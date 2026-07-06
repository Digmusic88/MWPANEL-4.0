/**
 * @archivo: email-notifications.controller.ts
 * @módulo: Communications - Email Notifications System
 * @función: API REST para historial y gestión de notificaciones enviadas
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 * @dependencias: EmailNotification entity, EmailService, Auth Guards
 * @propósito: Monitorización y gestión del historial de correos enviados
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { EmailNotification, EmailStatus, EmailPriority } from '../entities/email-notification.entity';
import { EmailTemplateType } from '../entities/email-template.entity';
import { EmailService } from '../services/email.service';
import { EmailAutomation, EmailEventType, EmailRecipientType } from '../entities/email-automation.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationService } from '../services/notification.service';

export interface SendTestEmailDto {
  to: string;
  templateType: EmailTemplateType;
  templateData?: Record<string, any>;
  subject?: string;
}

export interface SendCustomEmailDto {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  priority?: EmailPriority;
}

export interface EmailHistoryQuery {
  page?: number;
  limit?: number;
  status?: EmailStatus;
  priority?: EmailPriority;
  templateType?: EmailTemplateType;
  dateFrom?: string;
  dateTo?: string;
  recipientEmail?: string;
}

@ApiTags('Communications - Email Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('communications/email-notifications')
export class EmailNotificationsController {
  constructor(
    @InjectRepository(EmailNotification)
    private emailNotificationRepository: Repository<EmailNotification>,
    @InjectRepository(EmailAutomation)
    private emailAutomationRepository: Repository<EmailAutomation>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
    private notificationService: NotificationService,
  ) {}

  @Get('history')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener historial de notificaciones del usuario actual' })
  @ApiResponse({ status: 200, description: 'Historial obtenido correctamente' })
  async getUserEmailHistory(
    @Request() req,
    @Query() query: EmailHistoryQuery,
  ): Promise<{
    notifications: EmailNotification[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;

    const queryBuilder = this.emailNotificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.template', 'template')
      .where('notification.recipientId = :userId', { userId: req.user.id })
      .orderBy('notification.createdAt', 'DESC');

    // Aplicar filtros
    if (query.status) {
      queryBuilder.andWhere('notification.status = :status', { status: query.status });
    }

    if (query.templateType) {
      queryBuilder.andWhere('template.type = :templateType', { templateType: query.templateType });
    }

    if (query.dateFrom) {
      queryBuilder.andWhere('notification.createdAt >= :dateFrom', { dateFrom: new Date(query.dateFrom) });
    }

    if (query.dateTo) {
      queryBuilder.andWhere('notification.createdAt <= :dateTo', { dateTo: new Date(query.dateTo) });
    }

    const [notifications, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      notifications,
      total,
      page,
      limit,
    };
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estadísticas de envío de correos' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas correctamente' })
  async getEmailStats(): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
    byStatus: Record<EmailStatus, number>;
    byPriority: Record<EmailPriority, number>;
    byTemplate: Record<string, number>;
    last24Hours: number;
    last7Days: number;
  }> {
    const total = await this.emailNotificationRepository.count();
    
    const byStatus = await this.getCountByField('status');
    const byPriority = await this.getCountByField('priority');
    
    const templateStats = await this.emailNotificationRepository
      .createQueryBuilder('notification')
      .leftJoin('notification.template', 'template')
      .select('template.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('template.type IS NOT NULL')
      .groupBy('template.type')
      .getRawMany();

    const byTemplate = templateStats.reduce((acc, stat) => {
      acc[stat.type] = parseInt(stat.count);
      return acc;
    }, {});

    const last24Hours = await this.emailNotificationRepository
      .createQueryBuilder('notification')
      .where('notification.createdAt >= :date', { date: new Date(Date.now() - 24 * 60 * 60 * 1000) })
      .getCount();

    const last7Days = await this.emailNotificationRepository
      .createQueryBuilder('notification')
      .where('notification.createdAt >= :date', { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) })
      .getCount();

    return {
      total,
      sent: byStatus[EmailStatus.SENT] || 0,
      failed: byStatus[EmailStatus.FAILED] || 0,
      pending: byStatus[EmailStatus.PENDING] || 0,
      byStatus: byStatus as Record<EmailStatus, number>,
      byPriority: byPriority as Record<EmailPriority, number>,
      byTemplate,
      last24Hours,
      last7Days,
    };
  }

  @Get('complete-history')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener historial completo de notificaciones (Solo Admin)' })
  @ApiResponse({ status: 200, description: 'Historial completo obtenido' })
  async getAllEmailHistory(
    @Query() query: EmailHistoryQuery,
  ): Promise<{
    notifications: EmailNotification[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    // Get basic count first
    const total = await this.emailNotificationRepository.count();
    
    // Use raw query to avoid complex joins causing issues
    const notifications = await this.emailNotificationRepository
      .createQueryBuilder('notification')
      .orderBy('notification.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      notifications,
      total,
      page,
      limit,
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener detalles de una notificación específica' })
  @ApiResponse({ status: 200, description: 'Detalles obtenidos correctamente' })
  @ApiResponse({ status: 404, description: 'Notificación no encontrada' })
  async getNotificationDetails(
    @Param('id') id: string,
    @Request() req,
  ): Promise<EmailNotification> {
    const queryBuilder = this.emailNotificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.template', 'template')
      .leftJoinAndSelect('notification.recipient', 'recipient')
      .leftJoinAndSelect('notification.triggeredBy', 'triggeredBy')
      .where('notification.id = :id', { id });

    // Los usuarios no admin solo pueden ver sus propias notificaciones
    if (req.user.role !== UserRole.ADMIN) {
      queryBuilder.andWhere('notification.recipientId = :userId', { userId: req.user.id });
    }

    const notification = await queryBuilder.getOne();
    
    if (!notification) {
      throw new Error('Notificación no encontrada');
    }

    return notification;
  }

  @Post('send-test')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Enviar correo de prueba' })
  @ApiResponse({ status: 201, description: 'Correo de prueba enviado' })
  async sendTestEmail(
    @Body() sendTestDto: SendTestEmailDto,
    @Request() req,
  ): Promise<EmailNotification> {
    // Buscar usuario por email de destino o usar el admin como fallback
    let recipientUser = await this.userRepository.findOne({ 
      where: { email: sendTestDto.to } 
    });
    
    // Si no se encuentra el usuario, usar el admin actual
    if (!recipientUser) {
      recipientUser = req.user;
    }
    
    console.log('DEBUG - recipientUser:', recipientUser);
    console.log('DEBUG - recipientUser.id:', recipientUser?.id);

    const testData = {
      userName: 'Usuario de Prueba',
      userEmail: sendTestDto.to,
      userRole: 'test',
      schoolName: 'Mundo World School',
      currentDate: new Date().toLocaleDateString('es-ES'),
      gradeName: 'Matemáticas - Examen Final',
      gradeValue: '8.5',
      subjectName: 'Matemáticas',
      teacherName: 'Prof. García',
      assignmentTitle: 'Tarea de Álgebra',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'),
      ...sendTestDto.templateData,
    };

    return await this.emailService.sendEmail({
      to: sendTestDto.to,
      subject: sendTestDto.subject || 'Correo de Prueba - Mundo World School',
      templateType: sendTestDto.templateType,
      templateData: testData,
      priority: EmailPriority.LOW,
      userId: recipientUser.id, // Usar usuario encontrado o admin como fallback
      triggeredBy: req.user.id,
      triggerEvent: 'test_email',
      isTest: true,
    });
  }

  @Post('send-custom')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Enviar correo personalizado' })
  @ApiResponse({ status: 201, description: 'Correo personalizado enviado' })
  async sendCustomEmail(
    @Body() sendCustomDto: SendCustomEmailDto,
    @Request() req,
  ): Promise<EmailNotification> {
    return await this.emailService.sendEmail({
      to: sendCustomDto.to,
      subject: sendCustomDto.subject,
      htmlContent: sendCustomDto.htmlContent,
      textContent: sendCustomDto.textContent,
      priority: sendCustomDto.priority || EmailPriority.NORMAL,
      triggeredBy: req.user.id,
      triggerEvent: 'custom_email',
    });
  }

  @Post('retry-failed')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reintentar envío de correos fallidos' })
  @ApiResponse({ status: 200, description: 'Reintentos iniciados' })
  async retryFailedEmails(): Promise<{ message: string }> {
    await this.emailService.retryFailedEmails();
    return { message: 'Reintentos de correos fallidos iniciados' };
  }

  @Post('test-system-notification')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Probar notificación del sistema' })
  @ApiResponse({ status: 200, description: 'Notificación de prueba enviada' })
  async testSystemNotification(
    @Body() body: {
      type: 'grade_created' | 'assignment_created' | 'message_sent' | 'event_created';
      recipientEmail: string;
    },
    @Request() req,
  ): Promise<{ message: string }> {
    const testData = {
      studentId: 'test-student-id',
      gradeName: 'Matemáticas - Examen de Prueba',
      gradeValue: '9.0',
      subjectName: 'Matemáticas',
      teacherName: 'Prof. García',
      assignmentTitle: 'Tarea de Prueba',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      messageContent: 'Este es un mensaje de prueba del sistema de notificaciones.',
      eventTitle: 'Evento de Prueba',
      eventDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      eventLocation: 'Aula Virtual',
    };

    // Simular evento del sistema
    switch (body.type) {
      case 'grade_created':
        await this.notificationService.notifyGradeCreated('test-student-id', testData, req.user.id);
        break;
      case 'assignment_created':
        await this.notificationService.notifyAssignmentCreated(testData, req.user.id);
        break;
      case 'message_sent':
        await this.notificationService.notifyMessageSent('test-recipient-id', testData, req.user.id);
        break;
      case 'event_created':
        await this.notificationService.notifyEventCreated(testData, req.user.id);
        break;
    }

    return { message: `Notificación de prueba ${body.type} enviada correctamente` };
  }

  /**
   * Helper para obtener conteos agrupados por campo
   */
  private async getCountByField(field: string): Promise<Record<string, number>> {
    const results = await this.emailNotificationRepository
      .createQueryBuilder('notification')
      .select(`notification.${field}`, 'value')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`notification.${field}`)
      .getRawMany();

    return results.reduce((acc, result) => {
      acc[result.value] = parseInt(result.count);
      return acc;
    }, {});
  }
}