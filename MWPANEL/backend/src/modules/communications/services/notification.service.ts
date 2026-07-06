/**
 * @archivo: notification.service.ts
 * @módulo: Communications - Email Notifications System
 * @función: Servicio principal para gestionar notificaciones automáticas por eventos
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 * @dependencias: EmailService, UserNotificationPreferences, User entities
 * @propósito: Coordinar envío de notificaciones según eventos del sistema y preferencias
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';
import { UserNotificationPreferences } from '../entities/user-notification-preferences.entity';
import { EmailTemplateType } from '../entities/email-template.entity';
import { EmailPriority } from '../entities/email-notification.entity';
import { EmailService } from './email.service';

export interface NotificationEvent {
  type: 'grade_created' | 'assignment_created' | 'message_sent' | 'event_created' |
        'absence_recorded' | 'system_error' | 'backup_completed' | 'user_created' |
        'birthday_reminder' | 'shared_note' | 'blog_post_created' | 'blog_post_published' |
        'blog_comment_added' | 'blog_post_updated' | 'meeting_booked' |
        // Staff (Claustro) notification events
        'staff_task_assigned' | 'staff_task_accepted' | 'staff_task_status_changed' |
        'staff_task_completed' | 'staff_task_comment_added' | 'staff_meeting_created' |
        'staff_meeting_reminder' | 'staff_task_overdue';
  triggeredById?: string;
  recipientIds?: string[];
  recipientRoles?: UserRole[];
  data: Record<string, any>;
  priority?: EmailPriority;
  immediate?: boolean;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserNotificationPreferences)
    private preferencesRepository: Repository<UserNotificationPreferences>,
    private emailService: EmailService,
  ) {}

  /**
   * Procesa un evento del sistema y envía las notificaciones correspondientes
   */
  async processEvent(event: NotificationEvent): Promise<void> {
    this.logger.log(`📨 Processing notification event: ${event.type}`);

    try {
      // Determinar receptores
      const recipients = await this.getEventRecipients(event);
      
      if (recipients.length === 0) {
        this.logger.log(`ℹ️ No recipients found for event: ${event.type}`);
        return;
      }

      // Procesar cada receptor
      for (const recipient of recipients) {
        await this.processRecipientNotification(recipient, event);
      }

      this.logger.log(`✅ Processed ${recipients.length} notifications for event: ${event.type}`);

    } catch (error) {
      this.logger.error(`❌ Error processing event ${event.type}:`, error);
    }
  }

  /**
   * Procesa notificación para un receptor específico
   */
  private async processRecipientNotification(
    recipient: User,
    event: NotificationEvent,
  ): Promise<void> {
    // Obtener preferencias del usuario
    const preferences = await this.getUserPreferences(recipient.id);
    
    // Verificar si el usuario tiene las notificaciones habilitadas
    if (!preferences.emailNotificationsEnabled) {
      this.logger.log(`⏭️ Email notifications disabled for user: ${recipient.email}`);
      return;
    }

    // Determinar tipo de plantilla y verificar si está habilitada
    const templateInfo = this.getTemplateForEvent(event.type, recipient.role);
    if (!templateInfo) {
      this.logger.log(`⏭️ No template found for event ${event.type} and role ${recipient.role}`);
      return;
    }

    // Verificar preferencias específicas del tipo de notificación
    if (!this.isNotificationTypeEnabled(preferences, templateInfo.templateType, recipient.role)) {
      this.logger.log(`⏭️ Notification type ${templateInfo.templateType} disabled for user: ${recipient.email}`);
      return;
    }

    // Enviar correo
    try {
      await this.emailService.sendEmail({
        to: recipient.email,
        subject: templateInfo.subject,
        templateType: templateInfo.templateType,
        templateData: {
          userName: this.getUserDisplayName(recipient),
          userEmail: recipient.email,
          userRole: recipient.role,
          ...event.data,
        },
        priority: event.priority || EmailPriority.NORMAL,
        userId: recipient.id,
        triggeredBy: event.triggeredById,
        triggerEvent: event.type,
        triggerResourceId: event.data.resourceId,
        triggerResourceType: event.data.resourceType,
      });

      this.logger.log(`📧 Sent ${event.type} notification to: ${recipient.email}`);

    } catch (error) {
      this.logger.error(`❌ Failed to send notification to ${recipient.email}:`, error);
    }
  }

  /**
   * Obtiene los receptores para un evento específico
   */
  private async getEventRecipients(event: NotificationEvent): Promise<User[]> {
    let recipients: User[] = [];

    // Si se especifican IDs de receptores específicos
    if (event.recipientIds && event.recipientIds.length > 0) {
      recipients = await this.userRepository.find({
        where: { id: In(event.recipientIds), isActive: true },
        relations: ['profile'],
      });
    }
    // Si se especifican roles de receptores
    else if (event.recipientRoles && event.recipientRoles.length > 0) {
      recipients = await this.userRepository.find({
        where: { role: In(event.recipientRoles), isActive: true },
        relations: ['profile'],
      });
    }
    // Lógica específica por tipo de evento
    else {
      recipients = await this.getRecipientsForEventType(event);
    }

    return recipients.filter(user => user.email && user.email.includes('@'));
  }

  /**
   * Obtiene receptores específicos según el tipo de evento
   */
  private async getRecipientsForEventType(event: NotificationEvent): Promise<User[]> {
    switch (event.type) {
      case 'grade_created':
        return await this.getGradeNotificationRecipients(event.data);
      
      case 'assignment_created':
        return await this.getAssignmentNotificationRecipients(event.data);
      
      case 'message_sent':
        return await this.getMessageNotificationRecipients(event.data);
      
      case 'event_created':
        return await this.getEventNotificationRecipients(event.data);
      
      case 'absence_recorded':
        return await this.getAbsenceNotificationRecipients(event.data);
      
      case 'system_error':
      case 'backup_completed':
        return await this.userRepository.find({
          where: { role: UserRole.ADMIN, isActive: true },
          relations: ['profile'],
        });
      
      case 'user_created':
        return await this.getUserCreatedNotificationRecipients(event.data);
      
      case 'birthday_reminder':
        return await this.getBirthdayReminderRecipients(event.data);
      
      case 'shared_note':
        return await this.getSharedNoteRecipients(event.data);
      
      case 'blog_post_created':
      case 'blog_post_published':
        return await this.getBlogPostRecipients(event.data);
      
      case 'blog_comment_added':
        return await this.getBlogCommentRecipients(event.data);
      
      case 'blog_post_updated':
        return await this.getBlogPostUpdateRecipients(event.data);

      case 'meeting_booked':
        return await this.getMeetingBookedRecipients(event.data);

      default:
        return [];
    }
  }

  /**
   * Lógica específica para notificaciones de calificaciones
   */
  private async getGradeNotificationRecipients(data: any): Promise<User[]> {
    const recipients: User[] = [];

    // Notificar al estudiante
    if (data.studentId) {
      const student = await this.userRepository.findOne({
        where: { id: data.studentId, isActive: true },
        relations: ['profile'],
      });
      if (student) recipients.push(student);

      // Notificar a las familias del estudiante
      const families = await this.userRepository.find({
        where: { role: UserRole.FAMILY, isActive: true },
        relations: ['profile'],
      });

      // Filtrar familias relacionadas con el estudiante (lógica específica según tus entidades)
      for (const family of families) {
        if (await this.isFamilyRelatedToStudent(family.id, data.studentId)) {
          recipients.push(family);
        }
      }
    }

    return recipients;
  }

  /**
   * Lógica específica para notificaciones de tareas
   */
  private async getAssignmentNotificationRecipients(data: any): Promise<User[]> {
    const recipients: User[] = [];

    // Obtener estudiantes de la clase
    if (data.classGroupId) {
      // Implementar lógica para obtener estudiantes de una clase específica
      // Esta lógica dependerá de tu estructura de entidades
    }

    return recipients;
  }

  /**
   * Lógica específica para notificaciones de mensajes
   */
  private async getMessageNotificationRecipients(data: any): Promise<User[]> {
    if (data.recipientId) {
      const recipient = await this.userRepository.findOne({
        where: { id: data.recipientId, isActive: true },
        relations: ['profile'],
      });
      return recipient ? [recipient] : [];
    }
    return [];
  }

  /**
   * Lógica específica para notificaciones de eventos
   */
  private async getEventNotificationRecipients(data: any): Promise<User[]> {
    // Notificar según el tipo de evento y audiencia
    const roles: UserRole[] = [];
    
    if (data.audienceStudents) roles.push(UserRole.STUDENT);
    if (data.audienceFamilies) roles.push(UserRole.FAMILY);
    if (data.audienceTeachers) roles.push(UserRole.TEACHER);

    if (roles.length > 0) {
      return await this.userRepository.find({
        where: { role: In(roles), isActive: true },
        relations: ['profile'],
      });
    }

    return [];
  }

  /**
   * Lógica específica para notificaciones de ausencias
   */
  private async getAbsenceNotificationRecipients(data: any): Promise<User[]> {
    const recipients: User[] = [];

    // Notificar a las familias del estudiante
    if (data.studentId) {
      const families = await this.userRepository.find({
        where: { role: UserRole.FAMILY, isActive: true },
        relations: ['profile'],
      });

      for (const family of families) {
        if (await this.isFamilyRelatedToStudent(family.id, data.studentId)) {
          recipients.push(family);
        }
      }
    }

    return recipients;
  }

  /**
   * Lógica específica para notificaciones de usuarios creados
   */
  private async getUserCreatedNotificationRecipients(data: any): Promise<User[]> {
    if (data.userId) {
      const user = await this.userRepository.findOne({
        where: { id: data.userId, isActive: true },
        relations: ['profile'],
      });
      return user ? [user] : [];
    }
    return [];
  }

  /**
   * Lógica específica para recordatorios de cumpleaños
   * Envía notificación a todos los usuarios activos excepto al que cumple años
   */
  private async getBirthdayReminderRecipients(data: any): Promise<User[]> {
    const allUsers = await this.userRepository.find({
      where: { isActive: true },
      relations: ['profile'],
    });

    // Excluir al usuario que cumple años de los destinatarios
    const recipients = allUsers.filter(user => 
      user.id !== data.birthdayUserId && 
      user.email && 
      user.email.includes('@')
    );

    return recipients;
  }

  /**
   * Lógica específica para apuntes compartidos
   */
  private async getSharedNoteRecipients(data: any): Promise<User[]> {
    const recipients: User[] = [];

    // Notificar al receptor específico del apunte compartido
    if (data.sharedWithUserId) {
      const recipient = await this.userRepository.findOne({
        where: { id: data.sharedWithUserId, isActive: true },
        relations: ['profile'],
      });
      if (recipient) {
        recipients.push(recipient);
      }
    }

    return recipients;
  }

  /**
   * Lógica específica para notificaciones de publicaciones de blog
   */
  private async getBlogPostRecipients(data: any): Promise<User[]> {
    const recipients: User[] = [];
    
    // Determinar destinatarios según la visibilidad del post
    const visibility = data.visibility;
    
    switch (visibility) {
      case 'public':
        // Todos los usuarios activos
        const allUsers = await this.userRepository.find({
          where: { isActive: true },
          relations: ['profile'],
        });
        recipients.push(...allUsers);
        break;
        
      case 'staff_only':
        // Solo administradores y profesores
        const staff = await this.userRepository.find({
          where: { role: In([UserRole.ADMIN, UserRole.TEACHER]), isActive: true },
          relations: ['profile'],
        });
        recipients.push(...staff);
        break;
        
      case 'students_only':
        // Solo estudiantes
        const students = await this.userRepository.find({
          where: { role: UserRole.STUDENT, isActive: true },
          relations: ['profile'],
        });
        recipients.push(...students);
        break;
        
      case 'families_only':
        // Solo familias
        const families = await this.userRepository.find({
          where: { role: UserRole.FAMILY, isActive: true },
          relations: ['profile'],
        });
        recipients.push(...families);
        break;
        
      case 'class_specific':
        // Usuarios específicos según configuración de visibilidad
        if (data.visibilitySettings?.classGroups?.length > 0) {
          // Aquí implementarías la lógica para obtener usuarios de clases específicas
          // Por ahora, devolver lista vacía hasta que se implemente la relación
        }
        break;
        
      case 'private':
        // Solo el autor
        if (data.authorId) {
          const author = await this.userRepository.findOne({
            where: { id: data.authorId, isActive: true },
            relations: ['profile'],
          });
          if (author) recipients.push(author);
        }
        break;
    }
    
    return recipients.filter(user => user.email && user.email.includes('@'));
  }

  /**
   * Lógica específica para notificaciones de comentarios de blog
   */
  private async getBlogCommentRecipients(data: any): Promise<User[]> {
    const recipients: User[] = [];
    
    // Notificar al autor del post
    if (data.postAuthorId && data.postAuthorId !== data.commentAuthorId) {
      const postAuthor = await this.userRepository.findOne({
        where: { id: data.postAuthorId, isActive: true },
        relations: ['profile'],
      });
      if (postAuthor) recipients.push(postAuthor);
    }
    
    // Notificar a otros comentadores del mismo post (opcional)
    if (data.notifyOtherCommentators && data.postId) {
      // Aquí podrías implementar la lógica para obtener otros comentadores
      // Por ejemplo, mediante una consulta que busque comentarios anteriores del mismo post
    }
    
    return recipients.filter(user => user.email && user.email.includes('@'));
  }

  /**
   * Lógica específica para notificaciones de actualizaciones de posts
   */
  private async getBlogPostUpdateRecipients(data: any): Promise<User[]> {
    // Similar a getBlogPostRecipients pero solo para posts ya existentes
    // Podría incluir solo suscriptores o usuarios que ya interactuaron con el post
    return this.getBlogPostRecipients(data);
  }

  /**
   * Lógica específica para notificaciones de reuniones reservadas
   * Notifica al profesor cuando una familia reserva un slot
   */
  private async getMeetingBookedRecipients(data: any): Promise<User[]> {
    const recipients: User[] = [];

    // Notificar al profesor del slot reservado
    if (data.teacherUserId) {
      const teacher = await this.userRepository.findOne({
        where: { id: data.teacherUserId, isActive: true },
        relations: ['profile'],
      });
      if (teacher) {
        recipients.push(teacher);
      }
    }

    return recipients;
  }

  /**
   * Determina qué plantilla usar según el evento y rol del usuario
   */
  private getTemplateForEvent(
    eventType: string,
    userRole: UserRole,
  ): { templateType: EmailTemplateType; subject: string } | null {
    const eventTemplateMap: Record<string, Record<UserRole, { templateType: EmailTemplateType; subject: string }>> = {
      grade_created: {
        [UserRole.STUDENT]: {
          templateType: EmailTemplateType.GRADE_NOTIFICATION,
          subject: 'Nueva calificación disponible',
        },
        [UserRole.FAMILY]: {
          templateType: EmailTemplateType.CHILD_GRADE_UPDATE,
          subject: 'Nueva calificación de {{childName}}',
        },
        [UserRole.TEACHER]: null,
        [UserRole.ADMIN]: null,
      },
      assignment_created: {
        [UserRole.STUDENT]: {
          templateType: EmailTemplateType.ASSIGNMENT_REMINDER,
          subject: 'Nueva tarea asignada: {{assignmentTitle}}',
        },
        [UserRole.FAMILY]: {
          templateType: EmailTemplateType.ASSIGNMENT_REMINDER,
          subject: 'Nueva tarea para {{childName}}: {{assignmentTitle}}',
        },
        [UserRole.TEACHER]: {
          templateType: EmailTemplateType.NEW_ASSIGNMENT,
          subject: 'Tarea creada: {{assignmentTitle}}',
        },
        [UserRole.ADMIN]: null,
      },
      user_created: {
        [UserRole.STUDENT]: {
          templateType: EmailTemplateType.WELCOME,
          subject: 'Bienvenido a {{schoolName}}',
        },
        [UserRole.FAMILY]: {
          templateType: EmailTemplateType.WELCOME,
          subject: 'Bienvenido a {{schoolName}}',
        },
        [UserRole.TEACHER]: {
          templateType: EmailTemplateType.WELCOME,
          subject: 'Bienvenido al equipo de {{schoolName}}',
        },
        [UserRole.ADMIN]: {
          templateType: EmailTemplateType.WELCOME,
          subject: 'Cuenta de administrador creada',
        },
      },
      birthday_reminder: {
        [UserRole.STUDENT]: {
          templateType: EmailTemplateType.BIRTHDAY_GREETING,
          subject: '🎉 ¡Hoy es el cumpleaños de {{birthdayPersonName}}!',
        },
        [UserRole.FAMILY]: {
          templateType: EmailTemplateType.BIRTHDAY_GREETING,
          subject: '🎂 Recordatorio de cumpleaños - {{birthdayPersonName}}',
        },
        [UserRole.TEACHER]: {
          templateType: EmailTemplateType.BIRTHDAY_GREETING,
          subject: '🎉 ¡Es el cumpleaños de {{birthdayPersonName}}!',
        },
        [UserRole.ADMIN]: {
          templateType: EmailTemplateType.BIRTHDAY_GREETING,
          subject: '🎂 Cumpleaños en la plataforma - {{birthdayPersonName}}',
        },
      },
      shared_note: {
        [UserRole.STUDENT]: {
          templateType: EmailTemplateType.MESSAGE_FROM_TEACHER,
          subject: '📝 {{sharerName}} ha compartido un apunte contigo',
        },
        [UserRole.TEACHER]: {
          templateType: EmailTemplateType.MESSAGE_FROM_TEACHER,
          subject: '📝 {{sharerName}} ha compartido un apunte contigo',
        },
        [UserRole.FAMILY]: {
          templateType: EmailTemplateType.MESSAGE_FROM_TEACHER,
          subject: '📝 Se ha compartido un apunte con {{childName}}',
        },
        [UserRole.ADMIN]: {
          templateType: EmailTemplateType.MESSAGE_FROM_TEACHER,
          subject: '📝 Apunte compartido en la plataforma',
        },
      },
      blog_post_created: {
        [UserRole.STUDENT]: {
          templateType: EmailTemplateType.SCHOOL_EVENT,
          subject: '📰 Nueva publicación en el blog: {{postTitle}}',
        },
        [UserRole.FAMILY]: {
          templateType: EmailTemplateType.SCHOOL_EVENT,
          subject: '📰 Nueva publicación del centro: {{postTitle}}',
        },
        [UserRole.TEACHER]: {
          templateType: EmailTemplateType.SCHOOL_EVENT,
          subject: '📰 Nueva publicación en el blog: {{postTitle}}',
        },
        [UserRole.ADMIN]: {
          templateType: EmailTemplateType.SCHOOL_EVENT,
          subject: '📰 Nueva publicación del blog: {{postTitle}}',
        },
      },
      blog_post_published: {
        [UserRole.STUDENT]: {
          templateType: EmailTemplateType.SCHOOL_EVENT,
          subject: '🔔 Publicación disponible: {{postTitle}}',
        },
        [UserRole.FAMILY]: {
          templateType: EmailTemplateType.SCHOOL_EVENT,
          subject: '🔔 Nueva comunicación: {{postTitle}}',
        },
        [UserRole.TEACHER]: {
          templateType: EmailTemplateType.SCHOOL_EVENT,
          subject: '🔔 Publicación publicada: {{postTitle}}',
        },
        [UserRole.ADMIN]: {
          templateType: EmailTemplateType.SCHOOL_EVENT,
          subject: '🔔 Publicación publicada: {{postTitle}}',
        },
      },
      blog_comment_added: {
        [UserRole.STUDENT]: {
          templateType: EmailTemplateType.MESSAGE_FROM_TEACHER,
          subject: '💬 Nuevo comentario en tu publicación',
        },
        [UserRole.FAMILY]: {
          templateType: EmailTemplateType.MESSAGE_FROM_TEACHER,
          subject: '💬 Nuevo comentario en la publicación',
        },
        [UserRole.TEACHER]: {
          templateType: EmailTemplateType.MESSAGE_FROM_TEACHER,
          subject: '💬 Nuevo comentario en tu publicación',
        },
        [UserRole.ADMIN]: {
          templateType: EmailTemplateType.MESSAGE_FROM_TEACHER,
          subject: '💬 Nuevo comentario en la publicación',
        },
      },
      blog_post_updated: {
        [UserRole.STUDENT]: {
          templateType: EmailTemplateType.SCHOOL_EVENT,
          subject: '📝 Publicación actualizada: {{postTitle}}',
        },
        [UserRole.FAMILY]: {
          templateType: EmailTemplateType.SCHOOL_EVENT,
          subject: '📝 Comunicación actualizada: {{postTitle}}',
        },
        [UserRole.TEACHER]: {
          templateType: EmailTemplateType.SCHOOL_EVENT,
          subject: '📝 Publicación actualizada: {{postTitle}}',
        },
        [UserRole.ADMIN]: {
          templateType: EmailTemplateType.SCHOOL_EVENT,
          subject: '📝 Publicación actualizada: {{postTitle}}',
        },
      },
      meeting_booked: {
        [UserRole.TEACHER]: {
          templateType: EmailTemplateType.SCHOOL_EVENT,
          subject: '📅 Nueva reserva de reunión - {{familyName}}',
        },
        [UserRole.STUDENT]: null,
        [UserRole.FAMILY]: null,
        [UserRole.ADMIN]: null,
      },
      // Staff (Claustro) notification events
      staff_task_assigned: {
        [UserRole.TEACHER]: {
          templateType: EmailTemplateType.NEW_ASSIGNMENT,
          subject: '📋 Te han asignado una nueva tarea: {{taskTitle}}',
        },
        [UserRole.ADMIN]: {
          templateType: EmailTemplateType.NEW_ASSIGNMENT,
          subject: '📋 Te han asignado una nueva tarea: {{taskTitle}}',
        },
        [UserRole.STUDENT]: null,
        [UserRole.FAMILY]: null,
      },
      staff_task_accepted: {
        [UserRole.TEACHER]: {
          templateType: EmailTemplateType.TEACHER_MESSAGE,
          subject: '✅ {{acceptorName}} ha aceptado la tarea: {{taskTitle}}',
        },
        [UserRole.ADMIN]: {
          templateType: EmailTemplateType.TEACHER_MESSAGE,
          subject: '✅ {{acceptorName}} ha aceptado la tarea: {{taskTitle}}',
        },
        [UserRole.STUDENT]: null,
        [UserRole.FAMILY]: null,
      },
      staff_task_status_changed: {
        [UserRole.TEACHER]: {
          templateType: EmailTemplateType.TEACHER_MESSAGE,
          subject: '🔄 {{changerName}} cambió el estado de: {{taskTitle}}',
        },
        [UserRole.ADMIN]: {
          templateType: EmailTemplateType.TEACHER_MESSAGE,
          subject: '🔄 {{changerName}} cambió el estado de: {{taskTitle}}',
        },
        [UserRole.STUDENT]: null,
        [UserRole.FAMILY]: null,
      },
      staff_task_completed: {
        [UserRole.TEACHER]: {
          templateType: EmailTemplateType.TEACHER_MESSAGE,
          subject: '🎉 {{completorName}} ha completado: {{taskTitle}}',
        },
        [UserRole.ADMIN]: {
          templateType: EmailTemplateType.TEACHER_MESSAGE,
          subject: '🎉 {{completorName}} ha completado: {{taskTitle}}',
        },
        [UserRole.STUDENT]: null,
        [UserRole.FAMILY]: null,
      },
      staff_task_comment_added: {
        [UserRole.TEACHER]: {
          templateType: EmailTemplateType.MESSAGE_FROM_TEACHER,
          subject: '💬 {{commenterName}} comentó en: {{taskTitle}}',
        },
        [UserRole.ADMIN]: {
          templateType: EmailTemplateType.MESSAGE_FROM_TEACHER,
          subject: '💬 {{commenterName}} comentó en: {{taskTitle}}',
        },
        [UserRole.STUDENT]: null,
        [UserRole.FAMILY]: null,
      },
      staff_meeting_created: {
        [UserRole.TEACHER]: {
          templateType: EmailTemplateType.EVENT_REMINDER,
          subject: '📅 Nueva reunión de claustro: {{meetingTitle}} - {{meetingDate}}',
        },
        [UserRole.ADMIN]: {
          templateType: EmailTemplateType.EVENT_REMINDER,
          subject: '📅 Nueva reunión de claustro: {{meetingTitle}} - {{meetingDate}}',
        },
        [UserRole.STUDENT]: null,
        [UserRole.FAMILY]: null,
      },
      staff_meeting_reminder: {
        [UserRole.TEACHER]: {
          templateType: EmailTemplateType.EVENT_REMINDER,
          subject: '⏰ Recordatorio: Reunión mañana - {{meetingTitle}}',
        },
        [UserRole.ADMIN]: {
          templateType: EmailTemplateType.EVENT_REMINDER,
          subject: '⏰ Recordatorio: Reunión mañana - {{meetingTitle}}',
        },
        [UserRole.STUDENT]: null,
        [UserRole.FAMILY]: null,
      },
      staff_task_overdue: {
        [UserRole.TEACHER]: {
          templateType: EmailTemplateType.ASSIGNMENT_REMINDER,
          subject: '⚠️ Tarea vencida: {{taskTitle}}',
        },
        [UserRole.ADMIN]: {
          templateType: EmailTemplateType.ASSIGNMENT_REMINDER,
          subject: '⚠️ Tarea vencida: {{taskTitle}}',
        },
        [UserRole.STUDENT]: null,
        [UserRole.FAMILY]: null,
      },
      // Agregar más mapeos según sea necesario
    };

    return eventTemplateMap[eventType]?.[userRole] || null;
  }

  /**
   * Verifica si un tipo de notificación está habilitado para un usuario
   */
  private isNotificationTypeEnabled(
    preferences: UserNotificationPreferences,
    templateType: EmailTemplateType,
    userRole: UserRole,
  ): boolean {
    switch (templateType) {
      case EmailTemplateType.GRADE_NOTIFICATION:
        return preferences.enableGradeNotifications;
      case EmailTemplateType.ASSIGNMENT_REMINDER:
        return preferences.enableAssignmentReminders;
      case EmailTemplateType.EVENT_REMINDER:
        return preferences.enableEventReminders;
      case EmailTemplateType.MESSAGE_FROM_TEACHER:
        return preferences.enableTeacherMessages;
      case EmailTemplateType.CHILD_GRADE_UPDATE:
        return preferences.enableChildGradeUpdates;
      case EmailTemplateType.CHILD_ABSENCE:
        return preferences.enableChildAbsenceAlerts;
      case EmailTemplateType.SCHOOL_EVENT:
        return preferences.enableSchoolEvents;
      case EmailTemplateType.TEACHER_MESSAGE:
        return preferences.enableTeacherCommunications;
      case EmailTemplateType.NEW_ASSIGNMENT:
        return preferences.enableNewAssignments;
      case EmailTemplateType.ADMIN_MESSAGE:
        return preferences.enableAdminMessages;
      case EmailTemplateType.SYSTEM_INCIDENT:
        return preferences.enableSystemIncidents;
      case EmailTemplateType.SYSTEM_ERROR:
        return preferences.enableSystemErrors;
      case EmailTemplateType.BACKUP_REPORT:
        return preferences.enableBackupReports;
      case EmailTemplateType.USER_ACTIVITY:
        return preferences.enableUserActivity;
      case EmailTemplateType.WELCOME:
        return preferences.enableWelcomeEmails;
      case EmailTemplateType.PASSWORD_RESET:
        return preferences.enablePasswordResetEmails;
      case EmailTemplateType.SYSTEM_MAINTENANCE:
        return preferences.enableMaintenanceAlerts;
      case EmailTemplateType.BIRTHDAY_GREETING:
        return preferences.enableSchoolEvents; // Use school events preference for birthday reminders
      default:
        return true;
    }
  }

  /**
   * Obtiene las preferencias de notificación de un usuario
   */
  private async getUserPreferences(userId: string): Promise<UserNotificationPreferences> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    // Si no existen preferencias, crear unas por defecto
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
   * Obtiene el nombre de visualización del usuario
   */
  private getUserDisplayName(user: User): string {
    if (user.profile) {
      return `${user.profile.firstName} ${user.profile.lastName}`.trim();
    }
    return user.email.split('@')[0];
  }

  /**
   * Verifica si una familia está relacionada con un estudiante
   * Esta lógica dependerá de tu estructura de entidades
   */
  private async isFamilyRelatedToStudent(familyId: string, studentId: string): Promise<boolean> {
    // Implementar lógica específica según tus entidades
    // Por ejemplo, podría ser a través de una relación en la entidad Family o Student
    return true; // Placeholder
  }

  /**
   * API pública para eventos específicos del sistema
   */

  async notifyGradeCreated(studentId: string, gradeData: any, triggeredById?: string): Promise<void> {
    await this.processEvent({
      type: 'grade_created',
      triggeredById,
      data: { studentId, ...gradeData },
      priority: EmailPriority.NORMAL,
    });
  }

  async notifyAssignmentCreated(assignmentData: any, triggeredById?: string): Promise<void> {
    await this.processEvent({
      type: 'assignment_created',
      triggeredById,
      data: assignmentData,
      priority: EmailPriority.NORMAL,
    });
  }

  async notifyMessageSent(recipientId: string, messageData: any, triggeredById?: string): Promise<void> {
    await this.processEvent({
      type: 'message_sent',
      triggeredById,
      recipientIds: [recipientId],
      data: messageData,
      priority: EmailPriority.HIGH,
      immediate: true,
    });
  }

  async notifyEventCreated(eventData: any, triggeredById?: string): Promise<void> {
    await this.processEvent({
      type: 'event_created',
      triggeredById,
      data: eventData,
      priority: EmailPriority.NORMAL,
    });
  }

  async notifyAbsenceRecorded(studentId: string, absenceData: any, triggeredById?: string): Promise<void> {
    await this.processEvent({
      type: 'absence_recorded',
      triggeredById,
      data: { studentId, ...absenceData },
      priority: EmailPriority.HIGH,
    });
  }

  async notifyUserCreated(userId: string, userData: any): Promise<void> {
    await this.processEvent({
      type: 'user_created',
      recipientIds: [userId],
      data: userData,
      priority: EmailPriority.HIGH,
      immediate: true,
    });
  }

  async notifySystemError(errorData: any): Promise<void> {
    await this.processEvent({
      type: 'system_error',
      recipientRoles: [UserRole.ADMIN],
      data: errorData,
      priority: EmailPriority.URGENT,
      immediate: true,
    });
  }

  async notifyBackupCompleted(backupData: any): Promise<void> {
    await this.processEvent({
      type: 'backup_completed',
      recipientRoles: [UserRole.ADMIN],
      data: backupData,
      priority: EmailPriority.LOW,
    });
  }

  async notifyBirthdayReminder(birthdayUserId: string, birthdayUserData: any): Promise<void> {
    await this.processEvent({
      type: 'birthday_reminder',
      data: {
        birthdayUserId,
        birthdayPersonName: birthdayUserData.fullName || birthdayUserData.userName || 'uno de nosotros',
        schoolName: 'Mundo World School',
        humorousMessage: this.getRandomBirthdayMessage(),
        ...birthdayUserData,
      },
      priority: EmailPriority.NORMAL,
    });
  }

  async notifySharedNote(sharedWithUserId: string, sharedNoteData: any, triggeredById?: string): Promise<void> {
    await this.processEvent({
      type: 'shared_note',
      triggeredById,
      data: {
        sharedWithUserId,
        noteTitle: sharedNoteData.noteTitle || 'Apunte sin título',
        sharerName: sharedNoteData.sharerName || 'Un compañero',
        noteType: sharedNoteData.noteType || 'texto',
        subjectName: sharedNoteData.subjectName || 'General',
        resourceId: sharedNoteData.sharedNoteId,
        resourceType: 'shared_note',
        childName: sharedNoteData.childName, // Para familias
        ...sharedNoteData,
      },
      priority: EmailPriority.NORMAL,
      immediate: true,
    });
  }

  /**
   * Genera mensajes humorísticos para recordatorios de cumpleaños
   */
  private getRandomBirthdayMessage(): string {
    const messages = [
      '¡No se te olvide decirle feliz cumpleaños o te quedarás sin pastel! 🍰',
      'Recuerda desearle un feliz cumpleaños, ¡porque los buenos deseos nunca sobran! 🎁',
      '¡Es el gran día de alguien especial! No dejes pasar la oportunidad de felicitarle 🎉',
      'Hoy es un día perfecto para hacer sonreír a alguien con tus felicitaciones 😊',
      '¡Alerta de cumpleaños! Prepara tu mejor sonrisa y tus mejores deseos 🎂',
      'Recordatorio amistoso: ¡Hoy hay que repartir felicitaciones! 🎈',
      '¿Ya felicitaste al cumpleañero? ¡No dejes que se te escape! 🥳',
      'Un pequeño gesto puede alegrar mucho el día. ¡Ve y felicítale! ✨'
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // ====================================================================
  // API PÚBLICA PARA EVENTOS DE BLOG
  // ====================================================================

  async notifyBlogPostCreated(postData: any, triggeredById?: string): Promise<void> {
    await this.processEvent({
      type: 'blog_post_created',
      triggeredById,
      data: {
        postId: postData.id,
        postTitle: postData.title,
        postExcerpt: postData.excerpt,
        authorId: postData.authorId,
        authorName: postData.authorName,
        visibility: postData.visibility,
        visibilitySettings: postData.visibilitySettings,
        categoryName: postData.category?.name,
        resourceId: postData.id,
        resourceType: 'blog_post',
        ...postData,
      },
      priority: EmailPriority.NORMAL,
    });
  }

  async notifyBlogPostPublished(postData: any, triggeredById?: string): Promise<void> {
    await this.processEvent({
      type: 'blog_post_published',
      triggeredById,
      data: {
        postId: postData.id,
        postTitle: postData.title,
        postExcerpt: postData.excerpt,
        authorId: postData.authorId,
        authorName: postData.authorName,
        visibility: postData.visibility,
        visibilitySettings: postData.visibilitySettings,
        categoryName: postData.category?.name,
        publishDate: postData.publishDate || new Date(),
        resourceId: postData.id,
        resourceType: 'blog_post',
        ...postData,
      },
      priority: EmailPriority.HIGH,
      immediate: true,
    });
  }

  async notifyBlogCommentAdded(commentData: any, postData: any, triggeredById?: string): Promise<void> {
    await this.processEvent({
      type: 'blog_comment_added',
      triggeredById,
      data: {
        commentId: commentData.id,
        commentContent: commentData.content,
        commentAuthorId: commentData.authorId,
        commentAuthorName: commentData.authorName,
        postId: postData.id,
        postTitle: postData.title,
        postAuthorId: postData.authorId,
        postAuthorName: postData.authorName,
        resourceId: commentData.id,
        resourceType: 'blog_comment',
        ...commentData,
      },
      priority: EmailPriority.HIGH,
      immediate: true,
    });
  }

  async notifyBlogPostUpdated(postData: any, changes: string[], triggeredById?: string): Promise<void> {
    await this.processEvent({
      type: 'blog_post_updated',
      triggeredById,
      data: {
        postId: postData.id,
        postTitle: postData.title,
        postExcerpt: postData.excerpt,
        authorId: postData.authorId,
        authorName: postData.authorName,
        visibility: postData.visibility,
        visibilitySettings: postData.visibilitySettings,
        categoryName: postData.category?.name,
        changesDescription: changes.join(', '),
        updateDate: new Date(),
        resourceId: postData.id,
        resourceType: 'blog_post',
        ...postData,
      },
      priority: EmailPriority.NORMAL,
    });
  }
}