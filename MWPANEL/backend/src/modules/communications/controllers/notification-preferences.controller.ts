/**
 * @archivo: notification-preferences.controller.ts
 * @módulo: Communications - Email Notifications System
 * @función: API REST para preferencias de notificación de usuarios
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 * @dependencias: UserNotificationPreferences entity, Auth Guards
 * @propósito: Gestión de preferencias individuales de notificación por correo
 */

import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { UserNotificationPreferences } from '../entities/user-notification-preferences.entity';

export interface UpdateNotificationPreferencesDto {
  emailNotificationsEnabled?: boolean;
  preferredLanguage?: string;
  enableGradeNotifications?: boolean;
  enableAssignmentReminders?: boolean;
  enableEventReminders?: boolean;
  enableTeacherMessages?: boolean;
  enableChildGradeUpdates?: boolean;
  enableChildAbsenceAlerts?: boolean;
  enableSchoolEvents?: boolean;
  enableTeacherCommunications?: boolean;
  enableNewAssignments?: boolean;
  enableAdminMessages?: boolean;
  enableSystemIncidents?: boolean;
  enableClassUpdates?: boolean;
  enableSystemErrors?: boolean;
  enableBackupReports?: boolean;
  enableUserActivity?: boolean;
  enableSecurityAlerts?: boolean;
  enableWelcomeEmails?: boolean;
  enablePasswordResetEmails?: boolean;
  enableMaintenanceAlerts?: boolean;
  notificationFrequency?: string;
  preferredNotificationTime?: string;
  enableRichHtmlEmails?: boolean;
  enableEmailImages?: boolean;
}

@ApiTags('Communications - Notification Preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('communications/notification-preferences')
export class NotificationPreferencesController {
  constructor(
    @InjectRepository(UserNotificationPreferences)
    private preferencesRepository: Repository<UserNotificationPreferences>,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener preferencias de notificación del usuario actual' })
  @ApiResponse({ status: 200, description: 'Preferencias obtenidas correctamente' })
  async getUserPreferences(@Request() req): Promise<UserNotificationPreferences> {
    return await this.getOrCreateUserPreferences(req.user.id);
  }

  @Get(':userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener preferencias de notificación de un usuario específico (Solo Admin)' })
  @ApiResponse({ status: 200, description: 'Preferencias obtenidas correctamente' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async getUserPreferencesById(@Param('userId') userId: string): Promise<UserNotificationPreferences> {
    return await this.getOrCreateUserPreferences(userId);
  }

  @Put()
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Actualizar preferencias de notificación del usuario actual' })
  @ApiResponse({ status: 200, description: 'Preferencias actualizadas correctamente' })
  async updateUserPreferences(
    @Request() req,
    @Body() updateDto: UpdateNotificationPreferencesDto,
  ): Promise<UserNotificationPreferences> {
    const preferences = await this.getOrCreateUserPreferences(req.user.id);
    
    // Actualizar solo los campos proporcionados
    Object.keys(updateDto).forEach(key => {
      if (updateDto[key] !== undefined) {
        preferences[key] = updateDto[key];
      }
    });

    return await this.preferencesRepository.save(preferences);
  }

  @Put(':userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar preferencias de notificación de un usuario específico (Solo Admin)' })
  @ApiResponse({ status: 200, description: 'Preferencias actualizadas correctamente' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async updateUserPreferencesById(
    @Param('userId') userId: string,
    @Body() updateDto: UpdateNotificationPreferencesDto,
  ): Promise<UserNotificationPreferences> {
    const preferences = await this.getOrCreateUserPreferences(userId);
    
    Object.keys(updateDto).forEach(key => {
      if (updateDto[key] !== undefined) {
        preferences[key] = updateDto[key];
      }
    });

    return await this.preferencesRepository.save(preferences);
  }

  @Get('defaults/:role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener configuración por defecto según el rol' })
  @ApiResponse({ status: 200, description: 'Configuración por defecto obtenida' })
  async getDefaultPreferencesForRole(@Param('role') role: UserRole): Promise<Partial<UpdateNotificationPreferencesDto>> {
    return this.getDefaultPreferencesForUserRole(role);
  }

  @Put('bulk-update')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualización masiva de preferencias por rol' })
  @ApiResponse({ status: 200, description: 'Preferencias actualizadas masivamente' })
  async bulkUpdatePreferences(
    @Body() body: {
      role?: UserRole;
      userIds?: string[];
      preferences: UpdateNotificationPreferencesDto;
    },
  ): Promise<{ message: string; affectedUsers: number }> {
    let query = this.preferencesRepository.createQueryBuilder('preferences')
      .leftJoinAndSelect('preferences.user', 'user');

    if (body.role) {
      query = query.where('user.role = :role', { role: body.role });
    }

    if (body.userIds && body.userIds.length > 0) {
      query = query.andWhere('preferences.userId IN (:...userIds)', { userIds: body.userIds });
    }

    const preferences = await query.getMany();

    for (const preference of preferences) {
      Object.keys(body.preferences).forEach(key => {
        if (body.preferences[key] !== undefined) {
          preference[key] = body.preferences[key];
        }
      });
    }

    await this.preferencesRepository.save(preferences);

    return {
      message: 'Preferencias actualizadas masivamente',
      affectedUsers: preferences.length,
    };
  }

  @Get('summary/all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Resumen de preferencias por rol' })
  @ApiResponse({ status: 200, description: 'Resumen obtenido correctamente' })
  async getPreferencesSummary(): Promise<{
    totalUsers: number;
    enabledNotifications: number;
    disabledNotifications: number;
    byRole: Record<UserRole, {
      total: number;
      enabled: number;
      disabled: number;
    }>;
  }> {
    const allPreferences = await this.preferencesRepository.find({
      relations: ['user'],
    });

    const summary = {
      totalUsers: allPreferences.length,
      enabledNotifications: allPreferences.filter(p => p.emailNotificationsEnabled).length,
      disabledNotifications: allPreferences.filter(p => !p.emailNotificationsEnabled).length,
      byRole: {} as Record<UserRole, { total: number; enabled: number; disabled: number }>,
    };

    Object.values(UserRole).forEach(role => {
      const rolePreferences = allPreferences.filter(p => p.user?.role === role);
      summary.byRole[role] = {
        total: rolePreferences.length,
        enabled: rolePreferences.filter(p => p.emailNotificationsEnabled).length,
        disabled: rolePreferences.filter(p => !p.emailNotificationsEnabled).length,
      };
    });

    return summary;
  }

  /**
   * Obtiene o crea las preferencias de un usuario
   */
  private async getOrCreateUserPreferences(userId: string): Promise<UserNotificationPreferences> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!preferences) {
      preferences = this.preferencesRepository.create({
        userId,
        // Los valores por defecto están definidos en la entidad
      });
      preferences = await this.preferencesRepository.save(preferences);
    }

    return preferences;
  }

  /**
   * Obtiene configuraciones por defecto según el rol del usuario
   */
  private getDefaultPreferencesForUserRole(role: UserRole): Partial<UpdateNotificationPreferencesDto> {
    const baseDefaults = {
      emailNotificationsEnabled: true,
      preferredLanguage: 'es',
      notificationFrequency: 'immediate',
      preferredNotificationTime: '09:00',
      enableRichHtmlEmails: true,
      enableEmailImages: true,
      enableWelcomeEmails: true,
      enablePasswordResetEmails: true,
      enableMaintenanceAlerts: true,
    };

    switch (role) {
      case UserRole.STUDENT:
        return {
          ...baseDefaults,
          enableGradeNotifications: true,
          enableAssignmentReminders: true,
          enableEventReminders: true,
          enableTeacherMessages: true,
          // Desactivar notificaciones no relevantes para estudiantes
          enableChildGradeUpdates: false,
          enableChildAbsenceAlerts: false,
          enableTeacherCommunications: false,
          enableNewAssignments: false,
          enableAdminMessages: false,
          enableSystemIncidents: false,
          enableClassUpdates: false,
          enableSystemErrors: false,
          enableBackupReports: false,
          enableUserActivity: false,
          enableSecurityAlerts: false,
        };

      case UserRole.FAMILY:
        return {
          ...baseDefaults,
          enableChildGradeUpdates: true,
          enableChildAbsenceAlerts: true,
          enableSchoolEvents: true,
          enableTeacherCommunications: true,
          // Desactivar notificaciones no relevantes para familias
          enableGradeNotifications: false,
          enableAssignmentReminders: false,
          enableEventReminders: false,
          enableTeacherMessages: false,
          enableNewAssignments: false,
          enableAdminMessages: false,
          enableSystemIncidents: false,
          enableClassUpdates: false,
          enableSystemErrors: false,
          enableBackupReports: false,
          enableUserActivity: false,
          enableSecurityAlerts: false,
        };

      case UserRole.TEACHER:
        return {
          ...baseDefaults,
          enableNewAssignments: true,
          enableAdminMessages: true,
          enableSystemIncidents: true,
          enableClassUpdates: true,
          enableEventReminders: true,
          // Configuración moderada para profesores
          enableGradeNotifications: false,
          enableAssignmentReminders: false,
          enableTeacherMessages: false,
          enableChildGradeUpdates: false,
          enableChildAbsenceAlerts: false,
          enableSchoolEvents: true,
          enableTeacherCommunications: false,
          enableSystemErrors: false,
          enableBackupReports: false,
          enableUserActivity: false,
          enableSecurityAlerts: false,
        };

      case UserRole.ADMIN:
        return {
          ...baseDefaults,
          // Administradores reciben todas las notificaciones por defecto
          enableGradeNotifications: false,
          enableAssignmentReminders: false,
          enableEventReminders: true,
          enableTeacherMessages: false,
          enableChildGradeUpdates: false,
          enableChildAbsenceAlerts: false,
          enableSchoolEvents: true,
          enableTeacherCommunications: false,
          enableNewAssignments: true,
          enableAdminMessages: true,
          enableSystemIncidents: true,
          enableClassUpdates: true,
          enableSystemErrors: true,
          enableBackupReports: true,
          enableUserActivity: true,
          enableSecurityAlerts: true,
        };

      default:
        return baseDefaults;
    }
  }
}