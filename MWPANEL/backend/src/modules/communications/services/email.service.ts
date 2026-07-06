/**
 * @archivo: email.service.ts
 * @módulo: Communications - Email Notifications System
 * @función: Servicio principal para envío de correos con múltiples proveedores
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 * @dependencias: Nodemailer, Resend, Handlebars, MJML
 * @propósito: Gestión centralizada de envío de correos con plantillas HTML
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
import * as handlebars from 'handlebars';
import mjml from 'mjml';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EmailNotification, EmailStatus, EmailPriority } from '../entities/email-notification.entity';
import { EmailTemplate, EmailTemplateType } from '../entities/email-template.entity';
import { EmailAutomation } from '../entities/email-automation.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationService } from './notification.service';

interface EmailSendOptions {
  to: string;
  subject: string;
  templateType?: EmailTemplateType;
  templateData?: Record<string, any>;
  htmlContent?: string;
  textContent?: string;
  priority?: EmailPriority;
  userId?: string;
  triggeredBy?: string;
  triggerEvent?: string;
  triggerResourceId?: string;
  triggerResourceType?: string;
  isTest?: boolean;
}

interface EmailProviderConfig {
  type: 'smtp' | 'resend' | 'sendgrid';
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  resend?: {
    apiKey: string;
  };
  sendgrid?: {
    apiKey: string;
  };
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private resend: Resend;
  private readonly fromEmail = 'no-reply@mundoworld.school';
  private readonly fromName = 'Mundo World School';
  private readonly platformUrl: string;

  constructor(
    @InjectRepository(EmailNotification)
    private emailNotificationRepository: Repository<EmailNotification>,
    @InjectRepository(EmailTemplate)
    private emailTemplateRepository: Repository<EmailTemplate>,
    @InjectRepository(EmailAutomation)
    private emailAutomationRepository: Repository<EmailAutomation>,
    private configService: ConfigService,
  ) {
    this.platformUrl = this.configService.get<string>('PLATFORM_URL', 'https://plataforma.mundoworld.school');
    this.initializeEmailProviders();
  }

  /**
   * Inicializa los proveedores de correo según la configuración
   */
  private async initializeEmailProviders(): Promise<void> {
    try {
      const emailConfig = this.getEmailConfig();

      switch (emailConfig.type) {
        case 'resend':
          if (emailConfig.resend?.apiKey) {
            this.resend = new Resend(emailConfig.resend.apiKey);
            this.logger.log('✅ Resend provider initialized');
          }
          break;

        case 'smtp':
          if (emailConfig.smtp) {
            this.transporter = nodemailer.createTransport({
              host: emailConfig.smtp.host,
              port: emailConfig.smtp.port,
              secure: emailConfig.smtp.secure,
              auth: emailConfig.smtp.auth,
            });
            
            // Verificar conexión SMTP
            await this.transporter.verify();
            this.logger.log('✅ SMTP provider initialized and verified');
          }
          break;

        case 'sendgrid':
          // Implementar SendGrid si es necesario
          this.logger.warn('SendGrid provider not implemented yet');
          break;

        default:
          this.logger.warn('No email provider configured - emails will be logged only');
      }
    } catch (error) {
      this.logger.error('❌ Failed to initialize email providers:', error);
    }
  }

  /**
   * Obtiene la configuración del proveedor de correo desde variables de entorno
   */
  private getEmailConfig(): EmailProviderConfig {
    const type = this.configService.get<string>('EMAIL_PROVIDER', 'smtp') as 'smtp' | 'resend' | 'sendgrid';

    switch (type) {
      case 'resend':
        return {
          type: 'resend',
          resend: {
            apiKey: this.configService.get<string>('RESEND_API_KEY', ''),
          },
        };

      case 'smtp':
      default:
        return {
          type: 'smtp',
          smtp: {
            host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
            port: this.configService.get<number>('SMTP_PORT', 587),
            secure: this.configService.get<boolean>('SMTP_SECURE', false),
            auth: {
              user: this.configService.get<string>('SMTP_USER', ''),
              pass: this.configService.get<string>('SMTP_PASS', ''),
            },
          },
        };
    }
  }

  /**
   * Envía un correo electrónico
   */
  async sendEmail(options: EmailSendOptions): Promise<EmailNotification> {
    this.logger.log(`📧 Preparing email for: ${options.to}`);

    let htmlContent = options.htmlContent;
    let textContent = options.textContent;
    let templateId: string | null = null;

    // Si se especifica un tipo de plantilla, cargarla y procesarla
    if (options.templateType) {
      const template = await this.getTemplate(options.templateType);
      if (template) {
        templateId = template.id;
        const processedTemplate = await this.processTemplate(template, options.templateData || {});
        htmlContent = processedTemplate.html;
        textContent = processedTemplate.text;
      }
    }

    // Buscar recipientId si no se proporcionó pero tenemos email
    let recipientId = options.userId;
    this.logger.log(`🔍 recipientId: ${recipientId}, email: ${options.to}`);
    if (!recipientId && options.to) {
      this.logger.log(`🔎 Buscando usuario para email: ${options.to}`);
      try {
        const user = await this.emailNotificationRepository.manager
          .createQueryBuilder()
          .select('u.id')
          .from('users', 'u')
          .where('u.email = :email', { email: options.to })
          .getRawOne();
        
        if (user) {
          recipientId = user.id;
        } else {
          // Si no encontramos usuario, crear uno temporal con email nulo para evitar constraint
          this.logger.warn(`Usuario no encontrado para email ${options.to}, enviando sin logging en DB`);
          // Enviar directamente sin guardar en DB
          await this.sendEmailDirectly(options.to, options.subject, htmlContent || '', textContent || '');
          return null;
        }
      } catch (error) {
        this.logger.warn(`Error buscando usuario para email ${options.to}:`, error);
        // Enviar directamente sin guardar en DB
        await this.sendEmailDirectly(options.to, options.subject, htmlContent || '', textContent || '');
        return null;
      }
    }

    // Crear registro de notificación
    const emailNotification = this.emailNotificationRepository.create({
      recipientId: recipientId,
      recipientEmail: options.to,
      templateId,
      subject: options.subject,
      htmlContent: htmlContent || '',
      textContent: textContent || '',
      templateData: options.templateData ? JSON.stringify(options.templateData) : null,
      status: EmailStatus.PENDING,
      priority: options.priority || EmailPriority.NORMAL,
      triggerEvent: options.triggerEvent,
      triggerResourceId: options.triggerResourceId,
      triggerResourceType: options.triggerResourceType,
      triggeredById: this.isValidUuid(options.triggeredBy) ? options.triggeredBy : undefined,
      isTest: options.isTest || false,
    });

    const savedNotification = await this.emailNotificationRepository.save(emailNotification);

    // Enviar el correo de forma asíncrona (con logging mejorado para debug)
    this.logger.log(`🚀 About to call sendEmailAsync for: ${savedNotification.recipientEmail}`);
    this.sendEmailAsync(savedNotification, htmlContent || '', textContent || '')
      .catch(error => {
        this.logger.error(`❌ Unhandled error in sendEmailAsync for ${savedNotification.recipientEmail}:`, error);
      });

    return savedNotification;
  }

  /**
   * Procesa una plantilla con datos dinámicos
   */
  private async processTemplate(
    template: EmailTemplate,
    data: Record<string, any>,
  ): Promise<{ html: string; text: string }> {
    // Datos por defecto disponibles en todas las plantillas
    const defaultData = {
      platformUrl: this.platformUrl,
      currentYear: new Date().getFullYear(),
      schoolName: 'Mundo World School',
      logoUrl: `${this.platformUrl}/assets/logo-MWSchool.png`,
      unsubscribeUrl: `${this.platformUrl}/unsubscribe`,
      supportEmail: 'soporte@mundoworld.school',
      ...data,
    };

    // Procesar contenido HTML
    let htmlContent = template.htmlContent;
    
    // Limpiar caracteres escapados en el contenido HTML
    htmlContent = this.cleanHtmlContent(htmlContent);
    
    // Si es una plantilla MJML, convertir a HTML
    if (htmlContent.includes('<mjml>')) {
      const mjmlResult = await mjml(htmlContent);
      if (mjmlResult.errors.length === 0) {
        htmlContent = mjmlResult.html;
      } else {
        this.logger.warn('MJML compilation errors:', mjmlResult.errors);
      }
    }

    const htmlTemplate = handlebars.compile(htmlContent);
    const processedHtml = htmlTemplate(defaultData);

    // Procesar contenido de texto
    const textTemplate = handlebars.compile(template.textContent);
    const processedText = textTemplate(defaultData);

    return {
      html: processedHtml,
      text: processedText,
    };
  }

  /**
   * Limpia el contenido HTML de caracteres escapados problemáticos
   */
  private cleanHtmlContent(html: string): string {
    // Limpiar DOCTYPE y otros caracteres escapados comunes
    let cleaned = html
      // Primero limpiar entidades HTML
      .replace(/&lt;!/g, '<!')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&')
      // Específicamente para el DOCTYPE escapado con backslash (múltiples variantes)
      .replace(/<\\!DOCTYPE/gi, '<!DOCTYPE')
      .replace(/<!\\DOCTYPE/gi, '<!DOCTYPE')
      .replace(/<\\\\!DOCTYPE/gi, '<!DOCTYPE')
      .replace(/<!\\\\DOCTYPE/gi, '<!DOCTYPE')
      .replace(/\\!/g, '!')
      // Limpiar backslashes dobles
      .replace(/\\\\/g, '\\')
      // Casos específicos que pueden aparecer
      .replace(/(&lt;|<)\\(!DOCTYPE)/gi, '<!DOCTYPE')
      .replace(/(&lt;|<)\\\\(!DOCTYPE)/gi, '<!DOCTYPE');

    // Log para debugging si contiene problemas
    if (cleaned.includes('\\!DOCTYPE') || cleaned.includes('&lt;!DOCTYPE')) {
      console.warn('❌ DOCTYPE cleanup may not be complete:', {
        original: html.substring(0, 100),
        cleaned: cleaned.substring(0, 100)
      });
    }

    return cleaned;
  }

  /**
   * true si ya existe una notificación para ese recurso/evento desde `since`.
   * Sirve para deduplicar recordatorios automáticos sin columnas nuevas.
   */
  async hasSentForResource(triggerEvent: string, triggerResourceId: string, since: Date): Promise<boolean> {
    const count = await this.emailNotificationRepository.count({
      where: {
        triggerEvent,
        triggerResourceId,
        createdAt: MoreThanOrEqual(since),
      },
    });
    return count > 0;
  }

  /**
   * Envío directo sin guardar en base de datos
   */
  private async sendEmailDirectly(
    recipientEmail: string,
    subject: string,
    htmlContent: string,
    textContent: string,
  ): Promise<void> {
    try {
      this.logger.log(`📧 Sending email directly to: ${recipientEmail}`);

      const emailConfig = this.getEmailConfig();
      let result: any;

      switch (emailConfig.type) {
        case 'resend':
          if (!this.resend) {
            throw new Error('Resend provider not initialized');
          }
          result = await this.resend.emails.send({
            from: `${this.fromName} <${this.fromEmail}>`,
            to: recipientEmail,
            subject: subject,
            html: htmlContent,
            text: textContent,
          });
          break;

        case 'smtp':
          if (!this.transporter) {
            throw new Error('SMTP provider not initialized');
          }
          result = await this.transporter.sendMail({
            from: `${this.fromName} <${this.fromEmail}>`,
            to: recipientEmail,
            subject: subject,
            html: htmlContent,
            text: textContent,
          });
          break;

        default:
          // Modo desarrollo - solo log
          this.logger.log(`📧 [DEV MODE] Email would be sent to: ${recipientEmail}`);
          this.logger.log(`Subject: ${subject}`);
          result = { messageId: 'dev-mode-' + Date.now() };
      }

      this.logger.log(`✅ Email sent directly to: ${recipientEmail} (${result.messageId || result.id})`);

    } catch (error) {
      this.logger.error(`❌ Failed to send direct email to: ${recipientEmail}`, error);
      throw error;
    }
  }

  /**
   * Envío asíncrono del correo
   */
  private async sendEmailAsync(
    notification: EmailNotification,
    htmlContent: string,
    textContent: string,
  ): Promise<void> {
    this.logger.log(`🔄 Starting sendEmailAsync for: ${notification.recipientEmail}`);
    try {
      // Actualizar estado a "enviando"
      notification.status = EmailStatus.SENDING;
      await this.emailNotificationRepository.save(notification);
      this.logger.log(`📝 Email status updated to SENDING for: ${notification.recipientEmail}`);

      const emailConfig = this.getEmailConfig();
      this.logger.log(`⚙️ Email config type: ${emailConfig.type}`);
      let result: any;

      switch (emailConfig.type) {
        case 'resend':
          result = await this.sendWithResend(notification, htmlContent, textContent);
          break;

        case 'smtp':
          result = await this.sendWithSMTP(notification, htmlContent, textContent);
          break;

        default:
          // Modo desarrollo - solo log
          this.logger.log(`📧 [DEV MODE] Email would be sent to: ${notification.recipientEmail}`);
          this.logger.log(`Subject: ${notification.subject}`);
          result = { messageId: 'dev-mode-' + Date.now() };
      }

      // Actualizar estado exitoso
      notification.status = EmailStatus.SENT;
      notification.sentAt = new Date();
      notification.providerMessageId = result.messageId || result.id || result.data?.id;
      notification.providerResponse = JSON.stringify(result);

      this.logger.log(`✅ Email sent successfully to: ${notification.recipientEmail}`);

    } catch (error) {
      // Actualizar estado de error
      notification.status = EmailStatus.FAILED;
      notification.failedAt = new Date();
      notification.errorMessage = error.message;
      notification.retryCount += 1;

      // Programar reintento si no se han excedido los máximos
      if (notification.retryCount < 3) {
        const retryDelay = Math.pow(2, notification.retryCount) * 60 * 1000; // Backoff exponencial
        notification.nextRetryAt = new Date(Date.now() + retryDelay);
      }

      this.logger.error(`❌ Failed to send email to: ${notification.recipientEmail}`, error);
    } finally {
      await this.emailNotificationRepository.save(notification);
    }
  }

  /**
   * Envío mediante Resend
   */
  private async sendWithResend(
    notification: EmailNotification,
    htmlContent: string,
    textContent: string,
  ): Promise<any> {
    if (!this.resend) {
      throw new Error('Resend provider not initialized');
    }

    return await this.resend.emails.send({
      from: `${this.fromName} <${this.fromEmail}>`,
      to: notification.recipientEmail,
      subject: notification.subject,
      html: htmlContent,
      text: textContent,
    });
  }

  /**
   * Envío mediante SMTP
   */
  private async sendWithSMTP(
    notification: EmailNotification,
    htmlContent: string,
    textContent: string,
  ): Promise<any> {
    if (!this.transporter) {
      throw new Error('SMTP provider not initialized');
    }

    return await this.transporter.sendMail({
      from: `${this.fromName} <${this.fromEmail}>`,
      to: notification.recipientEmail,
      subject: notification.subject,
      html: htmlContent,
      text: textContent,
    });
  }

  /**
   * Obtiene una plantilla por tipo
   */
  private async getTemplate(type: EmailTemplateType): Promise<EmailTemplate | null> {
    return await this.emailTemplateRepository.findOne({
      where: { type, isActive: true },
    });
  }

  /**
   * Obtiene el historial de correos de un usuario
   */
  async getUserEmailHistory(userId: string, limit = 20): Promise<EmailNotification[]> {
    return await this.emailNotificationRepository.find({
      where: { recipientId: userId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['template'],
    });
  }

  /**
   * Reintenta envíos fallidos
   */
  async retryFailedEmails(): Promise<void> {
    const failedEmails = await this.emailNotificationRepository
      .createQueryBuilder('email')
      .where('email.status = :status', { status: EmailStatus.FAILED })
      .andWhere('email.retryCount < :maxRetries', { maxRetries: 3 })
      .andWhere('email.nextRetryAt <= :now', { now: new Date() })
      .getMany();

    for (const email of failedEmails) {
      this.logger.log(`🔄 Retrying email to: ${email.recipientEmail}`);
      await this.sendEmailAsync(email, email.htmlContent, email.textContent || '');
    }
  }

  /**
   * Procesa emails pendientes que no se han enviado
   */
  async processPendingEmails(): Promise<void> {
    try {
      this.logger.log('📧 Processing pending email notifications...');

      // Buscar emails pendientes
      const pendingEmails = await this.emailNotificationRepository.find({
        where: { status: EmailStatus.PENDING },
        order: { createdAt: 'ASC' },
        take: 50, // Procesar máximo 50 emails por lote
      });

      this.logger.log(`📧 Found ${pendingEmails.length} pending emails to process`);

      for (const email of pendingEmails) {
        try {
          await this.sendEmailAsync(email, email.htmlContent, email.textContent || '');
          this.logger.log(`✅ Processed pending email: ${email.recipientEmail}`);
        } catch (error) {
          this.logger.error(`❌ Failed to process pending email ${email.id}:`, error);
        }
      }

      this.logger.log('📧 Finished processing pending emails');
    } catch (error) {
      this.logger.error('❌ Error processing pending emails:', error);
    }
  }

  /**
   * Procesa automatizaciones de cumpleaños
   */
  async processBirthdayAutomations(): Promise<void> {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().substring(0, 5); // HH:mm format
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      this.logger.log(`🎂 Checking birthday automations at ${currentTime} for date ${today}`);

      // Buscar automatizaciones de cumpleaños activas para esta hora
      const automations = await this.emailNotificationRepository.manager
        .createQueryBuilder()
        .select('ea.*')
        .from('email_automations', 'ea')
        .where('ea.eventType = :eventType', { eventType: 'user_birthday' })
        .andWhere('ea.isActive = :isActive', { isActive: true })
        .andWhere('ea.reminderTime = :reminderTime', { reminderTime: currentTime })
        .getRawMany();

      if (automations.length === 0) {
        this.logger.debug(`No birthday automations found for time ${currentTime}`);
        return;
      }

      this.logger.log(`📧 Found ${automations.length} birthday automation(s) for ${currentTime}`);

      // Buscar usuarios que cumplen años hoy
      const birthdayUsers = await this.emailNotificationRepository.manager
        .createQueryBuilder()
        .select('u.id, u.email, up.firstName, up.lastName, up.dateOfBirth')
        .from('users', 'u')
        .innerJoin('user_profiles', 'up', 'u.id = up.userId')
        .where('u.isActive = :isActive', { isActive: true })
        .andWhere('up.dateOfBirth IS NOT NULL')
        .andWhere("TO_CHAR(up.dateOfBirth, 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD')")
        .getRawMany();

      this.logger.log(`🎂 Found ${birthdayUsers.length} users with birthday today`);

      // Procesar cada automatización
      for (const automation of automations) {
        const template = await this.emailTemplateRepository.findOne({
          where: { id: automation.templateId }
        });

        if (!template) {
          this.logger.warn(`Template not found for automation ${automation.name}`);
          continue;
        }

        // Enviar email a cada usuario que cumple años
        for (const user of birthdayUsers) {
          try {
            // Verificar si ya se envió un email hoy para evitar duplicados
            const existingEmail = await this.emailNotificationRepository.findOne({
              where: {
                recipientEmail: user.email,
                triggerEvent: 'user_birthday',
                createdAt: new Date(today) // Solo verificar hoy
              }
            });

            if (existingEmail && automation.sendOnlyOnce) {
              this.logger.debug(`Birthday email already sent to ${user.email} today`);
              continue;
            }

            // Calcular edad
            const birthDate = new Date(user.dateOfBirth);
            const age = now.getFullYear() - birthDate.getFullYear();
            
            // Preparar datos para la plantilla
            const templateData = {
              userName: user.firstName || 'Usuario',
              fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
              age: age,
              year: now.getFullYear(),
              schoolName: 'Mundo World School'
            };

            // Enviar email
            await this.sendEmail({
              to: user.email,
              subject: template.subject.replace('{{userName}}', templateData.fullName),
              templateType: template.type as EmailTemplateType,
              templateData,
              userId: user.id,
              triggerEvent: 'user_birthday',
              triggerResourceId: automation.id,
              triggerResourceType: 'email_automation'
            });

            this.logger.log(`🎉 Sent birthday email to ${user.email} (${templateData.fullName})`);

            // Actualizar contador de emails enviados
            await this.emailNotificationRepository.manager
              .createQueryBuilder()
              .update('email_automations')
              .set({ totalEmailsSent: () => 'totalEmailsSent + 1' })
              .where('id = :id', { id: automation.id })
              .execute();

          } catch (error) {
            this.logger.error(`Failed to send birthday email to ${user.email}:`, error);
          }
        }
      }

    } catch (error) {
      this.logger.error('Error processing birthday automations:', error);
    }
  }

  private isValidUuid(value: string | undefined): boolean {
    if (!value) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }
}