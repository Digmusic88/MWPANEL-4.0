/**
 * @archivo: email-templates.controller.ts
 * @módulo: Communications - Email Notifications System
 * @función: API REST para gestión de plantillas de correo
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 * @dependencias: EmailTemplateService, Auth Guards
 * @propósito: Administración completa de plantillas con previsualización
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { EmailTemplateService } from '../services/email-template.service';
import { 
  CreateEmailTemplateDto, 
  UpdateEmailTemplateDto,
  PreviewEmailTemplateDto,
  CloneEmailTemplateDto
} from '../dto/email-template.dto';
import { EmailTemplate, EmailTemplateType } from '../entities/email-template.entity';

@ApiTags('Communications - Email Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('communications/email-templates')
export class EmailTemplatesController {
  constructor(private readonly emailTemplateService: EmailTemplateService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener todas las plantillas de correo' })
  @ApiResponse({ status: 200, description: 'Lista de plantillas obtenida correctamente' })
  async getAllTemplates(): Promise<EmailTemplate[]> {
    return await this.emailTemplateService.getAllTemplates();
  }

  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener plantillas activas' })
  @ApiResponse({ status: 200, description: 'Lista de plantillas activas' })
  async getActiveTemplates(): Promise<EmailTemplate[]> {
    return await this.emailTemplateService.getActiveTemplates();
  }

  @Get('types')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener tipos de plantillas disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de plantillas' })
  async getTemplateTypes(): Promise<{ value: string; label: string; variables: string[] }[]> {
    return Object.values(EmailTemplateType).map(type => ({
      value: type,
      label: this.getTemplateTypeLabel(type),
      variables: this.emailTemplateService.getAvailableVariablesForType(type),
    }));
  }

  @Get('variables/:type')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener variables disponibles para un tipo de plantilla' })
  @ApiResponse({ status: 200, description: 'Lista de variables disponibles' })
  async getVariablesForType(@Param('type') type: EmailTemplateType): Promise<string[]> {
    return this.emailTemplateService.getAvailableVariablesForType(type);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener plantilla por ID' })
  @ApiResponse({ status: 200, description: 'Plantilla obtenida correctamente' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async getTemplateById(@Param('id') id: string): Promise<EmailTemplate> {
    return await this.emailTemplateService.getTemplateById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear nueva plantilla de correo' })
  @ApiResponse({ status: 201, description: 'Plantilla creada correctamente' })
  @ApiResponse({ status: 400, description: 'Datos de plantilla inválidos' })
  async createTemplate(
    @Body() createDto: CreateEmailTemplateDto,
    @Request() req,
  ): Promise<EmailTemplate> {
    return await this.emailTemplateService.createTemplate({
      ...createDto,
      createdById: req.user.id,
    });
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar plantilla existente' })
  @ApiResponse({ status: 200, description: 'Plantilla actualizada correctamente' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  @ApiResponse({ status: 403, description: 'No se puede modificar plantilla del sistema' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateDto: UpdateEmailTemplateDto,
    @Request() req,
  ): Promise<EmailTemplate> {
    return await this.emailTemplateService.updateTemplate(id, {
      ...updateDto,
      lastEditedById: req.user.id,
    });
  }

  @Post(':id/clone')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Clonar plantilla existente' })
  @ApiResponse({ status: 201, description: 'Plantilla clonada correctamente' })
  @ApiResponse({ status: 404, description: 'Plantilla original no encontrada' })
  async cloneTemplate(
    @Param('id') id: string,
    @Body() cloneDto: CloneEmailTemplateDto,
    @Request() req,
  ): Promise<EmailTemplate> {
    return await this.emailTemplateService.cloneTemplate(id, cloneDto.newName, req.user.id);
  }

  @Put(':id/toggle-active')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activar/desactivar plantilla' })
  @ApiResponse({ status: 200, description: 'Estado de plantilla cambiado' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async toggleTemplateActive(@Param('id') id: string): Promise<EmailTemplate> {
    return await this.emailTemplateService.toggleTemplateActive(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar plantilla' })
  @ApiResponse({ status: 200, description: 'Plantilla eliminada correctamente' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  @ApiResponse({ status: 403, description: 'No se puede eliminar plantilla del sistema' })
  async deleteTemplate(@Param('id') id: string): Promise<{ message: string }> {
    await this.emailTemplateService.deleteTemplate(id);
    return { message: 'Plantilla eliminada correctamente' };
  }

  @Post(':id/preview')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Previsualizar plantilla con datos de prueba' })
  @ApiResponse({ status: 200, description: 'Previsualización generada' })
  async previewTemplate(
    @Param('id') id: string,
    @Body() previewDto: PreviewEmailTemplateDto,
  ): Promise<{ html: string; text: string; subject: string }> {
    const template = await this.emailTemplateService.getTemplateById(id);
    
    // Datos de prueba por defecto
    const defaultPreviewData = {
      userName: 'Juan Pérez',
      userEmail: 'juan.perez@ejemplo.com',
      userRole: 'student',
      schoolName: 'Mundo World School',
      platformUrl: 'https://plataforma.mundoworld.school',
      logoUrl: 'https://plataforma.mundoworld.school/assets/logo-MWSchool.png',
      currentDate: new Date().toLocaleDateString('es-ES'),
      currentYear: new Date().getFullYear(),
      supportEmail: 'soporte@mundoworld.school',
      ...previewDto.previewData,
    };

    // Usar el servicio de email para procesar la plantilla
    // Aquí necesitarías acceso al método processTemplate del EmailService
    // Por simplicidad, devolvemos la plantilla tal como está
    return {
      html: template.htmlContent,
      text: template.textContent,
      subject: template.subject,
    };
  }

  @Post('initialize-system')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Inicializar plantillas del sistema' })
  @ApiResponse({ status: 200, description: 'Plantillas del sistema inicializadas' })
  async initializeSystemTemplates(): Promise<{ message: string }> {
    await this.emailTemplateService.initializeSystemTemplates();
    return { message: 'Plantillas del sistema inicializadas correctamente' };
  }

  private getTemplateTypeLabel(type: EmailTemplateType): string {
    const labels: Record<EmailTemplateType, string> = {
      [EmailTemplateType.GRADE_NOTIFICATION]: 'Notificación de Calificación',
      [EmailTemplateType.ASSIGNMENT_REMINDER]: 'Recordatorio de Tarea',
      [EmailTemplateType.EVENT_REMINDER]: 'Recordatorio de Evento',
      [EmailTemplateType.MESSAGE_FROM_TEACHER]: 'Mensaje del Profesor',
      [EmailTemplateType.CHILD_GRADE_UPDATE]: 'Actualización de Calificación (Familia)',
      [EmailTemplateType.CHILD_ABSENCE]: 'Ausencia del Hijo',
      [EmailTemplateType.CHILD_TASK_OVERDUE]: 'Tarea No Entregada',
      [EmailTemplateType.SCHOOL_EVENT]: 'Evento Escolar',
      [EmailTemplateType.TEACHER_MESSAGE]: 'Mensaje del Tutor',
      [EmailTemplateType.NEW_ASSIGNMENT]: 'Nueva Asignación',
      [EmailTemplateType.ADMIN_MESSAGE]: 'Mensaje de Administración',
      [EmailTemplateType.SYSTEM_INCIDENT]: 'Incidencia del Sistema',
      [EmailTemplateType.SYSTEM_ERROR]: 'Error del Sistema',
      [EmailTemplateType.BACKUP_REPORT]: 'Reporte de Backup',
      [EmailTemplateType.USER_ACTIVITY]: 'Actividad de Usuario',
      [EmailTemplateType.WELCOME]: 'Bienvenida',
      [EmailTemplateType.WELCOME_FAMILY]: 'Bienvenida Familiar',
      [EmailTemplateType.PASSWORD_RESET]: 'Recuperación de Contraseña',
      [EmailTemplateType.SYSTEM_MAINTENANCE]: 'Mantenimiento del Sistema',
      [EmailTemplateType.BIRTHDAY_GREETING]: 'Felicitación de Cumpleaños',
      [EmailTemplateType.NEW_MESSAGE_NOTIFICATION]: 'Notificación de Mensaje Nuevo',
      [EmailTemplateType.ATTENDANCE_REQUEST_TEACHER]: 'Solicitud de Asistencia (Profesor)',
      [EmailTemplateType.ATTENDANCE_REQUEST_REVIEWED]: 'Respuesta Solicitud Asistencia (Familia)',
      [EmailTemplateType.CUSTOM]: 'Personalizada',
    };

    return labels[type] || type;
  }
}