/**
 * @archivo: staff-meeting-reminders.service.ts
 * @modulo: Staff (Claustro)
 * @funcion: Recordatorios por email de reuniones (previo dia antes; aviso de cierre 3/10 dias)
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { StaffMeeting, StaffMeetingStatus } from '../entities/staff-meeting.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { StaffMeetingsService } from './staff-meetings.service';
import { EmailService } from '../../communications/services/email.service';
import { EmailPriority } from '../../communications/entities/email-notification.entity';
import { deriveEndDate } from '../utils/staff-meeting.utils';

const ACTIVE = [StaffMeetingStatus.SCHEDULED, StaffMeetingStatus.IN_PROGRESS];
const PENDING_CLOSE_DAYS = [3, 10];

@Injectable()
export class StaffMeetingRemindersService {
  private readonly logger = new Logger(StaffMeetingRemindersService.name);

  constructor(
    @InjectRepository(StaffMeeting)
    private readonly meetingRepository: Repository<StaffMeeting>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly meetingsService: StaffMeetingsService,
    private readonly emailService: EmailService,
  ) {}

  /** Cada día a las 18:00: recordatorio con orden del día de las reuniones de mañana. */
  @Cron('0 18 * * *')
  async sendPreMeetingReminders(): Promise<void> {
    const now = new Date();
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const meetings = await this.meetingRepository.find({
      where: { status: In(ACTIVE), scheduledDate: Between(startOfTomorrow, endOfTomorrow) },
      relations: ['createdBy', 'createdBy.profile', 'attendees', 'attendees.profile', 'agendaItems'],
    });

    let sent = 0;
    for (const meeting of meetings) {
      const already = await this.emailService.hasSentForResource('staff_meeting_pre_reminder', meeting.id, startOfToday);
      if (already) continue;
      try {
        await this.meetingsService.sendPreMeetingReminder(meeting);
        sent++;
      } catch (error) {
        this.logger.error(`Fallo recordatorio previo para reunión ${meeting.id}:`, error);
      }
    }
    if (sent > 0) this.logger.log(`Enviados ${sent} recordatorio(s) previo(s) de reunión.`);
  }

  /** Cada día a las 07:00: avisa al creador y admins de reuniones pendientes de cierre (3 y 10 días). */
  @Cron('0 7 * * *')
  async sendPendingCloseReminders(): Promise<void> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const dayMs = 24 * 60 * 60 * 1000;

    const active = await this.meetingRepository.find({
      where: { status: In(ACTIVE) },
      relations: ['createdBy', 'createdBy.profile', 'agendaItems'],
    });

    const admins = await this.userRepository.find({
      where: { role: UserRole.ADMIN, isActive: true },
      relations: ['profile'],
    });

    let sent = 0;
    for (const meeting of active) {
      const endsAt = deriveEndDate(meeting);
      if (endsAt.getTime() >= now.getTime()) continue; // aún no ha terminado
      const daysSinceEnd = Math.floor((now.getTime() - endsAt.getTime()) / dayMs);
      if (!PENDING_CLOSE_DAYS.includes(daysSinceEnd)) continue;

      const already = await this.emailService.hasSentForResource('staff_meeting_close_reminder', meeting.id, startOfToday);
      if (already) continue;

      const recipients = this.dedupeRecipients([meeting.createdBy, ...admins]);
      const fecha = new Date(meeting.scheduledDate).toLocaleString('es-ES');
      const html = this.buildCloseReminderHtml(meeting.title, fecha, daysSinceEnd);
      for (const u of recipients) {
        if (!u?.email || !u.email.includes('@')) continue;
        try {
          await this.emailService.sendEmail({
            to: u.email,
            subject: `📌 Reunión de claustro pendiente de cerrar: "${meeting.title}"`,
            htmlContent: html,
            textContent: `La reunión "${meeting.title}" (${fecha}) terminó hace ${daysSinceEnd} días y sigue sin cerrarse. Ciérrala con su acta en la plataforma.`,
            priority: EmailPriority.NORMAL,
            userId: u.id,
            triggerEvent: 'staff_meeting_close_reminder',
            triggerResourceId: meeting.id,
            triggerResourceType: 'staff_meeting',
          });
          sent++;
        } catch (error) {
          this.logger.error(`Fallo aviso de cierre para reunión ${meeting.id} a ${u.email}:`, error);
        }
      }
    }
    if (sent > 0) this.logger.log(`Enviados ${sent} aviso(s) de pendiente de cierre.`);
  }

  private dedupeRecipients(users: (User | undefined)[]): User[] {
    const seen = new Set<string>();
    const out: User[] = [];
    for (const u of users) {
      if (!u || seen.has(u.id)) continue;
      seen.add(u.id);
      out.push(u);
    }
    return out;
  }

  private buildCloseReminderHtml(title: string, fecha: string, days: number): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a202c;">
        <div style="background:#fa8c16;color:#fff;padding:16px 22px;border-radius:8px 8px 0 0;">
          <h2 style="margin:0;font-size:18px;">📌 Reunión pendiente de cerrar</h2>
        </div>
        <div style="border:1px solid #e8e8e8;border-top:none;padding:22px;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 12px;">La reunión de claustro <strong>"${title}"</strong> (${fecha}) terminó hace
            <strong>${days} días</strong> y sigue sin cerrarse.</p>
          <p style="margin:0 0 16px;">Por favor, revisa el acta y ciérrala desde la plataforma. Si no se cierra,
            el sistema la archivará automáticamente a los 30 días.</p>
          <div style="text-align:center;margin-top:20px;">
            <a href="https://plataforma.mundoworld.school/admin/staff/meetings" style="display:inline-block;background:#560797;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">Ir a reuniones</a>
          </div>
          <p style="margin-top:22px;color:#8c8c8c;font-size:12px;">Mundo World School · Gestión del claustro</p>
        </div>
      </div>`;
  }
}
