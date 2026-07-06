/**
 * @archivo: email-automation.controller.ts
 * @módulo: Communications - Email Notifications System
 * @función: API REST para gestión de automatizaciones de email
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { EmailAutomationService } from '../services/email-automation.service';
import { BirthdayAutomationService } from '../services/birthday-automation.service';
import { OverdueTasksService } from '../services/overdue-tasks.service';
import { GradeNotificationsService } from '../services/grade-notifications.service';
import { EmailService } from '../services/email.service';
import { CreateEmailAutomationDto, UpdateEmailAutomationDto } from '../dto/email-automation.dto';
import { EmailAutomation, EmailEventType, EmailRecipientType } from '../entities/email-automation.entity';

@ApiTags('Communications - Email Automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('communications/email-automation')
export class EmailAutomationController {
  constructor(
    private readonly emailAutomationService: EmailAutomationService,
    private readonly emailService: EmailService,
    private readonly birthdayAutomationService: BirthdayAutomationService,
    private readonly overdueTasksService: OverdueTasksService,
    private readonly gradeNotificationsService: GradeNotificationsService,
  ) {
    // Force instantiation of BirthdayAutomationService to ensure cron jobs are active
    this.birthdayAutomationService;
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener todas las automatizaciones de correo' })
  @ApiResponse({ status: 200, description: 'Lista de automatizaciones obtenida correctamente' })
  async getAllAutomations(): Promise<EmailAutomation[]> {
    return await this.emailAutomationService.getAllAutomations();
  }

  @Get('active')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener automatizaciones activas' })
  @ApiResponse({ status: 200, description: 'Lista de automatizaciones activas' })
  async getActiveAutomations(): Promise<EmailAutomation[]> {
    return await this.emailAutomationService.getActiveAutomations();
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estadísticas de automatizaciones' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas correctamente' })
  async getAutomationStats(): Promise<any> {
    return await this.emailAutomationService.getAutomationStats();
  }

  @Get('event-types')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener tipos de eventos disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de eventos' })
  async getEventTypes(): Promise<{ value: string; label: string; description: string }[]> {
    return Object.values(EmailEventType).map(type => ({
      value: type,
      label: this.getEventTypeLabel(type),
      description: this.getEventTypeDescription(type),
    }));
  }

  @Get('recipient-types')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener tipos de destinatarios disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de destinatarios' })
  async getRecipientTypes(): Promise<{ value: string; label: string; description: string }[]> {
    return Object.values(EmailRecipientType).map(type => ({
      value: type,
      label: this.getRecipientTypeLabel(type),
      description: this.getRecipientTypeDescription(type),
    }));
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener automatización por ID' })
  @ApiResponse({ status: 200, description: 'Automatización obtenida correctamente' })
  @ApiResponse({ status: 404, description: 'Automatización no encontrada' })
  async getAutomationById(@Param('id') id: string): Promise<EmailAutomation> {
    return await this.emailAutomationService.getAutomationById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear nueva automatización de correo' })
  @ApiResponse({ status: 201, description: 'Automatización creada correctamente' })
  async createAutomation(
    @Body() createDto: CreateEmailAutomationDto,
    @Request() req,
  ): Promise<EmailAutomation> {
    return await this.emailAutomationService.createAutomation({
      ...createDto,
      createdById: req.user.id,
    });
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar automatización existente' })
  @ApiResponse({ status: 200, description: 'Automatización actualizada correctamente' })
  @ApiResponse({ status: 404, description: 'Automatización no encontrada' })
  async updateAutomation(
    @Param('id') id: string,
    @Body() updateDto: UpdateEmailAutomationDto,
  ): Promise<EmailAutomation> {
    return await this.emailAutomationService.updateAutomation(id, updateDto);
  }

  @Put(':id/toggle-active')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activar/desactivar automatización' })
  @ApiResponse({ status: 200, description: 'Estado de automatización cambiado' })
  async toggleAutomationActive(@Param('id') id: string): Promise<EmailAutomation> {
    return await this.emailAutomationService.toggleAutomationActive(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar automatización' })
  @ApiResponse({ status: 200, description: 'Automatización eliminada correctamente' })
  async deleteAutomation(@Param('id') id: string): Promise<{ message: string }> {
    await this.emailAutomationService.deleteAutomation(id);
    return { message: 'Automatización eliminada correctamente' };
  }

  @Post('test-birthday')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Test manual birthday automation' })
  @ApiResponse({ status: 200, description: 'Test ejecutado correctamente' })
  async testBirthdayAutomation(): Promise<{ message: string }> {
    try {
      console.log('🎂 Manual test birthday automation called via controller');
      await this.emailService.processBirthdayAutomations();
      console.log('🎂 Manual test birthday automation completed successfully');
      return { message: 'Birthday automation test ejecutado correctamente' };
    } catch (error) {
      console.error('❌ Manual test birthday automation failed:', error);
      throw error;
    }
  }

  @Post('force-cron-test')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Force test BirthdayAutomationService cron' })
  @ApiResponse({ status: 200, description: 'Cron test ejecutado correctamente' })
  async forceCronTest(): Promise<{ message: string }> {
    try {
      console.log('🎂 Forcing BirthdayAutomationService cron test via controller');
      await this.birthdayAutomationService.checkBirthdayAutomations();
      return { message: 'BirthdayAutomationService cron test ejecutado correctamente' };
    } catch (error) {
      console.error('❌ BirthdayAutomationService cron test failed:', error);
      throw error;
    }
  }

  @Post('test-overdue-tasks')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Test manual para detección de tareas vencidas' })
  @ApiResponse({ status: 200, description: 'Test de tareas vencidas ejecutado correctamente' })
  async testOverdueTasks(): Promise<{ message: string; tasksFound: number }> {
    try {
      console.log('📋 Manual test overdue tasks called via controller');
      const result = await this.overdueTasksService.triggerOverdueTaskDetection();
      console.log('📋 Manual test overdue tasks completed successfully');
      return result;
    } catch (error) {
      console.error('❌ Manual test overdue tasks failed:', error);
      throw error;
    }
  }

  @Post('test-grade-notification')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Test manual para notificaciones de calificaciones' })
  @ApiResponse({ status: 200, description: 'Test de notificaciones de calificaciones ejecutado correctamente' })
  async testGradeNotification(@Body() testData?: any): Promise<{ message: string; familiesFound: number }> {
    try {
      console.log('📊 Manual test grade notification called via controller');
      
      // Datos de prueba para el test
      const gradeData = testData || {
        gradeId: 'test-grade-' + Date.now(),
        studentId: '9ad1281d-a957-4388-886a-3bfc2d18276d', // Diego López Martín real ID
        studentFullName: 'Diego López Martín',
        subjectName: 'Matemáticas',
        activityName: 'Examen Unidad 3: Geometría',
        gradeValue: 8.5,
        gradeScale: 10,
        passingThreshold: 60,
        teacherName: 'Prof. Ana Martín',
        teacherComments: 'Excelente comprensión de los conceptos geométricos. Sigue así.',
        isPassing: true,
        achievementLevel: 'Notable',
        period: '1º Trimestre 2025',
        gradeDate: new Date().toLocaleDateString('es-ES').split('/').reverse().join('-'),
      };
      
      const result = await this.gradeNotificationsService.testGradeNotification(gradeData);
      console.log('📊 Manual test grade notification completed successfully');
      return result;
    } catch (error) {
      console.error('❌ Manual test grade notification failed:', error);
      throw error;
    }
  }

  private getEventTypeLabel(type: EmailEventType): string {
    const labels: Record<EmailEventType, string> = {
      [EmailEventType.GRADE_CREATED]: 'Nueva Calificación',
      [EmailEventType.ASSIGNMENT_CREATED]: 'Nueva Tarea Asignada',
      [EmailEventType.ASSIGNMENT_DUE_REMINDER]: 'Recordatorio de Entrega',
      [EmailEventType.TASK_OVERDUE]: 'Tarea No Entregada',
      [EmailEventType.EVENT_REMINDER]: 'Recordatorio de Evento',
      [EmailEventType.USER_CREATED]: 'Usuario Creado',
      [EmailEventType.PASSWORD_RESET_REQUESTED]: 'Solicitud de Contraseña',
      [EmailEventType.USER_BIRTHDAY]: 'Cumpleaños de Usuario',
      [EmailEventType.SYSTEM_MAINTENANCE]: 'Mantenimiento del Sistema',
      [EmailEventType.BACKUP_COMPLETED]: 'Backup Completado',
      [EmailEventType.ABSENCE_RECORDED]: 'Falta Registrada',
      [EmailEventType.ATTENDANCE_SUMMARY]: 'Resumen de Asistencia',
    };
    return labels[type] || type;
  }

  private getEventTypeDescription(type: EmailEventType): string {
    const descriptions: Record<EmailEventType, string> = {
      [EmailEventType.GRADE_CREATED]: 'Se envía cuando se registra una nueva calificación',
      [EmailEventType.ASSIGNMENT_CREATED]: 'Se envía cuando se crea una nueva tarea',
      [EmailEventType.ASSIGNMENT_DUE_REMINDER]: 'Recordatorio antes de la fecha de entrega',
      [EmailEventType.TASK_OVERDUE]: 'Se envía cuando una tarea no se entrega en la fecha límite',
      [EmailEventType.EVENT_REMINDER]: 'Recordatorio de eventos del calendario',
      [EmailEventType.USER_CREATED]: 'Bienvenida a nuevos usuarios',
      [EmailEventType.PASSWORD_RESET_REQUESTED]: 'Enlace para restablecer contraseña',
      [EmailEventType.USER_BIRTHDAY]: 'Felicitación en el cumpleaños',
      [EmailEventType.SYSTEM_MAINTENANCE]: 'Avisos de mantenimiento programado',
      [EmailEventType.BACKUP_COMPLETED]: 'Notificación de backups exitosos',
      [EmailEventType.ABSENCE_RECORDED]: 'Notificación de faltas de asistencia',
      [EmailEventType.ATTENDANCE_SUMMARY]: 'Resumen periódico de asistencia',
    };
    return descriptions[type] || 'Descripción no disponible';
  }

  private getRecipientTypeLabel(type: EmailRecipientType): string {
    const labels: Record<EmailRecipientType, string> = {
      [EmailRecipientType.STUDENT]: 'Estudiante',
      [EmailRecipientType.TEACHER]: 'Profesor',
      [EmailRecipientType.FAMILY]: 'Familia',
      [EmailRecipientType.ADMIN]: 'Administrador',
      [EmailRecipientType.ALL_USERS]: 'Todos los Usuarios',
      [EmailRecipientType.SPECIFIC_ROLE]: 'Rol Específico',
    };
    return labels[type] || type;
  }

  private getRecipientTypeDescription(type: EmailRecipientType): string {
    const descriptions: Record<EmailRecipientType, string> = {
      [EmailRecipientType.STUDENT]: 'Enviar solo a estudiantes',
      [EmailRecipientType.TEACHER]: 'Enviar solo a profesores',
      [EmailRecipientType.FAMILY]: 'Enviar solo a familias',
      [EmailRecipientType.ADMIN]: 'Enviar solo a administradores',
      [EmailRecipientType.ALL_USERS]: 'Enviar a todos los usuarios del sistema',
      [EmailRecipientType.SPECIFIC_ROLE]: 'Enviar a usuarios con un rol específico',
    };
    return descriptions[type] || 'Descripción no disponible';
  }
}