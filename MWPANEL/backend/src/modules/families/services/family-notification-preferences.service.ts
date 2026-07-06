/**
 * @archivo: family-notification-preferences.service.ts
 * @módulo: Families (Servicio de Preferencias de Notificación)
 * @función: Gestión completa de preferencias y logs de notificaciones email
 * @crítico: SÍ - Control granular y auditoría de comunicaciones
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { FamilyNotificationPreferences } from '../entities/family-notification-preferences.entity';
import { FamilyEmailLog, EmailStatus, EmailType } from '../entities/family-email-log.entity';
import { Family } from '../../users/entities/family.entity';
import { FamilyEmailNotificationsService } from './family-email-notifications.service';
import { EmailService } from '../../communications/services/email.service';

@Injectable()
export class FamilyNotificationPreferencesService {
  private readonly logger = new Logger(FamilyNotificationPreferencesService.name);

  constructor(
    @InjectRepository(FamilyNotificationPreferences)
    private preferencesRepository: Repository<FamilyNotificationPreferences>,
    @InjectRepository(FamilyEmailLog)
    private emailLogRepository: Repository<FamilyEmailLog>,
    @InjectRepository(Family)
    private familiesRepository: Repository<Family>,
    private emailService: EmailService,
  ) {}

  /**
   * Obtiene las preferencias de una familia (crea defaults si no existen)
   */
  async getPreferences(familyId: string): Promise<FamilyNotificationPreferences> {
    let preferences = await this.preferencesRepository.findOne({
      where: { familyId },
    });

    if (!preferences) {
      // Crear preferencias por defecto
      preferences = await this.createDefaultPreferences(familyId);
    }

    return preferences;
  }

  /**
   * Obtiene el familyId desde el userId
   */
  async getFamilyIdFromUserId(userId: string): Promise<string> {
    const family = await this.familiesRepository.findOne({
      where: [
        { primaryContact: { id: userId } },
        { secondaryContact: { id: userId } }
      ]
    });

    if (!family) {
      throw new Error('No se encontró la familia para este usuario');
    }

    return family.id;
  }

  /**
   * Actualiza las preferencias de una familia
   */
  async updatePreferences(
    familyId: string,
    updates: Partial<FamilyNotificationPreferences>,
  ): Promise<FamilyNotificationPreferences> {
    let preferences = await this.preferencesRepository.findOne({
      where: { familyId },
    });

    if (!preferences) {
      preferences = await this.createDefaultPreferences(familyId);
    }

    // Validaciones de seguridad
    if (updates.maxEmailsPerDay && updates.maxEmailsPerDay > 20) {
      updates.maxEmailsPerDay = 20; // Límite máximo de seguridad
    }

    if (updates.maxImmediateAlertsPerHour && updates.maxImmediateAlertsPerHour > 10) {
      updates.maxImmediateAlertsPerHour = 10; // Límite máximo de seguridad
    }

    // Validar formato de horas
    if (updates.quietHoursStart && !this.isValidTimeFormat(updates.quietHoursStart)) {
      throw new Error('Formato de hora de inicio inválido. Use HH:MM');
    }

    if (updates.quietHoursEnd && !this.isValidTimeFormat(updates.quietHoursEnd)) {
      throw new Error('Formato de hora de fin inválido. Use HH:MM');
    }

    // Validar emails adicionales
    if (updates.additionalEmails) {
      for (const email of updates.additionalEmails) {
        if (!this.isValidEmail(email)) {
          throw new Error(`Email inválido: ${email}`);
        }
      }
    }

    // Aplicar actualizaciones
    Object.assign(preferences, updates);
    
    const savedPreferences = await this.preferencesRepository.save(preferences);

    this.logger.log(`Preferencias actualizadas para familia ${familyId}`);

    return savedPreferences;
  }

  /**
   * Obtiene el historial de emails enviados con paginación
   */
  async getEmailHistory(familyId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [emails, total] = await this.emailLogRepository.findAndCount({
      where: { familyId },
      order: { sentAt: 'DESC' },
      skip,
      take: limit,
    });

    // Calcular estadísticas
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [emailsToday, emailsThisWeek] = await Promise.all([
      this.emailLogRepository.count({
        where: {
          familyId,
          sentAt: Between(startOfToday, now),
          status: EmailStatus.SENT,
        },
      }),
      this.emailLogRepository.count({
        where: {
          familyId,
          sentAt: Between(startOfWeek, now),
          status: EmailStatus.SENT,
        },
      }),
    ]);

    // Calcular tasas de apertura y clicks
    const sentEmails = emails.filter(e => e.status === EmailStatus.SENT);
    const openedEmails = sentEmails.filter(e => e.openedAt);
    const clickedEmails = sentEmails.filter(e => e.clickCount > 0);

    const openRate = sentEmails.length > 0 ? (openedEmails.length / sentEmails.length) * 100 : 0;
    const clickRate = sentEmails.length > 0 ? (clickedEmails.length / sentEmails.length) * 100 : 0;

    return {
      totalEmails: total,
      emailsToday,
      emailsThisWeek,
      openRate: Math.round(openRate * 10) / 10,
      clickRate: Math.round(clickRate * 10) / 10,
      emails: emails.map(email => ({
        id: email.id,
        emailType: email.emailType,
        subject: email.subject,
        recipientEmail: email.recipientEmail,
        status: email.status,
        sentAt: email.sentAt,
        openedAt: email.openedAt,
        alertCount: email.alertCount,
        clickCount: email.clickCount,
        engagementScore: email.engagementScore,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Envía un email de prueba
   */
  async sendTestEmail(
    familyId: string,
    emailType: 'immediate' | 'daily' | 'weekly',
    recipientEmail?: string,
  ): Promise<{ recipientEmail: string }> {
    const family = await this.familiesRepository.findOne({
      where: { id: familyId },
      relations: ['primaryContact', 'secondaryContact'],
    });

    if (!family) {
      throw new Error('Familia no encontrada');
    }

    // Determinar email destinatario
    const targetEmail = recipientEmail || family.primaryContact?.email;
    
    if (!targetEmail) {
      throw new Error('No se encontró email destinatario');
    }

    // Crear datos de prueba según el tipo
    const testData = this.generateTestEmailData(emailType, family);

    // Registrar en log antes de enviar
    const emailLog = this.emailLogRepository.create({
      familyId,
      emailType: emailType as EmailType,
      recipientEmail: targetEmail,
      subject: testData.subject,
      alertIds: [],
      alertCount: 0,
      status: EmailStatus.PENDING,
      contentMetadata: {
        template: `test_${emailType}`,
        language: 'es',
        personalizations: testData,
        attachmentCount: 0,
        hasImages: true,
        estimatedReadTime: 60,
      },
    });

    await this.emailLogRepository.save(emailLog);

    try {
      // 🔥 USAR EMAIL SERVICE REAL EN LUGAR DE SIMULACIÓN
      await this.emailService.sendEmail({
        to: targetEmail,
        subject: testData.subject,
        htmlContent: this.generateEmailHtml(testData),
        textContent: this.generateEmailText(testData),
        priority: 'normal' as any,
        isTest: true,
        triggeredBy: 'family_notification_test'
      });

      // Actualizar log como enviado
      emailLog.status = EmailStatus.SENT;
      emailLog.sentAt = new Date();
      await this.emailLogRepository.save(emailLog);

      this.logger.log(`Email de prueba ${emailType} enviado exitosamente a ${targetEmail}`);

      return { recipientEmail: targetEmail };
    } catch (error) {
      // Actualizar log como fallido
      emailLog.status = EmailStatus.FAILED;
      emailLog.errorMessage = error.message;
      await this.emailLogRepository.save(emailLog);

      this.logger.error(`Error enviando email de prueba a ${targetEmail}:`, error);
      throw error;
    }
  }

  /**
   * Desactiva temporalmente las notificaciones
   */
  async disableTemporarily(
    familyId: string,
    disableUntil: Date,
    reason?: string,
  ): Promise<void> {
    const preferences = await this.getPreferences(familyId);

    preferences.temporarilyDisabledUntil = disableUntil;
    preferences.isActive = false;

    await this.preferencesRepository.save(preferences);

    this.logger.log(`Notificaciones desactivadas temporalmente para familia ${familyId} hasta ${disableUntil.toISOString()}. Razón: ${reason || 'No especificada'}`);
  }

  /**
   * Reactiva las notificaciones
   */
  async enableNotifications(familyId: string): Promise<void> {
    const preferences = await this.getPreferences(familyId);

    preferences.temporarilyDisabledUntil = null;
    preferences.isActive = true;

    await this.preferencesRepository.save(preferences);

    this.logger.log(`Notificaciones reactivadas para familia ${familyId}`);
  }

  /**
   * Obtiene estadísticas detalladas de notificaciones
   */
  async getNotificationStatistics(familyId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Estadísticas generales
    const [totalEmailsSent, emailsThisMonth] = await Promise.all([
      this.emailLogRepository.count({
        where: { familyId, status: EmailStatus.SENT },
      }),
      this.emailLogRepository.count({
        where: {
          familyId,
          status: EmailStatus.SENT,
          sentAt: Between(startOfMonth, now),
        },
      }),
    ]);

    // Estadísticas de engagement
    const sentEmails = await this.emailLogRepository.find({
      where: { familyId, status: EmailStatus.SENT },
      select: ['openedAt', 'clickCount', 'emailType', 'engagementScore'],
    });

    const totalOpened = sentEmails.filter(e => e.openedAt).length;
    const totalClicked = sentEmails.filter(e => e.clickCount > 0).length;

    const averageOpenRate = sentEmails.length > 0 ? (totalOpened / sentEmails.length) * 100 : 0;
    const averageClickRate = sentEmails.length > 0 ? (totalClicked / sentEmails.length) * 100 : 0;

    // Estadísticas por tipo de email
    const byType = {};
    for (const type of Object.values(EmailType)) {
      const typeEmails = sentEmails.filter(e => e.emailType === type);
      const typeOpened = typeEmails.filter(e => e.openedAt).length;
      const typeClicked = typeEmails.filter(e => e.clickCount > 0).length;

      byType[type] = {
        sent: typeEmails.length,
        opened: typeOpened,
        clicked: typeClicked,
        openRate: typeEmails.length > 0 ? (typeOpened / typeEmails.length) * 100 : 0,
        clickRate: typeEmails.length > 0 ? (typeClicked / typeEmails.length) * 100 : 0,
        averageEngagement: typeEmails.length > 0 
          ? typeEmails.reduce((sum, e) => sum + e.engagementScore, 0) / typeEmails.length 
          : 0,
      };
    }

    // Encontrar tipo más exitoso
    const mostEngagedEmailType = Object.entries(byType)
      .filter(([_, stats]: [string, any]) => stats.sent > 0)
      .sort(([_, a]: [string, any], [__, b]: [string, any]) => b.averageEngagement - a.averageEngagement)[0]?.[0] || 'immediate';

    return {
      totalEmailsSent,
      emailsThisMonth,
      averageOpenRate: Math.round(averageOpenRate * 10) / 10,
      averageClickRate: Math.round(averageClickRate * 10) / 10,
      mostEngagedEmailType,
      byType,
      trends: await this.calculateEngagementTrends(familyId),
    };
  }

  /**
   * Verifica si una familia puede recibir un email según sus límites
   */
  async canSendEmail(
    familyId: string,
    emailType: EmailType,
  ): Promise<{ canSend: boolean; reason?: string }> {
    const preferences = await this.getPreferences(familyId);

    // Verificar si está activo
    if (!preferences.isActive) {
      return { canSend: false, reason: 'Notificaciones desactivadas' };
    }

    // Verificar desactivación temporal
    if (preferences.temporarilyDisabledUntil && new Date() < preferences.temporarilyDisabledUntil) {
      return { 
        canSend: false, 
        reason: `Desactivado temporalmente hasta ${preferences.temporarilyDisabledUntil.toLocaleDateString('es-ES')}` 
      };
    }

    // Verificar límites diarios
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const emailsToday = await this.emailLogRepository.count({
      where: {
        familyId,
        status: EmailStatus.SENT,
        sentAt: Between(startOfDay, today),
      },
    });

    if (emailsToday >= preferences.maxEmailsPerDay) {
      return { 
        canSend: false, 
        reason: `Límite diario alcanzado (${preferences.maxEmailsPerDay} emails)` 
      };
    }

    // Verificar límites por hora para emails inmediatos
    if (emailType === EmailType.IMMEDIATE) {
      const oneHourAgo = new Date(today.getTime() - 60 * 60 * 1000);
      
      const immediateEmailsLastHour = await this.emailLogRepository.count({
        where: {
          familyId,
          emailType: EmailType.IMMEDIATE,
          status: EmailStatus.SENT,
          sentAt: Between(oneHourAgo, today),
        },
      });

      if (immediateEmailsLastHour >= preferences.maxImmediateAlertsPerHour) {
        return { 
          canSend: false, 
          reason: `Límite por hora alcanzado (${preferences.maxImmediateAlertsPerHour} emails inmediatos)` 
        };
      }
    }

    // Verificar horas de silencio
    if (preferences.respectQuietHours && this.isQuietHour(preferences)) {
      return { 
        canSend: false, 
        reason: `Hora de silencio (${preferences.quietHoursStart} - ${preferences.quietHoursEnd})` 
      };
    }

    return { canSend: true };
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private async createDefaultPreferences(familyId: string): Promise<FamilyNotificationPreferences> {
    const preferences = this.preferencesRepository.create({
      familyId,
      // Los valores por defecto están definidos en la entidad
    });

    return this.preferencesRepository.save(preferences);
  }

  private isValidTimeFormat(time: string): boolean {
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isQuietHour(preferences: FamilyNotificationPreferences): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const startTime = this.parseTime(preferences.quietHoursStart);
    const endTime = this.parseTime(preferences.quietHoursEnd);
    
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

  private generateTestEmailData(emailType: string, family: Family) {
    const templates = {
      immediate: {
        subject: '🧪 Email de Prueba - Alerta Inmediata',
        studentName: 'Estudiante de Prueba',
        alertTitle: 'Esta es una alerta de prueba',
        alertDescription: 'Este email de prueba verifica que su configuración de alertas inmediatas funciona correctamente.',
      },
      daily: {
        subject: '🧪 Email de Prueba - Resumen Diario',
        date: new Date().toLocaleDateString('es-ES'),
        totalAlerts: 3,
        students: ['Estudiante 1', 'Estudiante 2'],
      },
      weekly: {
        subject: '🧪 Email de Prueba - Resumen Semanal',
        weekPeriod: this.getWeekPeriodString(),
        progressSummary: 'Este es un resumen de prueba del progreso semanal.',
      },
    };

    return templates[emailType] || templates.immediate;
  }

  /**
   * Genera contenido HTML para el email
   */
  private generateEmailHtml(data: any): string {
    const { subject, ...templateData } = data;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1890ff; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
            .footer { margin-top: 20px; font-size: 12px; color: #666; }
            .button { background: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Mundo World School</h1>
              <h2>${subject}</h2>
            </div>
            <div class="content">
              ${this.generateEmailContent(templateData)}
            </div>
            <div class="footer">
              <p>Este es un email automático de MW Panel 2.0</p>
              <p>Para más información, visite <a href="https://plataforma.mundoworld.school">plataforma.mundoworld.school</a></p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Genera contenido texto plano para el email
   */
  private generateEmailText(data: any): string {
    const { subject, ...templateData } = data;
    
    return `
MUNDO WORLD SCHOOL
${subject}

${this.generateEmailContentText(templateData)}

---
Este es un email automático de MW Panel 2.0
Para más información, visite: https://plataforma.mundoworld.school
    `.trim();
  }

  /**
   * Genera el contenido específico del email según el tipo
   */
  private generateEmailContent(data: any): string {
    if (data.studentName) {
      // Email inmediato
      return `
        <h3>🚨 ${data.alertTitle}</h3>
        <p><strong>Estudiante:</strong> ${data.studentName}</p>
        <p>${data.alertDescription}</p>
        <p style="margin-top: 20px;">
          <a href="https://plataforma.mundoworld.school" class="button">Ver Detalles</a>
        </p>
      `;
    } else if (data.date) {
      // Email diario
      return `
        <h3>📊 Resumen del día ${data.date}</h3>
        <p><strong>Total de alertas:</strong> ${data.totalAlerts}</p>
        <p><strong>Estudiantes involucrados:</strong> ${data.students.join(', ')}</p>
        <p style="margin-top: 20px;">
          <a href="https://plataforma.mundoworld.school" class="button">Ver Dashboard</a>
        </p>
      `;
    } else if (data.weekPeriod) {
      // Email semanal
      return `
        <h3>📈 Resumen semanal ${data.weekPeriod}</h3>
        <p>${data.progressSummary}</p>
        <p style="margin-top: 20px;">
          <a href="https://plataforma.mundoworld.school" class="button">Ver Reportes</a>
        </p>
      `;
    }
    
    return '<p>Email de prueba del sistema de notificaciones familiares.</p>';
  }

  /**
   * Genera el contenido de texto plano específico del email
   */
  private generateEmailContentText(data: any): string {
    if (data.studentName) {
      return `
🚨 ${data.alertTitle}
Estudiante: ${data.studentName}
${data.alertDescription}

Ver detalles en: https://plataforma.mundoworld.school
      `.trim();
    } else if (data.date) {
      return `
📊 Resumen del día ${data.date}
Total de alertas: ${data.totalAlerts}
Estudiantes involucrados: ${data.students.join(', ')}

Ver dashboard en: https://plataforma.mundoworld.school
      `.trim();
    } else if (data.weekPeriod) {
      return `
📈 Resumen semanal ${data.weekPeriod}
${data.progressSummary}

Ver reportes en: https://plataforma.mundoworld.school
      `.trim();
    }
    
    return 'Email de prueba del sistema de notificaciones familiares.';
  }

  private async calculateEngagementTrends(familyId: string) {
    // Calcular tendencias de engagement de los últimos 30 días
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const recentEmails = await this.emailLogRepository.find({
      where: {
        familyId,
        status: EmailStatus.SENT,
        sentAt: Between(thirtyDaysAgo, new Date()),
      },
      select: ['sentAt', 'openedAt', 'clickCount', 'engagementScore'],
      order: { sentAt: 'ASC' },
    });

    // Agrupar por semana y calcular promedios
    const weeklyTrends = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(Date.now() - (4 - i) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(Date.now() - (3 - i) * 7 * 24 * 60 * 60 * 1000);
      
      const weekEmails = recentEmails.filter(e => 
        e.sentAt >= weekStart && e.sentAt < weekEnd
      );

      if (weekEmails.length > 0) {
        const averageEngagement = weekEmails.reduce((sum, e) => sum + e.engagementScore, 0) / weekEmails.length;
        const openRate = weekEmails.filter(e => e.openedAt).length / weekEmails.length * 100;
        
        weeklyTrends.push({
          week: `Semana ${i + 1}`,
          engagement: Math.round(averageEngagement),
          openRate: Math.round(openRate),
          emailsSent: weekEmails.length,
        });
      }
    }

    return weeklyTrends;
  }

  private getWeekPeriodString(): string {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return `${weekStart.toLocaleDateString('es-ES')} - ${now.toLocaleDateString('es-ES')}`;
  }
}