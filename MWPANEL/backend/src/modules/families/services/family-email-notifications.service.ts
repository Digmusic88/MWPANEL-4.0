/**
 * @archivo: family-email-notifications.service.ts
 * @módulo: Families (Email Notifications)
 * @función: Sistema de notificaciones por email automáticas para alertas familiares
 * @crítico: SÍ - Comunicación automática con familias sobre situaciones académicas
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { FamilyAlert, AlertType, AlertPriority } from '../entities/family-alert.entity';
import { Family } from '../../users/entities/family.entity';
import { User } from '../../users/entities/user.entity';
import { EmailService } from '../../communications/services/email.service';
import { FamilyAlertsService } from './family-alerts.service';

export interface EmailNotificationPreferences {
  immediateAlerts: boolean;        // Email inmediato para alertas críticas
  dailySummary: boolean;           // Resumen diario de alertas
  weeklySummary: boolean;          // Resumen semanal de progreso
  alertTypes: AlertType[];         // Tipos de alertas que quiere recibir
  maxEmailsPerDay: number;         // Límite de emails por día
  quietHours: {                   // Horas de silencio
    start: string;                 // "22:00"
    end: string;                   // "08:00"
  };
  language: 'es' | 'en';           // Idioma preferido
}

export interface EmailNotificationLog {
  id: string;
  familyId: string;
  emailType: 'immediate' | 'daily' | 'weekly';
  alertIds: string[];
  recipientEmail: string;
  sentAt: Date;
  status: 'sent' | 'failed' | 'pending';
  errorMessage?: string;
}

@Injectable()
export class FamilyEmailNotificationsService {
  private readonly logger = new Logger(FamilyEmailNotificationsService.name);

  constructor(
    @InjectRepository(FamilyAlert)
    private alertsRepository: Repository<FamilyAlert>,
    @InjectRepository(Family)
    private familiesRepository: Repository<Family>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private emailService: EmailService,
    private familyAlertsService: FamilyAlertsService,
    private configService: ConfigService,
  ) {}

  /**
   * Envía notificación inmediata cuando se crea una alerta crítica
   */
  async sendImmediateAlert(alertId: string): Promise<void> {
    this.logger.log(`Enviando alerta inmediata para alert ${alertId}`);

    try {
      const alert = await this.alertsRepository.findOne({
        where: { id: alertId },
        relations: ['family', 'family.primaryContact', 'family.secondaryContact', 'student', 'student.user', 'student.user.profile'],
      });

      if (!alert) {
        this.logger.warn(`Alerta ${alertId} no encontrada`);
        return;
      }

      // Solo enviar para alertas críticas o de alta prioridad
      if (alert.priority !== AlertPriority.CRITICAL && alert.priority !== AlertPriority.HIGH) {
        this.logger.debug(`Alerta ${alertId} no es crítica, omitiendo email inmediato`);
        return;
      }

      // Verificar preferencias de la familia
      const preferences = await this.getNotificationPreferences(alert.familyId);
      if (!preferences.immediateAlerts) {
        this.logger.debug(`Familia ${alert.familyId} tiene deshabilitadas las alertas inmediatas`);
        return;
      }

      // Verificar límites de email
      if (!(await this.canSendEmail(alert.familyId, 'immediate'))) {
        this.logger.warn(`Límite de emails alcanzado para familia ${alert.familyId}`);
        return;
      }

      // Verificar horas de silencio
      if (this.isQuietHour(preferences.quietHours)) {
        this.logger.debug(`Hora de silencio activa, programando email para más tarde`);
        // TODO: Programar para después de las horas de silencio
        return;
      }

      // Preparar datos del email
      const emailData = {
        familyId: alert.familyId,
        familyName: alert.family.primaryContact.profile.firstName + ' ' + alert.family.primaryContact.profile.lastName,
        studentName: alert.student.user.profile.firstName + ' ' + alert.student.user.profile.lastName,
        alert: {
          type: alert.alertType,
          priority: alert.priority,
          title: alert.title,
          description: alert.description,
          metadata: alert.metadata,
          createdAt: alert.createdAt,
        }
      };

      // Obtener emails destinatarios
      const recipients = await this.getRecipientEmails(alert.family);

      // Enviar email a cada destinatario
      for (const email of recipients) {
        try {
          await this.sendAlertEmail(email, 'immediate', emailData, preferences.language);
          
          // Log del envío exitoso
          await this.logEmailNotification({
            familyId: alert.familyId,
            emailType: 'immediate',
            alertIds: [alertId],
            recipientEmail: email,
            sentAt: new Date(),
            status: 'sent',
          });

          this.logger.log(`Email inmediato enviado exitosamente a ${email} para familia ${alert.familyId}`);
        } catch (error) {
          this.logger.error(`Error enviando email inmediato a ${email}:`, error);
          
          // Log del error
          await this.logEmailNotification({
            familyId: alert.familyId,
            emailType: 'immediate',
            alertIds: [alertId],
            recipientEmail: email,
            sentAt: new Date(),
            status: 'failed',
            errorMessage: error.message,
          });
        }
      }

    } catch (error) {
      this.logger.error(`Error en sendImmediateAlert para ${alertId}:`, error);
    }
  }

  /**
   * Cron job para enviar resúmenes diarios (todos los días a las 18:00)
   */
  @Cron('0 18 * * *')
  async sendDailySummaries(): Promise<void> {
    this.logger.log('Iniciando envío de resúmenes diarios de alertas');

    try {
      // Obtener todas las familias activas
      const families = await this.familiesRepository.find({
        relations: ['primaryContact', 'secondaryContact'],
      });

      for (const family of families) {
        try {
          await this.sendDailySummaryForFamily(family.id);
        } catch (error) {
          this.logger.error(`Error enviando resumen diario para familia ${family.id}:`, error);
        }
      }

      this.logger.log('Resúmenes diarios completados');
    } catch (error) {
      this.logger.error('Error en sendDailySummaries:', error);
    }
  }

  /**
   * Cron job para enviar resúmenes semanales (domingos a las 10:00)
   */
  @Cron('0 10 * * 0')
  async sendWeeklySummaries(): Promise<void> {
    this.logger.log('Iniciando envío de resúmenes semanales');

    try {
      const families = await this.familiesRepository.find({
        relations: ['primaryContact', 'secondaryContact'],
      });

      for (const family of families) {
        try {
          await this.sendWeeklySummaryForFamily(family.id);
        } catch (error) {
          this.logger.error(`Error enviando resumen semanal para familia ${family.id}:`, error);
        }
      }

      this.logger.log('Resúmenes semanales completados');
    } catch (error) {
      this.logger.error('Error en sendWeeklySummaries:', error);
    }
  }

  /**
   * Envía resumen diario para una familia específica
   */
  private async sendDailySummaryForFamily(familyId: string): Promise<void> {
    const preferences = await this.getNotificationPreferences(familyId);
    
    if (!preferences.dailySummary) {
      return;
    }

    if (!(await this.canSendEmail(familyId, 'daily'))) {
      this.logger.warn(`Límite de emails diarios alcanzado para familia ${familyId}`);
      return;
    }

    // Obtener alertas del día
    const alertsToday = await this.alertsRepository.find({
      where: {
        familyId,
        isActive: true,
        createdAt: new Date(new Date().getTime() - 24 * 60 * 60 * 1000), // Últimas 24 horas
      },
      relations: ['student', 'student.user', 'student.user.profile'],
      order: { priority: 'DESC', createdAt: 'DESC' },
    });

    if (alertsToday.length === 0) {
      this.logger.debug(`No hay alertas nuevas para familia ${familyId}, omitiendo resumen diario`);
      return;
    }

    // Preparar datos del email
    const family = await this.familiesRepository.findOne({
      where: { id: familyId },
      relations: ['primaryContact', 'primaryContact.profile'],
    });

    const emailData = {
      familyId,
      familyName: family.primaryContact.profile.firstName + ' ' + family.primaryContact.profile.lastName,
      date: new Date().toLocaleDateString('es-ES'),
      alerts: alertsToday.map(alert => ({
        studentName: alert.student.user.profile.firstName + ' ' + alert.student.user.profile.lastName,
        type: alert.alertType,
        priority: alert.priority,
        title: alert.title,
        description: alert.description,
        createdAt: alert.createdAt,
      })),
      summary: {
        total: alertsToday.length,
        critical: alertsToday.filter(a => a.priority === AlertPriority.CRITICAL).length,
        high: alertsToday.filter(a => a.priority === AlertPriority.HIGH).length,
        byType: this.groupAlertsByType(alertsToday),
      },
    };

    // Enviar emails
    const recipients = await this.getRecipientEmails(family);
    const alertIds = alertsToday.map(a => a.id);

    for (const email of recipients) {
      try {
        await this.sendAlertEmail(email, 'daily', emailData, preferences.language);
        
        await this.logEmailNotification({
          familyId,
          emailType: 'daily',
          alertIds,
          recipientEmail: email,
          sentAt: new Date(),
          status: 'sent',
        });

        this.logger.log(`Resumen diario enviado exitosamente a ${email} para familia ${familyId}`);
      } catch (error) {
        this.logger.error(`Error enviando resumen diario a ${email}:`, error);
        
        await this.logEmailNotification({
          familyId,
          emailType: 'daily',
          alertIds,
          recipientEmail: email,
          sentAt: new Date(),
          status: 'failed',
          errorMessage: error.message,
        });
      }
    }
  }

  /**
   * Envía resumen semanal para una familia específica
   */
  private async sendWeeklySummaryForFamily(familyId: string): Promise<void> {
    const preferences = await this.getNotificationPreferences(familyId);
    
    if (!preferences.weeklySummary) {
      return;
    }

    // Obtener alertas de la semana
    const alertsWeek = await this.alertsRepository.find({
      where: {
        familyId,
        isActive: true,
        createdAt: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000), // Últimos 7 días
      },
      relations: ['student', 'student.user', 'student.user.profile'],
      order: { priority: 'DESC', createdAt: 'DESC' },
    });

    // Obtener estadísticas de progreso académico
    const progressData = await this.generateWeeklyProgressReport(familyId);

    const family = await this.familiesRepository.findOne({
      where: { id: familyId },
      relations: ['primaryContact', 'primaryContact.profile'],
    });

    const emailData = {
      familyId,
      familyName: family.primaryContact.profile.firstName + ' ' + family.primaryContact.profile.lastName,
      weekPeriod: this.getWeekPeriodString(),
      alerts: alertsWeek,
      progress: progressData,
      summary: {
        totalAlerts: alertsWeek.length,
        resolvedAlerts: alertsWeek.filter(a => a.isViewed).length,
        criticalAlerts: alertsWeek.filter(a => a.priority === AlertPriority.CRITICAL).length,
        byType: this.groupAlertsByType(alertsWeek),
      },
    };

    // Enviar emails
    const recipients = await this.getRecipientEmails(family);
    const alertIds = alertsWeek.map(a => a.id);

    for (const email of recipients) {
      try {
        await this.sendAlertEmail(email, 'weekly', emailData, preferences.language);
        
        await this.logEmailNotification({
          familyId,
          emailType: 'weekly',
          alertIds,
          recipientEmail: email,
          sentAt: new Date(),
          status: 'sent',
        });

        this.logger.log(`Resumen semanal enviado exitosamente a ${email} para familia ${familyId}`);
      } catch (error) {
        this.logger.error(`Error enviando resumen semanal a ${email}:`, error);
      }
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Obtiene las preferencias de notificación para una familia
   */
  private async getNotificationPreferences(familyId: string): Promise<EmailNotificationPreferences> {
    // TODO: Implementar tabla de preferencias, por ahora usar defaults
    return {
      immediateAlerts: true,
      dailySummary: true,
      weeklySummary: true,
      alertTypes: [AlertType.PENDING_TASKS, AlertType.LOW_SUBJECT_GRADE, AlertType.LOW_TASK_GRADE, AlertType.UNJUSTIFIED_ABSENCE],
      maxEmailsPerDay: 5,
      quietHours: {
        start: '22:00',
        end: '08:00',
      },
      language: 'es',
    };
  }

  /**
   * Verifica si se puede enviar un email (respeta límites)
   */
  private async canSendEmail(familyId: string, emailType: string): Promise<boolean> {
    // TODO: Implementar verificación de límites en tabla de logs
    // Por ahora, siempre permitir
    return true;
  }

  /**
   * Verifica si estamos en horas de silencio
   */
  private isQuietHour(quietHours: { start: string; end: string }): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const startTime = this.parseTime(quietHours.start);
    const endTime = this.parseTime(quietHours.end);
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Caso overnight (ej: 22:00 a 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 100 + minutes;
  }

  /**
   * Obtiene emails de destinatarios para una familia
   */
  private async getRecipientEmails(family: Family): Promise<string[]> {
    const emails: string[] = [];
    
    if (family.primaryContact?.email) {
      emails.push(family.primaryContact.email);
    }
    
    if (family.secondaryContact?.email && family.secondaryContact.email !== family.primaryContact?.email) {
      emails.push(family.secondaryContact.email);
    }
    
    return emails;
  }

  /**
   * Envía el email usando el servicio de email y templates
   */
  private async sendAlertEmail(
    recipientEmail: string,
    emailType: 'immediate' | 'daily' | 'weekly',
    data: any,
    language: string,
  ): Promise<void> {
    const templates = {
      immediate: this.generateImmediateAlertTemplate(data, language),
      daily: this.generateDailySummaryTemplate(data, language),
      weekly: this.generateWeeklySummaryTemplate(data, language),
    };

    const template = templates[emailType];

    await this.emailService.sendEmail({
      to: recipientEmail,
      subject: template.subject,
      htmlContent: template.html,
      textContent: template.html.replace(/<[^>]*>/g, ''),
      priority: 'normal' as any,
      triggeredBy: 'family_email_notifications'
    });
  }

  /**
   * Log de notificaciones enviadas
   */
  private async logEmailNotification(log: Partial<EmailNotificationLog>): Promise<void> {
    // TODO: Implementar tabla de logs de email
    this.logger.debug(`Email log: ${JSON.stringify(log)}`);
  }

  /**
   * Agrupa alertas por tipo para estadísticas
   */
  private groupAlertsByType(alerts: FamilyAlert[]): Record<string, number> {
    return alerts.reduce((acc, alert) => {
      acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Genera reporte de progreso semanal
   */
  private async generateWeeklyProgressReport(familyId: string): Promise<any> {
    // TODO: Implementar lógica de progreso académico
    return {
      gradesImprovement: 0,
      attendanceRate: 95,
      tasksCompleted: 12,
      totalTasks: 15,
    };
  }

  private getWeekPeriodString(): string {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return `${weekStart.toLocaleDateString('es-ES')} - ${now.toLocaleDateString('es-ES')}`;
  }

  // ==================== TEMPLATES DE EMAIL ====================

  private generateImmediateAlertTemplate(data: any, language: string) {
    const subject = `⚠️ Alerta importante: ${data.alert.title} - ${data.studentName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #fa8c16; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .alert-card { background: white; border-left: 4px solid #f5222d; padding: 15px; margin: 15px 0; }
          .priority-critical { border-left-color: #f5222d; }
          .priority-high { border-left-color: #fa8c16; }
          .btn { background: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Alerta Académica Importante</h1>
            <p>MW Panel - Sistema de Gestión Educativa</p>
          </div>
          
          <div class="content">
            <p><strong>Estimada familia ${data.familyName},</strong></p>
            
            <p>Se ha detectado una situación académica importante que requiere su atención:</p>
            
            <div class="alert-card priority-${data.alert.priority}">
              <h3>${data.alert.title}</h3>
              <p><strong>Estudiante:</strong> ${data.studentName}</p>
              <p><strong>Descripción:</strong> ${data.alert.description}</p>
              <p><strong>Prioridad:</strong> ${this.getPriorityLabel(data.alert.priority)}</p>
              <p><strong>Detectado:</strong> ${new Date(data.alert.createdAt).toLocaleString('es-ES')}</p>
            </div>
            
            <p><strong>Acción recomendada:</strong></p>
            <ul>
              <li>Revise los detalles en el panel familiar</li>
              <li>Contacte con el profesor/tutor si es necesario</li>
              <li>Apoye a su hijo/a en la resolución de la situación</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="https://plataforma.mundoworld.school/family" class="btn">
                Ver Dashboard Familiar
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>Este email ha sido enviado automáticamente por MW Panel.<br>
            Para cambiar sus preferencias de notificación, visite su panel de configuración.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html };
  }

  private generateDailySummaryTemplate(data: any, language: string) {
    const subject = `📊 Resumen diario de alertas académicas - ${data.date}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1890ff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .summary-stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat-card { background: white; padding: 15px; text-align: center; border-radius: 5px; min-width: 100px; }
          .alert-item { background: white; border-left: 3px solid #faad14; padding: 10px; margin: 10px 0; }
          .btn { background: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Resumen Diario</h1>
            <p>${data.date}</p>
          </div>
          
          <div class="content">
            <p><strong>Estimada familia ${data.familyName},</strong></p>
            
            <p>Resumen de alertas académicas detectadas hoy:</p>
            
            <div class="summary-stats">
              <div class="stat-card">
                <h3>${data.summary.total}</h3>
                <p>Total Alertas</p>
              </div>
              <div class="stat-card">
                <h3>${data.summary.critical}</h3>
                <p>Críticas</p>
              </div>
              <div class="stat-card">
                <h3>${data.summary.high}</h3>
                <p>Alta Prioridad</p>
              </div>
            </div>
            
            <h3>Alertas Detectadas:</h3>
            ${data.alerts.map(alert => `
              <div class="alert-item">
                <strong>${alert.studentName}</strong> - ${alert.title}<br>
                <small>${alert.description}</small>
              </div>
            `).join('')}
            
            <div style="text-align: center;">
              <a href="https://plataforma.mundoworld.school/family" class="btn">
                Ver Dashboard Completo
              </a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html };
  }

  private generateWeeklySummaryTemplate(data: any, language: string) {
    const subject = `📈 Resumen semanal académico - ${data.weekPeriod}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #52c41a; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .progress-card { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .btn { background: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📈 Resumen Semanal</h1>
            <p>${data.weekPeriod}</p>
          </div>
          
          <div class="content">
            <p><strong>Estimada familia ${data.familyName},</strong></p>
            
            <p>Resumen del progreso académico de esta semana:</p>
            
            <div class="progress-card">
              <h3>📊 Estadísticas de la Semana</h3>
              <ul>
                <li><strong>Alertas totales:</strong> ${data.summary.totalAlerts}</li>
                <li><strong>Alertas resueltas:</strong> ${data.summary.resolvedAlerts}</li>
                <li><strong>Asistencia:</strong> ${data.progress.attendanceRate}%</li>
                <li><strong>Tareas completadas:</strong> ${data.progress.tasksCompleted}/${data.progress.totalTasks}</li>
              </ul>
            </div>
            
            <div style="text-align: center;">
              <a href="https://plataforma.mundoworld.school/family" class="btn">
                Ver Informe Completo
              </a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html };
  }

  private getPriorityLabel(priority: string): string {
    const labels = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      critical: 'Crítica',
    };
    return labels[priority] || priority;
  }
}