/**
 * @archivo: grade-notifications.service.ts
 * @módulo: Communications - Grade Notifications
 * @función: Servicio para enviar notificaciones cuando se registran nuevas calificaciones
 * @creado_por: Sistema de Automatización de Emails MW Panel 2.0
 * @fecha: 2025-07-18
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailAutomationService } from './email-automation.service';
import { EmailService } from './email.service';
import { EmailEventType } from '../entities/email-automation.entity';
import { Family, FamilyStudent } from '../../users/entities/family.entity';

interface GradeNotificationData {
  gradeId: string;
  studentId: string;
  studentFullName: string;
  subjectName: string;
  activityName: string;
  gradeValue: number;
  gradeScale: number;
  passingThreshold: number;
  teacherName: string;
  teacherComments?: string;
  isPassing: boolean;
  achievementLevel: string;
  period: string;
  gradeDate: string;
}

export interface RubricNotificationData {
  assessmentId: string;
  studentId: string;
  studentFullName: string;
  subjectName: string;
  activityName: string;
  rubricName: string;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  teacherName: string;
  comments?: string;
  isPassing: boolean;
  criteriaResults: Array<{
    criterionName: string;
    levelName: string;
    score: number;
    weight: number;
  }>;
  assessmentDate: string;
}

@Injectable()
export class GradeNotificationsService {
  private readonly logger = new Logger(GradeNotificationsService.name);

  // Registro de notificaciones enviadas para evitar duplicados
  private sentNotifications = new Map<string, Date>();

  private resend: Resend;
  private readonly fromEmail = 'no-reply@mundoworld.school';
  private readonly fromName = 'Mundo World School';

  constructor(
    @InjectRepository(Family)
    private familyRepository: Repository<Family>,
    @InjectRepository(FamilyStudent)
    private familyStudentRepository: Repository<FamilyStudent>,
    private emailAutomationService: EmailAutomationService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    // Inicializar Resend directamente
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
      this.logger.log('✅ Resend initialized for GradeNotificationsService');
    } else {
      this.logger.warn('⚠️ RESEND_API_KEY not found');
    }
    // Limpiar notificaciones enviadas cada 24 horas
    setInterval(() => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      for (const [key, date] of this.sentNotifications.entries()) {
        if (date < yesterday) {
          this.sentNotifications.delete(key);
        }
      }
    }, 24 * 60 * 60 * 1000); // 24 horas
  }

  /**
   * Enviar notificación de nueva calificación a familias
   */
  async notifyGradeCreated(gradeData: GradeNotificationData): Promise<void> {
    this.logger.log(`🎯 Iniciando notificación de calificación para estudiante ${gradeData.studentFullName}`);
    
    try {
      // Verificar si ya se envió notificación hoy para esta calificación
      const notificationKey = `${gradeData.gradeId}_${new Date().toDateString()}`;
      if (this.sentNotifications.has(notificationKey)) {
        this.logger.log(`ℹ️ Notificación ya enviada hoy para calificación ${gradeData.gradeId}`);
        return;
      }

      // Obtener automatizaciones activas para calificaciones
      const gradeAutomations = await this.emailAutomationService.getAutomationsByEvent(
        EmailEventType.GRADE_CREATED
      );

      if (gradeAutomations.length === 0) {
        this.logger.log('ℹ️ No hay automatizaciones activas para nuevas calificaciones');
        return;
      }

      // Encontrar familias del estudiante
      const families = await this.findStudentFamilies(gradeData.studentId);
      
      if (families.length === 0) {
        this.logger.warn(`⚠️ No se encontraron familias para el estudiante: ${gradeData.studentFullName}`);
        return;
      }

      let emailsSent = 0;

      // Procesar cada familia
      for (const family of families) {
        await this.sendGradeNotificationToFamily(family, gradeData, gradeAutomations);
        emailsSent++;
      }

      // Marcar como enviado para evitar duplicados
      this.sentNotifications.set(notificationKey, new Date());

      this.logger.log(`✅ Notificación de calificación enviada a ${emailsSent} familias para ${gradeData.studentFullName}`);
      
    } catch (error) {
      this.logger.error('❌ Error en notificación de calificación:', error);
    }
  }

  /**
   * Enviar notificación de nueva evaluación de rúbrica a familias
   */
  async notifyRubricAssessment(rubricData: RubricNotificationData): Promise<void> {
    this.logger.log(`🎯 Iniciando notificación de evaluación de rúbrica para estudiante ${rubricData.studentFullName}`);
    
    try {
      // Verificar si ya se envió notificación hoy para esta evaluación
      const notificationKey = `rubric_${rubricData.assessmentId}_${new Date().toDateString()}`;
      if (this.sentNotifications.has(notificationKey)) {
        this.logger.log(`ℹ️ Notificación de rúbrica ya enviada hoy para evaluación ${rubricData.assessmentId}`);
        return;
      }

      // Obtener automatizaciones activas para calificaciones (reutilizamos las de GRADE_CREATED)
      const gradeAutomations = await this.emailAutomationService.getAutomationsByEvent(
        EmailEventType.GRADE_CREATED
      );

      if (gradeAutomations.length === 0) {
        this.logger.log('ℹ️ No hay automatizaciones activas para evaluaciones de rúbricas');
        return;
      }

      // Buscar familias del estudiante
      const families = await this.findStudentFamilies(rubricData.studentId);
      
      if (families.length === 0) {
        this.logger.warn(`⚠️ No se encontraron familias para el estudiante: ${rubricData.studentFullName}`);
        return;
      }

      let emailsSent = 0;

      // Procesar cada familia
      for (const family of families) {
        await this.sendRubricNotificationToFamily(family, rubricData, gradeAutomations);
        emailsSent++;
      }

      // Marcar como enviado para evitar duplicados
      this.sentNotifications.set(notificationKey, new Date());

      this.logger.log(`✅ Notificación de evaluación de rúbrica enviada a ${emailsSent} familias para ${rubricData.studentFullName}`);
      
    } catch (error) {
      this.logger.error('❌ Error en notificación de evaluación de rúbrica:', error);
    }
  }

  /**
   * Buscar las familias de un estudiante
   */
  private async findStudentFamilies(studentId: string): Promise<Family[]> {
    try {
      const familyStudents = await this.familyStudentRepository.find({
        where: { studentId },
        relations: [
          'family',
          'family.primaryContact',
          'family.primaryContact.profile',
          'family.secondaryContact',
          'family.secondaryContact.profile'
        ]
      });

      return familyStudents.map(fs => fs.family).filter(family => family);
    } catch (error) {
      this.logger.error(`❌ Error buscando familias para estudiante ${studentId}:`, error);
      return [];
    }
  }

  /**
   * Enviar notificación a una familia específica
   */
  private async sendGradeNotificationToFamily(
    family: Family, 
    gradeData: GradeNotificationData, 
    automations: any[]
  ): Promise<void> {
    try {
      // Determinar destinatarios
      const recipients = [];
      
      if (family.primaryContact && family.primaryContact.isActive) {
        recipients.push({
          email: family.primaryContact.email,
          name: `${family.primaryContact.profile?.firstName} ${family.primaryContact.profile?.lastName}`,
        });
      }

      if (family.secondaryContact && family.secondaryContact.isActive) {
        recipients.push({
          email: family.secondaryContact.email,
          name: `${family.secondaryContact.profile?.firstName} ${family.secondaryContact.profile?.lastName}`,
        });
      }

      if (recipients.length === 0) {
        this.logger.warn(`⚠️ No hay contactos activos para la familia del estudiante: ${gradeData.studentFullName}`);
        return;
      }

      // Enviar email a cada destinatario
      for (const recipient of recipients) {
        // Preparar variables del email
        const emailVariables = {
          recipientName: recipient.name,
          studentFullName: gradeData.studentFullName,
          gradeDate: this.formatDateToDDMMYYYY(gradeData.gradeDate),
          subjectName: gradeData.subjectName,
          activityName: gradeData.activityName,
          gradeValue: gradeData.gradeValue?.toString() || '0',
          gradeScale: gradeData.gradeScale?.toString() || '10',
          passingThreshold: gradeData.passingThreshold?.toString() || '60',
          teacherName: gradeData.teacherName,
          teacherComments: gradeData.teacherComments || '',
          isPassing: gradeData.isPassing,
          achievementLevel: gradeData.achievementLevel,
          currentDate: this.formatDateToDDMMYYYY(new Date().toISOString()),
          period: gradeData.period,
        };

        // Enviar a cada automatización configurada
        for (const automation of automations) {
          try {
            // ⭐ USAR RESEND DIRECTAMENTE (método que funciona 100%)
            const htmlContent = this.generateGradeNotificationHTML(emailVariables, gradeData);
            const textContent = this.generateGradeNotificationText(emailVariables, gradeData);
            
            await this.sendEmailDirectly(
              recipient.email,
              `📊 Nueva calificación registrada para ${gradeData.studentFullName} en ${gradeData.subjectName}`,
              htmlContent,
              textContent
            );

            this.logger.log(`📧 Email de calificación enviado a ${recipient.name} (${recipient.email})`);
          } catch (emailError) {
            this.logger.error(`❌ Error enviando email a ${recipient.email}:`, emailError);
          }
        }
      }

      // Incrementar contador de emails enviados
      for (const automation of automations) {
        await this.emailAutomationService.incrementEmailsSent(automation.id);
      }

    } catch (error) {
      this.logger.error(`❌ Error enviando notificación a familia:`, error);
    }
  }

  /**
   * Obtener estadísticas de notificaciones de calificaciones
   */
  getNotificationStats(): any {
    return {
      pendingNotifications: this.sentNotifications.size,
      lastCleanup: new Date(),
      totalNotificationsSentToday: this.sentNotifications.size,
    };
  }

  /**
   * Método para testing manual
   */
  async testGradeNotification(gradeData: GradeNotificationData): Promise<{ message: string; familiesFound: number }> {
    this.logger.log('🧪 Ejecutando test manual de notificación de calificación...');
    
    try {
      const families = await this.findStudentFamilies(gradeData.studentId);
      await this.notifyGradeCreated(gradeData);
      
      return {
        message: 'Test de notificación de calificación ejecutado correctamente',
        familiesFound: families.length,
      };
    } catch (error) {
      this.logger.error('❌ Error en test de notificación:', error);
      throw error;
    }
  }

  /**
   * Genera HTML directo para notificación de calificación (enfoque que funciona)
   */
  private generateGradeNotificationHTML(emailVariables: any, gradeData: GradeNotificationData): string {
    const isPassingStyle = gradeData.isPassing 
      ? 'background: #f6ffed; border-left: 4px solid #52c41a;' 
      : 'background: #fff2f0; border-left: 4px solid #ff4d4f;';
    
    const gradeColor = gradeData.isPassing ? '#52c41a' : '#ff4d4f';
    const gradeIcon = gradeData.isPassing ? '✅' : '⚠️';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nueva Calificación - ${gradeData.studentFullName}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .header p { margin: 5px 0 0; opacity: 0.9; }
          .content { padding: 30px 20px; }
          .greeting { font-size: 16px; margin-bottom: 20px; }
          .grade-card { ${isPassingStyle} padding: 20px; border-radius: 8px; margin: 20px 0; }
          .grade-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
          .grade-icon { font-size: 24px; }
          .grade-title { font-size: 18px; font-weight: 600; color: ${gradeColor}; margin: 0; }
          .grade-details { margin: 15px 0; }
          .grade-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .grade-label { font-weight: 500; color: #666; }
          .grade-value { font-weight: 600; }
          .grade-score { font-size: 20px; color: ${gradeColor}; font-weight: 700; }
          .comments-section { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .comments-title { font-weight: 600; margin-bottom: 8px; color: #495057; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; transition: transform 0.2s; }
          .btn:hover { transform: translateY(-2px); }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-top: 1px solid #e9ecef; }
          .footer-links { margin: 10px 0; }
          .footer-links a { color: #667eea; text-decoration: none; margin: 0 10px; }
          @media (max-width: 600px) {
            .grade-row { flex-direction: column; }
            .grade-label, .grade-value { margin: 2px 0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Nueva Calificación Registrada</h1>
            <p>MW Panel - Sistema de Gestión Educativa</p>
          </div>
          
          <div class="content">
            <div class="greeting">
              <strong>Estimada familia ${emailVariables.recipientName || 'de ' + gradeData.studentFullName},</strong>
            </div>
            
            <p>Se ha registrado una nueva calificación para <strong>${gradeData.studentFullName}</strong> en el sistema académico.</p>
            
            <div class="grade-card">
              <div class="grade-header">
                <span class="grade-icon">${gradeIcon}</span>
                <h3 class="grade-title">${gradeData.activityName}</h3>
              </div>
              
              <div class="grade-details">
                <div class="grade-row">
                  <span class="grade-label">Estudiante:</span>
                  <span class="grade-value">${gradeData.studentFullName}</span>
                </div>
                <div class="grade-row">
                  <span class="grade-label">Asignatura:</span>
                  <span class="grade-value">${gradeData.subjectName}</span>
                </div>
                <div class="grade-row">
                  <span class="grade-label">Fecha:</span>
                  <span class="grade-value">${gradeData.gradeDate}</span>
                </div>
                <div class="grade-row">
                  <span class="grade-label">Profesor/a:</span>
                  <span class="grade-value">${gradeData.teacherName}</span>
                </div>
                <div class="grade-row">
                  <span class="grade-label">Calificación:</span>
                  <span class="grade-score">${gradeData.gradeValue}/${gradeData.gradeScale}</span>
                </div>
                <div class="grade-row">
                  <span class="grade-label">Nivel de logro:</span>
                  <span class="grade-value">${gradeData.achievementLevel}</span>
                </div>
                <div class="grade-row">
                  <span class="grade-label">Período:</span>
                  <span class="grade-value">${gradeData.period}</span>
                </div>
              </div>
              
              ${gradeData.teacherComments ? `
                <div class="comments-section">
                  <div class="comments-title">Comentarios del profesor/a:</div>
                  <div>${gradeData.teacherComments}</div>
                </div>
              ` : ''}
            </div>
            
            <div class="btn-container">
              <a href="https://plataforma.mundoworld.school/family" class="btn">
                Ver Dashboard Familiar
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              <strong>Nota:</strong> Este correo ha sido generado automáticamente por el sistema cuando se registró la calificación. 
              Puede revisar todas las calificaciones y progreso académico en el panel familiar.
            </p>
          </div>
          
          <div class="footer">
            <p><strong>MW Panel 2.0</strong> - Sistema de Gestión Educativa</p>
            <div class="footer-links">
              <a href="https://plataforma.mundoworld.school">Acceder al Sistema</a> |
              <a href="https://plataforma.mundoworld.school/family">Panel Familiar</a>
            </div>
            <p style="font-size: 12px; margin-top: 15px;">
              Para cambiar sus preferencias de notificación o contactar con el centro, 
              acceda a su panel familiar en la plataforma.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Genera texto plano para notificación de calificación
   */
  private generateGradeNotificationText(emailVariables: any, gradeData: GradeNotificationData): string {
    const gradeIcon = gradeData.isPassing ? '[APROBADO]' : '[REQUIERE ATENCION]';
    
    return `
Nueva Calificación Registrada - MW Panel

Estimada familia ${emailVariables.recipientName || 'de ' + gradeData.studentFullName},

Se ha registrado una nueva calificación para ${gradeData.studentFullName} en el sistema académico.

DETALLES DE LA CALIFICACIÓN:
${gradeIcon}

Estudiante: ${gradeData.studentFullName}
Asignatura: ${gradeData.subjectName}
Actividad: ${gradeData.activityName}
Fecha: ${gradeData.gradeDate}
Profesor/a: ${gradeData.teacherName}
Calificación: ${gradeData.gradeValue}/${gradeData.gradeScale}
Nivel de logro: ${gradeData.achievementLevel}
Período: ${gradeData.period}

${gradeData.teacherComments ? `Comentarios del profesor/a:
${gradeData.teacherComments}

` : ''}
Puede revisar todas las calificaciones y el progreso académico completo accediendo al Panel Familiar:
https://plataforma.mundoworld.school/family

---
Este correo ha sido generado automáticamente por MW Panel 2.0
Sistema de Gestión Educativa - Mundo World School

Para cambiar sus preferencias de notificación o contactar con el centro, 
acceda a su panel familiar en la plataforma.
    `.trim();
  }

  /**
   * Envío directo de email usando Resend (método que funciona 100%)
   */
  private async sendEmailDirectly(
    recipientEmail: string,
    subject: string,
    htmlContent: string,
    textContent: string,
  ): Promise<void> {
    try {
      this.logger.log(`📧 [DIRECT] Sending email to: ${recipientEmail}`);

      if (!this.resend) {
        throw new Error('Resend provider not initialized');
      }

      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: recipientEmail,
        subject: subject,
        html: htmlContent,
        text: textContent,
      });

      this.logger.log(`✅ [DIRECT] Email sent successfully to: ${recipientEmail} (ID: ${result.data.id})`);

    } catch (error) {
      this.logger.error(`❌ [DIRECT] Failed to send email to: ${recipientEmail}`, error);
      throw error;
    }
  }

  /**
   * Enviar notificación de rúbrica a una familia específica
   */
  private async sendRubricNotificationToFamily(
    family: Family, 
    rubricData: RubricNotificationData, 
    automations: any[]
  ): Promise<void> {
    try {
      // Determinar destinatarios
      const recipients = [];
      
      if (family.primaryContact && family.primaryContact.isActive) {
        recipients.push({
          email: family.primaryContact.email,
          name: `${family.primaryContact.profile?.firstName} ${family.primaryContact.profile?.lastName}`,
        });
      }

      if (family.secondaryContact && family.secondaryContact.isActive) {
        recipients.push({
          email: family.secondaryContact.email,
          name: `${family.secondaryContact.profile?.firstName} ${family.secondaryContact.profile?.lastName}`,
        });
      }

      if (recipients.length === 0) {
        this.logger.warn(`⚠️ No hay contactos activos para la familia del estudiante: ${rubricData.studentFullName}`);
        return;
      }

      // Enviar email a cada destinatario
      for (const recipient of recipients) {
        // Preparar variables del email
        const emailVariables = {
          recipientName: recipient.name,
          studentFullName: rubricData.studentFullName,
          assessmentDate: this.formatDateToDDMMYYYY(rubricData.assessmentDate),
          subjectName: rubricData.subjectName,
          activityName: rubricData.activityName,
          rubricName: rubricData.rubricName,
          totalScore: rubricData.totalScore?.toString() || '0',
          maxPossibleScore: rubricData.maxPossibleScore?.toString() || '100',
          percentage: rubricData.percentage?.toFixed(1) || '0',
          teacherName: rubricData.teacherName,
          comments: rubricData.comments || '',
          isPassing: rubricData.isPassing,
          currentDate: this.formatDateToDDMMYYYY(new Date().toISOString()),
        };

        // Enviar a cada automatización configurada
        for (const automation of automations) {
          try {
            // Generar contenido HTML específico para rúbricas
            const htmlContent = this.generateRubricNotificationHTML(emailVariables, rubricData);
            const textContent = this.generateRubricNotificationText(emailVariables, rubricData);
            
            await this.sendEmailDirectly(
              recipient.email,
              `📊 Nueva evaluación de rúbrica para ${rubricData.studentFullName} en ${rubricData.subjectName}`,
              htmlContent,
              textContent
            );

            this.logger.log(`📧 Email de evaluación de rúbrica enviado a ${recipient.name} (${recipient.email})`);
          } catch (emailError) {
            this.logger.error(`❌ Error enviando email a ${recipient.email}:`, emailError);
          }
        }
      }

      // Incrementar contador de emails enviados
      for (const automation of automations) {
        await this.emailAutomationService.incrementEmailsSent(automation.id);
      }

    } catch (error) {
      this.logger.error(`❌ Error enviando notificación de rúbrica a familia:`, error);
    }
  }

  /**
   * Generar contenido HTML para notificación de evaluación de rúbrica
   */
  private generateRubricNotificationHTML(emailVariables: any, rubricData: RubricNotificationData): string {
    const passIcon = rubricData.isPassing ? '✅' : '⚠️';
    const passColor = rubricData.isPassing ? '#52c41a' : '#ff4d4f';
    
    const criteriaResultsHTML = rubricData.criteriaResults.map(result => `
      <div class="criteria-row">
        <span class="criteria-name">${result.criterionName}</span>
        <span class="criteria-level">${result.levelName}</span>
        <span class="criteria-score">${result.score} pts (peso: ${(result.weight * 100).toFixed(0)}%)</span>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
          .email-container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; }
          .email-header { background: #1890ff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .email-content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
          .rubric-card { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .rubric-header { display: flex; align-items: center; margin-bottom: 20px; }
          .rubric-icon { font-size: 32px; margin-right: 15px; }
          .rubric-title { color: #1890ff; margin: 0; font-size: 24px; }
          .rubric-details { margin: 20px 0; }
          .rubric-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
          .rubric-label { font-weight: bold; color: #555; }
          .rubric-value { color: #333; }
          .rubric-score { color: ${passColor}; font-weight: bold; font-size: 18px; }
          .criteria-section { margin-top: 20px; }
          .criteria-title { font-weight: bold; color: #1890ff; margin-bottom: 15px; font-size: 16px; }
          .criteria-row { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #fafafa; margin: 5px 0; border-radius: 4px; }
          .criteria-name { flex: 1; font-weight: bold; }
          .criteria-level { flex: 1; text-align: center; color: #722ed1; }
          .criteria-score { flex: 1; text-align: right; color: #555; }
          .comments-section { background: #e6f7ff; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .comments-title { font-weight: bold; color: #1890ff; margin-bottom: 10px; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
          .btn:hover { background: #40a9ff; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <h1>📊 Nueva Evaluación de Rúbrica</h1>
            <p>Mundo World School - Sistema de Evaluación</p>
          </div>
          
          <div class="email-content">
            <p>Estimado/a <strong>${emailVariables.recipientName}</strong>,</p>
            
            <p>Le informamos que se ha registrado una nueva evaluación de rúbrica para <strong>${rubricData.studentFullName}</strong>.</p>
            
            <div class="rubric-card">
              <div class="rubric-header">
                <span class="rubric-icon">${passIcon}</span>
                <h3 class="rubric-title">${rubricData.rubricName}</h3>
              </div>
              
              <div class="rubric-details">
                <div class="rubric-row">
                  <span class="rubric-label">Estudiante:</span>
                  <span class="rubric-value">${rubricData.studentFullName}</span>
                </div>
                <div class="rubric-row">
                  <span class="rubric-label">Asignatura:</span>
                  <span class="rubric-value">${rubricData.subjectName}</span>
                </div>
                <div class="rubric-row">
                  <span class="rubric-label">Actividad:</span>
                  <span class="rubric-value">${rubricData.activityName}</span>
                </div>
                <div class="rubric-row">
                  <span class="rubric-label">Fecha:</span>
                  <span class="rubric-value">${emailVariables.assessmentDate}</span>
                </div>
                <div class="rubric-row">
                  <span class="rubric-label">Profesor/a:</span>
                  <span class="rubric-value">${rubricData.teacherName}</span>
                </div>
                <div class="rubric-row">
                  <span class="rubric-label">Puntuación:</span>
                  <span class="rubric-score">${rubricData.totalScore}/${rubricData.maxPossibleScore} (${rubricData.percentage}%)</span>
                </div>
              </div>
              
              <div class="criteria-section">
                <div class="criteria-title">Resultados por Criterio:</div>
                ${criteriaResultsHTML}
              </div>
              
              ${rubricData.comments ? `
                <div class="comments-section">
                  <div class="comments-title">Comentarios del profesor/a:</div>
                  <div>${rubricData.comments}</div>
                </div>
              ` : ''}
            </div>
            
            <div class="btn-container">
              <a href="https://plataforma.mundoworld.school/family" class="btn">
                Ver Dashboard Familiar
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Este email fue enviado automáticamente desde el sistema de gestión escolar de Mundo World School.
              Para más información, acceda al portal familiar.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generar contenido de texto para notificación de evaluación de rúbrica
   */
  private generateRubricNotificationText(emailVariables: any, rubricData: RubricNotificationData): string {
    const criteriaText = rubricData.criteriaResults.map(result => 
      `- ${result.criterionName}: ${result.levelName} (${result.score} pts, peso: ${(result.weight * 100).toFixed(0)}%)`
    ).join('\n');

    return `
Nueva Evaluación de Rúbrica - Mundo World School

Estimado/a ${emailVariables.recipientName},

Se ha registrado una nueva evaluación de rúbrica para ${rubricData.studentFullName}.

Detalles de la Evaluación:
- Estudiante: ${rubricData.studentFullName}
- Asignatura: ${rubricData.subjectName}
- Actividad: ${rubricData.activityName}
- Rúbrica: ${rubricData.rubricName}
- Fecha: ${emailVariables.assessmentDate}
- Profesor/a: ${rubricData.teacherName}
- Puntuación: ${rubricData.totalScore}/${rubricData.maxPossibleScore} (${rubricData.percentage}%)

Resultados por Criterio:
${criteriaText}

${rubricData.comments ? `Comentarios del profesor/a: ${rubricData.comments}` : ''}

Para ver más detalles, acceda al portal familiar en: https://plataforma.mundoworld.school/family

Este email fue enviado automáticamente desde Mundo World School.
    `;
  }

  /**
   * Formatear fecha a formato DD-MM-YYYY
   */
  private formatDateToDDMMYYYY(dateString: string): string {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (error) {
      this.logger.warn(`Error formateando fecha ${dateString}:`, error);
      return dateString; // Fallback al string original
    }
  }
}