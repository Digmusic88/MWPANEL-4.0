/**
 * @archivo: teacher-todo-notifications.service.ts
 * @módulo: Teachers (Servicio de Notificaciones TODO)
 * @función: Sistema de notificaciones y alertas para tareas pendientes
 * @características:
 *   - Cron jobs para verificar fechas límite
 *   - Notificaciones por email
 *   - Alertas en tiempo real
 *   - Resumen diario automático
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherTodoService } from './teacher-todo.service';
import { EmailService } from '../../communications/services/email.service';
import { Teacher } from '../entities/teacher.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class TeacherTodoNotificationsService {
  private readonly logger = new Logger(TeacherTodoNotificationsService.name);

  constructor(
    private readonly teacherTodoService: TeacherTodoService,
    private readonly emailService: EmailService,
    @InjectRepository(Teacher)
    private teachersRepository: Repository<Teacher>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Cron job que se ejecuta cada hora para verificar fechas límite
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueTasks(): Promise<void> {
    this.logger.log('Running hourly overdue tasks check');
    
    try {
      const result = await this.teacherTodoService.updateOverdueTasks();
      this.logger.log(`Updated ${result.updated} overdue tasks`);
    } catch (error) {
      this.logger.error('Error in hourly overdue check:', error);
    }
  }

  /**
   * Cron job que se ejecuta todos los días a las 17:00 para enviar resumen diario
   */
  @Cron('0 17 * * *', {
    timeZone: 'Europe/Madrid', // Hora española
  })
  async sendDailySummaryEmails(): Promise<void> {
    this.logger.log('Sending daily summary emails to teachers at 17:00');
    
    try {
      // Obtener todos los profesores activos
      const teachers = await this.teachersRepository.find({
        relations: ['user', 'user.profile'],
        where: {
          user: {
            isActive: true,
          },
        },
      });

      let emailsSent = 0;

      for (const teacher of teachers) {
        try {
          await this.sendDailySummaryToTeacher(teacher);
          emailsSent++;
        } catch (error) {
          this.logger.error(`Error sending daily summary to teacher ${teacher.id}:`, error);
        }
      }

      this.logger.log(`Daily summary emails sent: ${emailsSent}/${teachers.length}`);
    } catch (error) {
      this.logger.error('Error in daily summary email job:', error);
    }
  }

  /**
   * Envía resumen diario a un profesor específico
   */
  private async sendDailySummaryToTeacher(teacher: Teacher): Promise<void> {
    // Obtener estadísticas del profesor
    const stats = await this.teacherTodoService.getQuickStats(teacher.id);
    
    // Solo enviar email si hay tareas pendientes
    if (stats.totalPending === 0) {
      this.logger.debug(`No pending tasks for teacher ${teacher.id}, skipping email`);
      return;
    }

    // Obtener detalles completos para el email
    const todoData = await this.teacherTodoService.getTeacherTodo(teacher.id);
    
    // Preparar datos para el template
    const emailData = {
      teacherName: `${teacher.user.profile.firstName} ${teacher.user.profile.lastName}`,
      totalPending: stats.totalPending,
      urgentCount: stats.urgentCount,
      overdueCount: stats.overdueCount,
      urgentTasks: todoData.items.filter(item => item.priority === 'urgent').slice(0, 5),
      upcomingTasks: todoData.items.filter(item => 
        item.priority === 'high' && item.hoursUntilDue <= 48
      ).slice(0, 5),
      dashboardUrl: `${process.env.FRONTEND_URL}/teacher/todo`,
    };

    // Template del email
    const subject = stats.urgentCount > 0 
      ? `⚠️ ${stats.urgentCount} tareas urgentes pendientes`
      : `📋 Resumen diario: ${stats.totalPending} tareas pendientes`;

    const htmlContent = this.generateDailySummaryHTML(emailData);

    // Enviar email
    await this.emailService.sendEmail({
      to: teacher.user.email,
      subject,
      htmlContent: htmlContent,
      templateData: emailData,
    });

    this.logger.log(`Daily summary email sent to teacher ${teacher.id} (${teacher.user.email})`);
  }

  /**
   * Genera el HTML para el email de resumen diario
   */
  private generateDailySummaryHTML(data: any): string {
    const urgentSection = data.urgentCount > 0 ? `
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0;">
        <h3 style="color: #dc2626; margin: 0 0 12px 0;">⚠️ Tareas Urgentes (${data.urgentCount})</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${data.urgentTasks.map(task => `
            <li style="margin-bottom: 8px;">
              <strong>${task.title}</strong> - ${task.courseName}
              <br><small style="color: #666;">
                ${task.isOverdue ? '🔴 Vencida' : '🟡 Vence en ' + Math.abs(task.hoursUntilDue) + 'h'} | 
                ${task.pendingSubmissions + task.toGradeSubmissions} pendientes
              </small>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : '';

    const upcomingSection = data.upcomingTasks.length > 0 ? `
      <div style="background-color: #fefbf3; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0;">
        <h3 style="color: #d97706; margin: 0 0 12px 0;">📅 Próximas a Vencer (48h)</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${data.upcomingTasks.map(task => `
            <li style="margin-bottom: 8px;">
              <strong>${task.title}</strong> - ${task.courseName}
              <br><small style="color: #666;">
                Vence en ${task.hoursUntilDue}h | 
                ${task.pendingSubmissions + task.toGradeSubmissions} pendientes
              </small>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Resumen Diario - MW Panel</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin-bottom: 10px;">📋 Resumen Diario de Tareas</h1>
          <p style="color: #6b7280; margin: 0;">Hola ${data.teacherName}, aquí tienes tu resumen del día</p>
        </div>

        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 15px 0; color: #374151;">📊 Resumen General</h2>
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
            <div style="text-align: center; margin: 10px;">
              <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${data.totalPending}</div>
              <div style="font-size: 14px; color: #6b7280;">Total Pendientes</div>
            </div>
            <div style="text-align: center; margin: 10px;">
              <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${data.urgentCount}</div>
              <div style="font-size: 14px; color: #6b7280;">Urgentes</div>
            </div>
            <div style="text-align: center; margin: 10px;">
              <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${data.overdueCount}</div>
              <div style="font-size: 14px; color: #6b7280;">Vencidas</div>
            </div>
          </div>
        </div>

        ${urgentSection}
        ${upcomingSection}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.dashboardUrl}" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            📋 Ver Dashboard Completo
          </a>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            Este email se envía automáticamente todos los días a las 17:00.<br>
            MW Panel - Sistema de Gestión Educativa
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Envía notificación inmediata cuando se detectan tareas críticas
   */
  async sendUrgentTaskAlert(teacherId: string, urgentTasks: any[]): Promise<void> {
    this.logger.log(`Sending urgent task alert to teacher ${teacherId}`);
    
    try {
      const teacher = await this.teachersRepository.findOne({
        where: { id: teacherId },
        relations: ['user', 'user.profile'],
      });

      if (!teacher) {
        this.logger.error(`Teacher ${teacherId} not found for urgent alert`);
        return;
      }

      const subject = `🚨 Atención: ${urgentTasks.length} tareas requieren atención inmediata`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px;">
            <h2 style="color: #dc2626; margin: 0 0 15px 0;">🚨 Tareas Urgentes Detectadas</h2>
            <p>Hola ${teacher.user.profile.firstName}, se han detectado tareas que requieren tu atención inmediata:</p>
            
            <ul style="background-color: white; padding: 15px; border-radius: 4px;">
              ${urgentTasks.map(task => `
                <li style="margin-bottom: 10px;">
                  <strong>${task.title}</strong> - ${task.courseName}
                  <br><small style="color: #666;">
                    ${task.isOverdue ? 'Vencida hace ' + Math.abs(task.hoursUntilDue) + 'h' : 'Vence en ' + task.hoursUntilDue + 'h'}
                  </small>
                </li>
              `).join('')}
            </ul>
            
            <div style="text-align: center; margin-top: 20px;">
              <a href="${process.env.FRONTEND_URL}/teacher/todo?urgentOnly=true" 
                 style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Ver Tareas Urgentes
              </a>
            </div>
          </div>
        </div>
      `;

      await this.emailService.sendEmail({
        to: teacher.user.email,
        subject,
        htmlContent: htmlContent,
        templateData: { htmlContent },
      });

      this.logger.log(`Urgent alert sent to teacher ${teacherId}`);
    } catch (error) {
      this.logger.error(`Error sending urgent alert to teacher ${teacherId}:`, error);
    }
  }

  /**
   * Verifica si hay nuevas tareas urgentes y envía alertas
   * Se puede llamar desde WebSockets cuando cambia el estado de las tareas
   */
  async checkAndSendUrgentAlerts(): Promise<void> {
    this.logger.log('Checking for urgent tasks to alert');
    
    try {
      const teachers = await this.teachersRepository.find({
        relations: ['user'],
        where: {
          user: {
            isActive: true,
          },
        },
      });

      for (const teacher of teachers) {
        const todoData = await this.teacherTodoService.getTeacherTodo(teacher.id, {
          showUrgentOnly: true,
        });

        if (todoData.urgentCount > 0) {
          await this.sendUrgentTaskAlert(teacher.id, todoData.items);
        }
      }
    } catch (error) {
      this.logger.error('Error checking urgent alerts:', error);
    }
  }
}