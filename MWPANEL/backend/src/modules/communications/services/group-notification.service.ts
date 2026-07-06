/**
 * @archivo: group-notification.service.ts
 * @módulo: Communications - Group Chat Notifications
 * @función: Sistema de notificaciones por digest horario para mensajes de grupo
 * @creado_por: Sistema de Grupos MW Panel 2.0
 * @fecha: 2025-12-16
 * @propósito: Evitar spam de emails enviando resúmenes horarios de actividad en grupos
 * @actualizado: Ahora usa persistencia en BD en lugar de memoria volátil
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Message, MessageType } from '../entities/message.entity';
import { Conversation, ConversationType } from '../entities/conversation.entity';
import { User } from '../../users/entities/user.entity';
import { PendingGroupNotification } from '../entities/pending-group-notification.entity';
import { EmailService } from './email.service';
import { formatDateLocal } from '../../../common/transformers/date.transformer';

interface UserDigest {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  groups: {
    groupId: string;
    groupTitle: string;
    messages: {
      messageId: string;
      senderName: string;
      contentPreview: string;
      createdAt: Date;
    }[];
  }[];
  totalMessages: number;
}

@Injectable()
export class GroupNotificationService implements OnModuleInit {
  private readonly logger = new Logger(GroupNotificationService.name);

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PendingGroupNotification)
    private pendingNotificationRepository: Repository<PendingGroupNotification>,
    private emailService: EmailService,
  ) {
    this.logger.log('📧 GroupNotificationService constructor called');
  }

  onModuleInit() {
    this.logger.log('📧 GroupNotificationService initialized - Hourly digest enabled (with DB persistence)');
    this.logger.log('📧 Next digest will be sent at the top of the next hour');
  }

  /**
   * Encola un mensaje de grupo para incluir en el digest horario
   * Llamado cuando se envía un nuevo mensaje a un grupo
   * Ahora guarda en BD para persistencia
   */
  async queueGroupMessageNotification(
    groupId: string,
    messageId: string,
    senderId: string,
  ): Promise<void> {
    try {
      // Obtener detalles del mensaje y grupo
      const message = await this.messageRepository.findOne({
        where: { id: messageId },
        relations: ['sender', 'sender.profile'],
      });

      if (!message) {
        this.logger.warn(`Message ${messageId} not found for notification`);
        return;
      }

      const group = await this.conversationRepository.findOne({
        where: { id: groupId, type: ConversationType.GROUP },
        relations: ['participants'],
      });

      if (!group) {
        this.logger.warn(`Group ${groupId} not found for notification`);
        return;
      }

      const senderName = message.sender?.profile
        ? `${message.sender.profile.firstName} ${message.sender.profile.lastName}`.trim()
        : 'Usuario';

      const contentPreview = this.getContentPreview(message.content);
      const groupTitle = group.title || 'Grupo sin nombre';

      // Crear notificaciones pendientes para cada participante (excepto el remitente)
      const notifications: PendingGroupNotification[] = [];

      for (const participant of group.participants) {
        if (participant.id === senderId) continue; // No notificar al remitente

        const notification = this.pendingNotificationRepository.create({
          recipientId: participant.id,
          groupId,
          messageId,
          senderId,
          groupTitle,
          senderName,
          contentPreview,
          messageCreatedAt: message.createdAt,
          processed: false,
        });
        notifications.push(notification);
      }

      // Guardar todas las notificaciones en la BD
      if (notifications.length > 0) {
        await this.pendingNotificationRepository.save(notifications);
        this.logger.debug(`Queued message ${messageId} for ${notifications.length} participants (saved to DB)`);
      }
    } catch (error) {
      this.logger.error('Error queuing group message notification:', error);
    }
  }

  /**
   * Cron job que se ejecuta cada hora para enviar digest de mensajes de grupo
   * Se ejecuta al minuto 0 de cada hora
   * Ahora lee de la BD para persistencia
   */
  @Cron('0 * * * *') // Every hour at minute 0
  async processHourlyDigest(): Promise<void> {
    try {
      this.logger.log('📧 Processing hourly group message digest...');

      // Obtener todas las notificaciones pendientes no procesadas
      const pendingNotifications = await this.pendingNotificationRepository.find({
        where: { processed: false },
        order: { messageCreatedAt: 'ASC' },
      });

      if (pendingNotifications.length === 0) {
        this.logger.log('📧 No pending group notifications to process');
        return;
      }

      // Agrupar por usuario
      const notificationsByUser = new Map<string, PendingGroupNotification[]>();
      for (const notification of pendingNotifications) {
        const existing = notificationsByUser.get(notification.recipientId) || [];
        existing.push(notification);
        notificationsByUser.set(notification.recipientId, existing);
      }

      const digestsToSend: UserDigest[] = [];

      // Construir digests por usuario
      for (const [userId, notifications] of notificationsByUser.entries()) {
        if (notifications.length === 0) continue;

        const user = await this.userRepository.findOne({
          where: { id: userId },
          relations: ['profile'],
        });

        if (!user || !user.email) {
          this.logger.warn(`User ${userId} not found or has no email`);
          continue;
        }

        // Agrupar mensajes por grupo
        const groupMap = new Map<string, { groupTitle: string; messages: any[] }>();
        for (const notification of notifications) {
          const existing = groupMap.get(notification.groupId) || {
            groupTitle: notification.groupTitle,
            messages: [],
          };
          existing.messages.push({
            messageId: notification.messageId,
            senderName: notification.senderName,
            contentPreview: notification.contentPreview,
            createdAt: notification.messageCreatedAt,
          });
          groupMap.set(notification.groupId, existing);
        }

        const groups = Array.from(groupMap.entries()).map(([groupId, data]) => ({
          groupId,
          groupTitle: data.groupTitle,
          messages: data.messages.sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ),
        }));

        const digest: UserDigest = {
          userId,
          email: user.email,
          firstName: user.profile?.firstName || 'Usuario',
          lastName: user.profile?.lastName || '',
          groups,
          totalMessages: notifications.length,
        };

        digestsToSend.push(digest);
      }

      // Enviar digest a cada usuario
      let sentCount = 0;
      let errorCount = 0;

      for (const digest of digestsToSend) {
        try {
          await this.sendDigestEmail(digest);
          sentCount++;

          // Marcar notificaciones como procesadas
          const notificationIds = notificationsByUser.get(digest.userId)?.map(n => n.id) || [];
          if (notificationIds.length > 0) {
            await this.pendingNotificationRepository.update(
              { id: In(notificationIds) },
              { processed: true, processedAt: new Date() },
            );
          }
        } catch (error) {
          errorCount++;
          this.logger.error(`Error sending digest to ${digest.email}:`, error);
        }
      }

      this.logger.log(`📧 Hourly digest completed: ${sentCount} sent, ${errorCount} errors`);
    } catch (error) {
      this.logger.error('Error in hourly digest cron job:', error);
    }
  }


  /**
   * Envía el email de digest a un usuario
   */
  private async sendDigestEmail(digest: UserDigest): Promise<void> {
    const subject = digest.totalMessages === 1
      ? `Tienes 1 mensaje nuevo en grupos de chat`
      : `Tienes ${digest.totalMessages} mensajes nuevos en ${digest.groups.length} grupo${digest.groups.length > 1 ? 's' : ''}`;

    const htmlContent = this.generateDigestHtml(digest);

    await this.emailService.sendEmail({
      to: digest.email,
      subject,
      htmlContent,
      userId: digest.userId,
      triggerEvent: 'group-chat-hourly-digest',
    });

    this.logger.log(`📧 Digest sent to ${digest.email}: ${digest.totalMessages} messages in ${digest.groups.length} groups`);
  }

  /**
   * Genera el contenido HTML del email de digest
   */
  private generateDigestHtml(digest: UserDigest): string {
    const greeting = `Hola ${digest.firstName}`;
    const intro = digest.totalMessages === 1
      ? 'Tienes un nuevo mensaje en tus grupos de chat:'
      : `Tienes ${digest.totalMessages} nuevos mensajes en tus grupos de chat:`;

    let groupsHtml = '';
    for (const group of digest.groups) {
      const messagesHtml = group.messages
        .slice(0, 5) // Máximo 5 mensajes por grupo en el preview
        .map(msg => `
          <div style="padding: 8px 12px; background: #f5f5f5; border-radius: 8px; margin-bottom: 8px;">
            <strong style="color: #560797;">${msg.senderName}:</strong>
            <span style="color: #333;">${msg.contentPreview}</span>
            <br>
            <small style="color: #888;">${formatDateLocal(msg.createdAt)}</small>
          </div>
        `).join('');

      const remainingCount = group.messages.length - 5;
      const moreText = remainingCount > 0
        ? `<p style="color: #666; font-size: 14px;">... y ${remainingCount} mensaje${remainingCount > 1 ? 's' : ''} más</p>`
        : '';

      groupsHtml += `
        <div style="margin-bottom: 24px; border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px;">
          <h3 style="margin: 0 0 12px 0; color: #560797; font-size: 18px;">
            👥 ${group.groupTitle}
          </h3>
          <p style="color: #666; font-size: 14px; margin-bottom: 12px;">
            ${group.messages.length} mensaje${group.messages.length > 1 ? 's' : ''} nuevo${group.messages.length > 1 ? 's' : ''}
          </p>
          ${messagesHtml}
          ${moreText}
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Resumen de mensajes de grupo</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #560797 0%, #7c3aed 100%); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                      📬 Mensajes de Grupo
                    </h1>
                    <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                      Resumen de actividad en tus grupos
                    </p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px;">
                    <p style="margin: 0 0 8px 0; font-size: 18px; color: #333;">
                      ${greeting},
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 16px; color: #666;">
                      ${intro}
                    </p>

                    ${groupsHtml}

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 24px 0;">
                          <a href="https://plataforma.mundoworld.school/communications"
                             style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #560797 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            Ver todos los mensajes
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 32px; background-color: #f9fafb; border-radius: 0 0 16px 16px; text-align: center;">
                    <p style="margin: 0; color: #888; font-size: 12px;">
                      Este es un resumen automático enviado cada hora.
                      <br>
                      Puedes cambiar tus preferencias de notificación en la configuración de tu cuenta.
                    </p>
                    <p style="margin: 16px 0 0 0; color: #888; font-size: 12px;">
                      © ${new Date().getFullYear()} Mundo World School
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Extrae un preview del contenido del mensaje (primeros 100 caracteres)
   */
  private getContentPreview(content: string): string {
    // Remover HTML tags
    const textOnly = content.replace(/<[^>]*>/g, '').trim();

    if (textOnly.length <= 100) {
      return textOnly;
    }

    return textOnly.substring(0, 97) + '...';
  }

  /**
   * Obtiene estadísticas de notificaciones pendientes desde la BD
   */
  async getStats(): Promise<{ pendingUsers: number; pendingMessages: number }> {
    const pendingCount = await this.pendingNotificationRepository.count({
      where: { processed: false },
    });

    // Contar usuarios únicos con notificaciones pendientes
    const uniqueUsers = await this.pendingNotificationRepository
      .createQueryBuilder('notification')
      .select('COUNT(DISTINCT notification.recipient_id)', 'count')
      .where('notification.processed = :processed', { processed: false })
      .getRawOne();

    return {
      pendingUsers: parseInt(uniqueUsers?.count || '0', 10),
      pendingMessages: pendingCount,
    };
  }

  /**
   * Fuerza el envío del digest (para testing o administración)
   */
  async forceDigest(): Promise<{ sent: number; errors: number }> {
    this.logger.log('📧 Forcing immediate digest send...');
    await this.processHourlyDigest();

    // Obtener stats después del envío
    const stats = await this.getStats();
    return {
      sent: stats.pendingMessages === 0 ? 1 : 0,
      errors: stats.pendingMessages > 0 ? 1 : 0
    };
  }

  /**
   * Limpia notificaciones procesadas antiguas (más de 7 días)
   * Se puede llamar desde un cron de limpieza
   */
  async cleanupOldNotifications(): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await this.pendingNotificationRepository
      .createQueryBuilder()
      .delete()
      .where('processed = :processed', { processed: true })
      .andWhere('processed_at < :date', { date: sevenDaysAgo })
      .execute();

    const deletedCount = result.affected || 0;
    if (deletedCount > 0) {
      this.logger.log(`📧 Cleaned up ${deletedCount} old processed notifications`);
    }

    return deletedCount;
  }
}
