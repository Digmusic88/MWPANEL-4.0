/**
 * @archivo: overdue-tasks.service.ts
 * @módulo: Communications - Overdue Tasks Detection
 * @función: Servicio para detectar tareas vencidas y enviar notificaciones a familias
 * @creado_por: Sistema de Automatización de Emails MW Panel 2.0
 * @fecha: 2025-07-18
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { Task, TaskStatus } from '../../tasks/entities/task.entity';
import { Student } from '../../students/entities/student.entity';
import { Family, FamilyStudent } from '../../users/entities/family.entity';
import { EmailAutomationService } from './email-automation.service';
import { EmailService } from './email.service';
import { EmailEventType } from '../entities/email-automation.entity';

@Injectable()
export class OverdueTasksService {
  private readonly logger = new Logger(OverdueTasksService.name);

  // Integración directa con Resend (método que funciona 100%)
  private resend: Resend;
  private readonly fromEmail = 'no-reply@mundoworld.school';
  private readonly fromName = 'Mundo World School';

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Family)
    private familyRepository: Repository<Family>,
    @InjectRepository(FamilyStudent)
    private familyStudentRepository: Repository<FamilyStudent>,
    private emailAutomationService: EmailAutomationService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    // Inicializar Resend directamente (mismo patrón que GradeNotificationsService)
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
      this.logger.log('✅ Resend initialized for OverdueTasksService');
    } else {
      this.logger.warn('⚠️ RESEND_API_KEY not found for OverdueTasksService');
    }
  }

  /**
   * Cron job que se ejecuta cada día a las 8:00 AM para detectar tareas vencidas
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async detectOverdueTasks(): Promise<void> {
    this.logger.log('🔍 Iniciando detección de tareas vencidas...');
    
    try {
      // Obtener todas las automatizaciones activas para tareas vencidas
      const overdueAutomations = await this.emailAutomationService.getAutomationsByEvent(
        EmailEventType.TASK_OVERDUE
      );

      if (overdueAutomations.length === 0) {
        this.logger.log('ℹ️ No hay automatizaciones activas para tareas vencidas');
        return;
      }

      // Obtener la fecha y hora actual
      const now = new Date();

      // Buscar tareas vencidas usando QueryBuilder directamente
      this.logger.log(`🕐 Hora actual para comparación: ${now.toISOString()}`);
      
      const overdueTasks = await this.taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.teacher', 'teacher')
        .leftJoinAndSelect('teacher.user', 'teacher_user')
        .leftJoinAndSelect('teacher_user.profile', 'teacher_profile')
        .leftJoinAndSelect('task.subjectAssignment', 'subjectAssignment')
        .leftJoinAndSelect('subjectAssignment.subject', 'subject')
        .leftJoinAndSelect('task.submissions', 'submissions')
        .where('task.dueDate < :now', { now })
        .andWhere('task.status = :status', { status: TaskStatus.PUBLISHED })
        .andWhere('task.taskType != :examType', { examType: 'exam' })
        .getMany();
        
      this.logger.log(`🔍 Query ejecutada con parámetros: now=${now.toISOString()}, status=${TaskStatus.PUBLISHED}`);

      this.logger.log(`📋 Encontradas ${overdueTasks.length} tareas potencialmente vencidas`);

      if (overdueTasks.length === 0) {
        this.logger.log('✅ No hay tareas vencidas para procesar');
        return;
      }

      let emailsSent = 0;
      
      // Procesar cada tarea vencida - NUEVA LÓGICA POR ESTUDIANTE INDIVIDUAL
      for (const task of overdueTasks) {
        this.logger.log(`🔍 Analizando tarea: ${task.title} (${task.id})`);
        this.logger.log(`📅 Fecha vencimiento: ${task.dueDate}`);
        
        const studentsNotified = await this.processOverdueTaskByStudent(task, overdueAutomations);
        emailsSent += studentsNotified;
        
        this.logger.log(`📧 Notificaciones enviadas para tarea "${task.title}": ${studentsNotified} estudiantes`);
      }

      this.logger.log(`✅ Procesamiento completado. ${emailsSent} correos enviados`);
    } catch (error) {
      this.logger.error('❌ Error en detección de tareas vencidas:', error);
    }
  }

  /**
   * Procesar tarea vencida evaluando cada estudiante individualmente
   */
  private async processOverdueTaskByStudent(task: Task, automations: any[]): Promise<number> {
    let notificationsCount = 0;
    
    try {
      // Obtener todos los estudiantes asignados a esta tarea
      const studentsInTask = await this.taskRepository.manager
        .createQueryBuilder()
        .select([
          's.id as student_id',
          'up."firstName" as first_name', 
          'up."lastName" as last_name',
          'ts.id as submission_id',
          'ts."isGraded" as is_graded'
        ])
        .from('tasks', 't')
        .innerJoin('subject_assignments', 'sa', 't."subjectAssignmentId" = sa.id')
        .innerJoin('class_students', 'cs', 'sa."classGroupId" = cs."classId"')
        .innerJoin('students', 's', 'cs."studentId" = s.id')
        .innerJoin('users', 'u', 's."userId" = u.id')
        .innerJoin('user_profiles', 'up', 'u.id = up."userId"')
        .leftJoin('task_submissions', 'ts', 't.id = ts."taskId" AND s.id = ts."studentId"')
        .where('t.id = :taskId', { taskId: task.id })
        .getRawMany();

      this.logger.log(`👥 Estudiantes asignados a tarea "${task.title}": ${studentsInTask.length}`);

      // Evaluar cada estudiante individualmente
      for (const student of studentsInTask) {
        const hasValidSubmission = student.submission_id && student.is_graded;
        
        this.logger.log(`👤 Estudiante: ${student.first_name} ${student.last_name}`);
        this.logger.log(`📝 Entrega válida: ${hasValidSubmission ? 'SÍ' : 'NO'}`);

        // Si el estudiante NO entregó, notificar a su familia
        if (!hasValidSubmission) {
          const familyNotified = await this.notifyStudentFamily(
            task, 
            student, 
            automations
          );
          
          if (familyNotified) {
            notificationsCount++;
          }
        } else {
          this.logger.log(`✅ Estudiante ${student.first_name} ${student.last_name} entregó la tarea - no se notifica`);
        }
      }

    } catch (error) {
      this.logger.error(`❌ Error procesando estudiantes de tarea ${task.id}:`, error);
    }

    return notificationsCount;
  }

  /**
   * Notificar a la familia de un estudiante específico (solo una vez por día)
   */
  private async notifyStudentFamily(task: Task, student: any, automations: any[]): Promise<boolean> {
    try {
      const studentId = student.student_id;
      const studentName = `${student.first_name} ${student.last_name}`;
      
      // Verificar si ya se envió notificación hoy para este estudiante y tarea
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const alreadyNotified = await this.taskRepository.manager
        .createQueryBuilder()
        .select('COUNT(*) as count')
        .from('overdue_task_notifications', 'otn')
        .where('otn.task_id = :taskId', { taskId: task.id })
        .andWhere('otn.student_id = :studentId', { studentId })
        .andWhere('otn.notification_date = :today', { today })
        .getRawOne();

      if (parseInt(alreadyNotified.count) > 0) {
        this.logger.log(`⏭️ Ya se notificó hoy a la familia de ${studentName} sobre tarea "${task.title}"`);
        return false;
      }

      // Obtener familias del estudiante
      const families = await this.familyStudentRepository.find({
        where: { studentId },
        relations: [
          'family',
          'family.primaryContact',
          'family.primaryContact.profile',
          'family.secondaryContact', 
          'family.secondaryContact.profile'
        ]
      });

      if (families.length === 0) {
        this.logger.warn(`⚠️ No se encontraron familias para estudiante ${studentName}`);
        return false;
      }

      // Preparar datos de la tarea
      const taskData = {
        taskId: task.id,
        studentFullName: studentName,
        taskTitle: task.title,
        taskDescription: task.description || 'Sin descripción',
        dueDate: this.formatDateToDDMMYYYY(task.dueDate.toISOString()),
        subjectName: task.subjectAssignment?.subject?.name || 'Sin asignar',
        teacherName: task.teacher?.user?.profile ? 
          `${task.teacher.user.profile.firstName} ${task.teacher.user.profile.lastName}` : 
          'Profesor no disponible',
        daysOverdue: Math.ceil((new Date().getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
        currentDate: this.formatDateToDDMMYYYY(new Date().toISOString()),
      };

      let emailsSent = 0;

      // Enviar notificación a cada familia
      for (const familyStudent of families) {
        const family = familyStudent.family;
        
        // Enviar a contacto principal
        if (family.primaryContact && family.primaryContact.isActive) {
          await this.sendOverdueTaskEmail(
            family.primaryContact.email,
            `${family.primaryContact.profile?.firstName} ${family.primaryContact.profile?.lastName}`,
            taskData,
            automations
          );
          emailsSent++;
        }

        // Enviar a contacto secundario
        if (family.secondaryContact && family.secondaryContact.isActive) {
          await this.sendOverdueTaskEmail(
            family.secondaryContact.email,
            `${family.secondaryContact.profile?.firstName} ${family.secondaryContact.profile?.lastName}`,
            taskData,
            automations
          );
          emailsSent++;
        }

        // Registrar notificación enviada para evitar duplicados
        await this.taskRepository.manager
          .createQueryBuilder()
          .insert()
          .into('overdue_task_notifications')
          .values({
            task_id: task.id,
            student_id: studentId,
            family_id: family.id,
            notification_date: today,
            email_sent_at: new Date()
          })
          .execute();
      }

      this.logger.log(`📧 Notificación enviada a familia de ${studentName}: ${emailsSent} correos`);
      return emailsSent > 0;

    } catch (error) {
      this.logger.error(`❌ Error notificando familia del estudiante:`, error);
      return false;
    }
  }

  /**
   * Enviar email real de tarea vencida usando Resend directamente
   */
  private async sendOverdueTaskEmail(
    recipientEmail: string,
    recipientName: string,
    taskData: any,
    automations: any[]
  ): Promise<void> {
    try {
      for (const automation of automations) {
        const emailVariables = {
          recipientName: recipientName,
          studentFullName: taskData.studentFullName,
          taskTitle: taskData.taskTitle,
          taskDescription: taskData.taskDescription,
          dueDate: taskData.dueDate,
          subjectName: taskData.subjectName,
          teacherName: taskData.teacherName,
          daysOverdue: taskData.daysOverdue.toString(),
          currentDate: taskData.currentDate,
        };

        // ⭐ USAR RESEND DIRECTAMENTE (método que funciona 100%)
        const htmlContent = this.generateOverdueTaskHTML(emailVariables, taskData);
        const textContent = this.generateOverdueTaskText(emailVariables, taskData);
        
        await this.sendEmailDirectly(
          recipientEmail,
          `⏰ Tarea vencida: ${taskData.taskTitle} - ${taskData.studentFullName}`,
          htmlContent,
          textContent
        );

        this.logger.log(`✅ Email de tarea vencida enviado a ${recipientName} (${recipientEmail}) sobre ${taskData.studentFullName}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error enviando email a ${recipientEmail}:`, error);
      throw error;
    }
  }

  /**
   * Genera HTML directo para notificación de tarea vencida
   */
  private generateOverdueTaskHTML(emailVariables: any, taskData: any): string {
    const urgencyColor = parseInt(taskData.daysOverdue) > 7 ? '#ff4d4f' : '#faad14';
    const urgencyIcon = parseInt(taskData.daysOverdue) > 7 ? '🚨' : '⏰';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tarea Vencida - ${taskData.studentFullName}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%); color: white; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .header p { margin: 5px 0 0; opacity: 0.9; }
          .content { padding: 30px 20px; }
          .greeting { font-size: 16px; margin-bottom: 20px; }
          .task-card { background: #fff2f0; border-left: 4px solid ${urgencyColor}; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .task-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
          .task-icon { font-size: 24px; }
          .task-title { font-size: 18px; font-weight: 600; color: ${urgencyColor}; margin: 0; }
          .task-details { margin: 15px 0; }
          .task-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .task-label { font-weight: 500; color: #666; }
          .task-value { font-weight: 600; }
          .urgent-notice { background: #fff1f0; border: 1px solid #ffccc7; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .urgent-title { font-weight: 600; margin-bottom: 8px; color: #cf1322; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background: linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; transition: transform 0.2s; }
          .btn:hover { transform: translateY(-2px); }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-top: 1px solid #e9ecef; }
          .footer-links { margin: 10px 0; }
          .footer-links a { color: #ff4d4f; text-decoration: none; margin: 0 10px; }
          @media (max-width: 600px) {
            .task-row { flex-direction: column; }
            .task-label, .task-value { margin: 2px 0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${urgencyIcon} Tarea Vencida</h1>
            <p>MW Panel - Sistema de Gestión Educativa</p>
          </div>
          
          <div class="content">
            <div class="greeting">
              <strong>Estimada familia ${emailVariables.recipientName || 'de ' + taskData.studentFullName},</strong>
            </div>
            
            <p>Le informamos que <strong>${taskData.studentFullName}</strong> tiene una tarea pendiente de entrega que ha superado la fecha límite.</p>
            
            <div class="task-card">
              <div class="task-header">
                <span class="task-icon">${urgencyIcon}</span>
                <h3 class="task-title">${taskData.taskTitle}</h3>
              </div>
              
              <div class="task-details">
                <div class="task-row">
                  <span class="task-label">Estudiante:</span>
                  <span class="task-value">${taskData.studentFullName}</span>
                </div>
                <div class="task-row">
                  <span class="task-label">Asignatura:</span>
                  <span class="task-value">${taskData.subjectName}</span>
                </div>
                <div class="task-row">
                  <span class="task-label">Fecha de vencimiento:</span>
                  <span class="task-value">${taskData.dueDate}</span>
                </div>
                <div class="task-row">
                  <span class="task-label">Profesor/a:</span>
                  <span class="task-value">${taskData.teacherName}</span>
                </div>
                <div class="task-row">
                  <span class="task-label">Días de retraso:</span>
                  <span class="task-value" style="color: ${urgencyColor}; font-weight: 700;">${taskData.daysOverdue} días</span>
                </div>
              </div>
              
              <div class="urgent-notice">
                <div class="urgent-title">Descripción de la tarea:</div>
                <div>${taskData.taskDescription}</div>
              </div>
            </div>
            
            <div class="btn-container">
              <a href="https://plataforma.mundoworld.school/family" class="btn">
                Ver Dashboard Familiar
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              <strong>Importante:</strong> Para evitar futuras penalizaciones académicas, por favor contacte con su hijo/a 
              y con el profesor correspondiente para organizar la entrega de la tarea lo antes posible.
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
   * Genera texto plano para notificación de tarea vencida
   */
  private generateOverdueTaskText(emailVariables: any, taskData: any): string {
    const urgencyIcon = parseInt(taskData.daysOverdue) > 7 ? '[URGENTE]' : '[ATENCIÓN]';
    
    return `
Tarea Vencida - MW Panel

Estimada familia ${emailVariables.recipientName || 'de ' + taskData.studentFullName},

Le informamos que ${taskData.studentFullName} tiene una tarea pendiente de entrega que ha superado la fecha límite.

DETALLES DE LA TAREA:
${urgencyIcon}

Estudiante: ${taskData.studentFullName}
Tarea: ${taskData.taskTitle}
Asignatura: ${taskData.subjectName}
Fecha de vencimiento: ${taskData.dueDate}
Profesor/a: ${taskData.teacherName}
Días de retraso: ${taskData.daysOverdue} días

Descripción:
${taskData.taskDescription}

IMPORTANTE: Para evitar futuras penalizaciones académicas, por favor contacte con su hijo/a 
y con el profesor correspondiente para organizar la entrega de la tarea lo antes posible.

Puede revisar todas las tareas y el progreso académico completo accediendo al Panel Familiar:
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
      this.logger.log(`📧 [DIRECT] Sending overdue task email to: ${recipientEmail}`);

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

      this.logger.log(`✅ [DIRECT] Overdue task email sent successfully to: ${recipientEmail} (ID: ${result.data.id})`);

    } catch (error) {
      this.logger.error(`❌ [DIRECT] Failed to send overdue task email to: ${recipientEmail}`, error);
      throw error;
    }
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

  /**
   * Método manual para testing
   */
  async triggerOverdueTaskDetection(): Promise<{ message: string; tasksFound: number }> {
    this.logger.log('🧪 Ejecutando detección manual de tareas vencidas...');
    
    try {
      await this.detectOverdueTasks();
      
      const now = new Date();
      
      const overdueCount = await this.taskRepository.count({
        where: {
          dueDate: LessThan(now),
          status: TaskStatus.PUBLISHED,
        },
      });

      return {
        message: 'Detección de tareas vencidas ejecutada correctamente',
        tasksFound: overdueCount,
      };
    } catch (error) {
      this.logger.error('❌ Error en detección manual:', error);
      throw error;
    }
  }
}