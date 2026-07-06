/**
 * @archivo: communications.module.ts
 * @módulo: Communications - Complete Communication System
 * @función: Módulo principal de comunicaciones con sistema de correos integrado
 * @modificado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 * @nuevas_funcionalidades: Sistema completo de correos con plantillas y preferencias
 * @dependencias: Nuevas entidades de email y servicios de notificación
 */

import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

// Servicios originales
import { CommunicationsService } from './communications.service';

// Controladores originales
import { CommunicationsController } from './communications.controller';

// Entidades originales
import { Message } from './entities/message.entity';
import { Notification } from './entities/notification.entity';
import { Conversation } from './entities/conversation.entity';
import { MessageAttachment } from './entities/message-attachment.entity';
import { MessageDeletion } from './entities/message-deletion.entity';
import { ConversationReadStatus } from './entities/conversation-read-status.entity';
import { PendingGroupNotification } from './entities/pending-group-notification.entity';
import { MessageReadStatus } from './entities/message-read-status.entity';
import { ConversationAdmin } from './entities/conversation-admin.entity';

// NUEVAS ENTIDADES - Sistema de Correos
import { EmailTemplate } from './entities/email-template.entity';
import { EmailNotification } from './entities/email-notification.entity';
import { UserNotificationPreferences } from './entities/user-notification-preferences.entity';
import { EmailAutomation } from './entities/email-automation.entity';
import { CommunicationConfig } from './entities/communication-config.entity';

// MessageGroup entities kept for legacy broadcast message groups (CommunicationsService dependency)
import { MessageGroup } from './entities/message-group.entity';
import { MessageGroupMember } from './entities/message-group-member.entity';

// NUEVAS ENTIDADES - Sistema de Anuncios
import { SystemAnnouncement } from './entities/system-announcement.entity';

// NUEVOS SERVICIOS - Sistema de Correos
import { EmailService } from './services/email.service';
import { EmailTemplateService } from './services/email-template.service';
import { NotificationService } from './services/notification.service';
import { EmailAutomationService } from './services/email-automation.service';
import { BirthdayAutomationService } from './services/birthday-automation.service';
import { OverdueTasksService } from './services/overdue-tasks.service';
import { GradeNotificationsService } from './services/grade-notifications.service';
import { CronTestService } from './services/cron-test.service';
import { CronInitializerService } from './services/cron-initializer.service';
import { AIAssistantService } from './services/ai-assistant.service';
import { ConversationsService } from './services/conversations.service';
import { CommunicationConfigService } from './services/communication-config.service';

// NUEVOS SERVICIOS - Sistema de Grupos
import { MessageGroupsService } from './services/message-groups.service'; // Legacy broadcast groups
import { GroupChatsService } from './services/group-chats.service'; // New WhatsApp-style groups
import { GroupNotificationService } from './services/group-notification.service';

// NUEVOS SERVICIOS - Sistema de Anuncios
import { SystemAnnouncementService } from './services/system-announcement.service';

// NUEVOS - Sistema de Tiempo Real
import { NotificationsGateway } from './gateways/notifications.gateway';
import { UnreadCounterService } from './services/unread-counter.service';
import { UnreadCounter } from './entities/unread-counter.entity';
// Envíos programados (estilo Gmail)
import { ScheduledMessage } from './entities/scheduled-message.entity';
import { ScheduledMessagesService } from './services/scheduled-messages.service';
import { ScheduledMessagesController } from './controllers/scheduled-messages.controller';

// NUEVOS CONTROLADORES - Sistema de Correos
import { EmailTemplatesController } from './controllers/email-templates.controller';
import { NotificationPreferencesController } from './controllers/notification-preferences.controller';
import { EmailNotificationsController } from './controllers/email-notifications.controller';
import { EmailAutomationController } from './controllers/email-automation.controller';
import { CronTestController } from './controllers/cron-test.controller';
import { AIAssistantController } from './controllers/ai-assistant.controller';
import { ConversationsController } from './controllers/conversations.controller';
import { CommunicationConfigController } from './controllers/communication-config.controller';

// NUEVOS CONTROLADORES - Sistema de Grupos
import { MessageGroupsController } from './controllers/message-groups.controller'; // Legacy broadcast (route: message-groups)
import { GroupChatsController } from './controllers/group-chats.controller'; // WhatsApp-style (route: groups)

// NUEVOS CONTROLADORES - Sistema de Anuncios
import { SystemAnnouncementController } from './controllers/system-announcement.controller';

// Link Preview
import { LinkPreviewController } from './controllers/link-preview.controller';
import { LinkPreviewService } from './services/link-preview.service';

// Google Drive (para guardar notas de voz)
import { EducationalResourcesModule } from '../educational-resources/educational-resources.module';
import { TeacherAccessModule } from '../../common/teacher-access/teacher-access.module';

// Entidades relacionadas
import { User } from '../users/entities/user.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { Student } from '../students/entities/student.entity';
import { Task } from '../tasks/entities/task.entity';
import { Family, FamilyStudent } from '../users/entities/family.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { SystemSetting } from '../settings/entities/system-setting.entity';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),   // NotificationsGateway lo usa para validar tokens WS
    EducationalResourcesModule, // Provides GoogleDriveService for voice note uploads
    TeacherAccessModule,
    TypeOrmModule.forFeature([
      // Entidades originales de comunicaciones
      Message,
      Notification,
      Conversation,
      MessageAttachment,
      MessageDeletion,
      ConversationReadStatus,
      PendingGroupNotification,
      MessageReadStatus,
      ConversationAdmin,

      // NUEVAS ENTIDADES - Sistema de Correos
      EmailTemplate,
      EmailNotification,
      UserNotificationPreferences,
      EmailAutomation,
      CommunicationConfig,

      // NUEVAS ENTIDADES - Sistema de Grupos (Legacy broadcast)
      MessageGroup,
      MessageGroupMember,

      // NUEVAS ENTIDADES - Sistema de Anuncios
      SystemAnnouncement,

      // NUEVAS ENTIDADES - Sistema de Tiempo Real
      UnreadCounter,

      // Envíos programados
      ScheduledMessage,

      // Entidades relacionadas
      User,
      ClassGroup,
      Student,
      Task,
      Family,
      FamilyStudent,
      SubjectAssignment,
      Teacher,
      SystemSetting,
    ]),
  ],
  controllers: [
    // Controladores originales
    CommunicationsController,
    
    // NUEVOS CONTROLADORES - Sistema de Correos
    EmailTemplatesController,
    NotificationPreferencesController,
    EmailNotificationsController,
    EmailAutomationController,
    CronTestController,
    AIAssistantController,
    ConversationsController,
    CommunicationConfigController,

    // NUEVOS CONTROLADORES - Sistema de Grupos
    MessageGroupsController, // Legacy broadcast groups at /communications/message-groups
    GroupChatsController, // New WhatsApp-style groups at /communications/groups

    // NUEVOS CONTROLADORES - Sistema de Anuncios
    SystemAnnouncementController,

    // Link Preview
    LinkPreviewController,

    // Envíos programados
    ScheduledMessagesController,
  ],
  providers: [
    // Servicios originales
    CommunicationsService,
    
    // NUEVOS SERVICIOS - Sistema de Correos
    EmailService,
    EmailTemplateService,
    NotificationService,
    EmailAutomationService,
    BirthdayAutomationService,
    OverdueTasksService,
    GradeNotificationsService,
    CronTestService,
    CronInitializerService,
    AIAssistantService,
    ConversationsService,
    CommunicationConfigService,

    // NUEVOS SERVICIOS - Sistema de Grupos
    MessageGroupsService, // Legacy broadcast groups
    GroupChatsService, // New WhatsApp-style groups
    GroupNotificationService,

    // NUEVOS SERVICIOS - Sistema de Anuncios
    SystemAnnouncementService,

    // NUEVOS - Sistema de Tiempo Real
    NotificationsGateway,
    UnreadCounterService,

    // Link Preview
    LinkPreviewService,

    // Envíos programados
    ScheduledMessagesService,
  ],
  exports: [
    // Servicios originales
    CommunicationsService,
    
    // NUEVOS SERVICIOS EXPORTADOS - para uso en otros módulos
    EmailService,
    NotificationService,
    EmailTemplateService,
    EmailAutomationService,
    BirthdayAutomationService,
    OverdueTasksService,
    GradeNotificationsService,
    AIAssistantService,
    ConversationsService,
    CommunicationConfigService,

    // NUEVOS SERVICIOS EXPORTADOS - Sistema de Grupos
    MessageGroupsService, // Legacy broadcast groups
    GroupChatsService, // New WhatsApp-style groups
    GroupNotificationService,

    // NUEVOS SERVICIOS EXPORTADOS - Sistema de Anuncios
    SystemAnnouncementService,

    // NUEVOS EXPORTADOS - Sistema de Tiempo Real
    NotificationsGateway,
    UnreadCounterService,
  ],
})
export class CommunicationsModule implements OnModuleInit {
  private readonly logger = new Logger(CommunicationsModule.name);

  constructor(
    private readonly birthdayAutomationService: BirthdayAutomationService,
  ) {}

  async onModuleInit() {
    console.log('🎂 CommunicationsModule: BirthdayAutomationService initialized and cron jobs activated!');
    this.logger.log('🎂 CommunicationsModule OnModuleInit called - initializing BirthdayAutomationService');
    
    // Forzar una referencia al servicio para asegurar instanciación
    if (this.birthdayAutomationService) {
      console.log('🎂 BirthdayAutomationService reference confirmed in OnModuleInit');
      this.logger.log('🎂 BirthdayAutomationService successfully injected and referenced');
    } else {
      console.error('❌ BirthdayAutomationService is null/undefined in OnModuleInit!');
      this.logger.error('❌ BirthdayAutomationService injection failed!');
    }
  }
}