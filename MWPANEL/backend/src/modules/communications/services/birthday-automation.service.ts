/**
 * @archivo: birthday-automation.service.ts
 * @módulo: Communications - Birthday Automation System
 * @función: Servicio para automatización de emails de cumpleaños
 * @creado_por: Sistema de Cumpleaños MW Panel 2.0
 * @fecha: 2025-07-14
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailService } from './email.service';

@Injectable()
export class BirthdayAutomationService implements OnModuleInit {
  private readonly logger = new Logger(BirthdayAutomationService.name);

  constructor(private emailService: EmailService) {
    this.logger.log('🎂 BirthdayAutomationService constructor called - Service instantiated!');
    console.log('🎂 BIRTHDAY AUTOMATION SERVICE CONSTRUCTOR - CONSOLE LOG');
  }

  onModuleInit() {
    this.logger.log('🎂 BirthdayAutomationService OnModuleInit - Service is ready!');
    this.logger.log('🎂 Cron job @EVERY_MINUTE registered for birthday checks');
  }

  /**
   * Cron job que se ejecuta cada minuto para verificar automatizaciones de cumpleaños
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkBirthdayAutomations(): Promise<void> {
    try {
      this.logger.log('🕐 [BirthdayAutomationService] Checking birthday automations...');
      this.logger.log('🕐 [BirthdayAutomationService] Current time: ' + new Date().toISOString());
      await this.emailService.processBirthdayAutomations();
      await this.processBirthdayReminders();
      this.logger.log('🕐 [BirthdayAutomationService] Birthday automation check completed');
    } catch (error) {
      this.logger.error('[BirthdayAutomationService] Error in birthday automation cron job:', error);
    }
  }

  /**
   * Procesa recordatorios de cumpleaños para todos los usuarios
   * Se ejecuta una vez al día para notificar a todos sobre cumpleaños del día
   */
  private async processBirthdayReminders(): Promise<void> {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Solo procesar recordatorios a las 09:00 AM para evitar spam
      if (currentHour !== 9 || currentMinute !== 0) {
        return;
      }

      this.logger.log('🎂 Processing birthday reminders for all users...');

      // Buscar usuarios que cumplen años hoy
      const birthdayUsers = await this.getUsersWithBirthdayToday();
      
      if (birthdayUsers.length === 0) {
        this.logger.log('ℹ️ No users have birthdays today');
        return;
      }

      this.logger.log(`🎉 Found ${birthdayUsers.length} user(s) with birthday today`);

      // Note: Simplified for now - just log the birthday users
      // The NotificationService integration can be added later if needed
      for (const birthdayUser of birthdayUsers) {
        this.logger.log(`🎂 Birthday today: ${birthdayUser.firstName} ${birthdayUser.lastName} (${birthdayUser.email})`);
      }

    } catch (error) {
      this.logger.error('Error processing birthday reminders:', error);
    }
  }

  /**
   * Obtiene usuarios que cumplen años hoy
   */
  private async getUsersWithBirthdayToday(): Promise<any[]> {
    // Use the same query logic as the email service
    const query = `
      SELECT u.id, u.email, up.firstName, up.lastName, up.dateOfBirth
      FROM users u
      INNER JOIN user_profiles up ON u.id = up.userId
      WHERE u.isActive = true
        AND up.dateOfBirth IS NOT NULL
        AND TO_CHAR(up.dateOfBirth, 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD')
    `;

    const result = await this.emailService['emailNotificationRepository'].manager.query(query);
    return result;
  }

  /**
   * Calcula la edad basada en la fecha de nacimiento
   */
  private calculateAge(dateOfBirth: Date): number {
    const now = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = now.getFullYear() - birthDate.getFullYear();
    
    const monthDiff = now.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}