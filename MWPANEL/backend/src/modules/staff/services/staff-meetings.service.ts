/**
 * @archivo: staff-meetings.service.ts
 * @modulo: Staff (Claustro)
 * @funcion: Servicio para gestion de reuniones del claustro
 */

import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual, Brackets } from 'typeorm';
import { StaffMeeting, StaffMeetingStatus } from '../entities/staff-meeting.entity';
import { StaffMeetingAgenda } from '../entities/staff-meeting-agenda.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { CreateStaffMeetingDto, CreateAgendaItemDto } from '../dto/create-staff-meeting.dto';
import { UpdateStaffMeetingDto, UpdateMeetingNotesDto, UpdateAgendaItemDto } from '../dto/update-staff-meeting.dto';
import { StaffMeetingFiltersDto } from '../dto/staff-filters.dto';
import { resolveMeetingStatusFilter, statusChangeRequiresAdmin, buildAgendaReorder, attachLiveState, getMeetingLiveState } from '../utils/staff-meeting.utils';
import { EmailService } from '../../communications/services/email.service';
import { EmailPriority } from '../../communications/entities/email-notification.entity';

@Injectable()
export class StaffMeetingsService {
  private readonly logger = new Logger(StaffMeetingsService.name);

  constructor(
    @InjectRepository(StaffMeeting)
    private readonly meetingRepository: Repository<StaffMeeting>,
    @InjectRepository(StaffMeetingAgenda)
    private readonly agendaRepository: Repository<StaffMeetingAgenda>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Construye el HTML detallado del email de una reunión de claustro,
   * incluyendo el orden del día (puntos), fecha/hora, lugar y descripción.
   */
  buildMeetingEmailHtml(params: {
    recipientName: string;
    title: string;
    scheduledDate: Date;
    location?: string;
    description?: string;
    creatorName?: string;
    agendaItems?: { title: string; description?: string; durationMinutes?: number }[];
    isReminder?: boolean;
    statusMessage?: string;
  }): string {
    const { recipientName, title, scheduledDate, location, description, creatorName, agendaItems, isReminder, statusMessage } = params;
    const d = new Date(scheduledDate);
    const fecha = d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const isCancelled = statusMessage === 'cancelada';
    const headerColor = statusMessage
      ? (isCancelled ? '#cf1322' : '#1677ff')
      : (isReminder ? '#fa8c16' : '#560797');
    const headerText = statusMessage
      ? `📢 Reunión de claustro ${statusMessage}`
      : (isReminder ? '⏰ Recordatorio de reunión de claustro' : '📅 Nueva reunión de claustro');

    const agendaHtml = (agendaItems && agendaItems.length > 0)
      ? `<div style="margin-top:20px;">
           <h3 style="color:#560797;font-size:15px;margin:0 0 8px;">📋 Orden del día</h3>
           <ol style="margin:0;padding-left:20px;color:#333;font-size:14px;line-height:1.7;">
             ${agendaItems.map((it) => `<li style="margin-bottom:6px;"><strong>${it.title || 'Punto'}</strong>${it.durationMinutes ? ` <span style="color:#8c8c8c;">(${it.durationMinutes} min)</span>` : ''}${it.description ? `<br/><span style="color:#595959;">${it.description}</span>` : ''}</li>`).join('')}
           </ol>
         </div>`
      : `<p style="color:#8c8c8c;font-size:13px;margin-top:16px;">No se ha especificado un orden del día.</p>`;

    return `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#1a202c;">
        <div style="background:${headerColor};color:#fff;padding:18px 24px;border-radius:8px 8px 0 0;">
          <h2 style="margin:0;font-size:20px;">${headerText}</h2>
        </div>
        <div style="border:1px solid #e8e8e8;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 12px;">Hola ${recipientName},</p>
          <p style="margin:0 0 16px;">${statusMessage ? `La reunión de claustro ha sido marcada como <strong>${statusMessage}</strong>. Estos son los detalles:` : (isReminder ? 'Te recordamos que tienes una reunión de claustro convocada:' : 'Se ha convocado una nueva reunión de claustro:')}</p>
          <div style="background:#faf5ff;border:1px solid #e9d8fd;border-radius:8px;padding:16px;">
            <h3 style="margin:0 0 12px;color:#560797;font-size:17px;">${title}</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:5px 0;width:130px;"><strong>📆 Fecha</strong></td><td style="padding:5px 0;text-transform:capitalize;">${fecha}</td></tr>
              <tr><td style="padding:5px 0;"><strong>🕐 Hora</strong></td><td style="padding:5px 0;">${hora}</td></tr>
              <tr><td style="padding:5px 0;"><strong>📍 Lugar</strong></td><td style="padding:5px 0;">${location || 'Por determinar'}</td></tr>
              ${creatorName ? `<tr><td style="padding:5px 0;"><strong>👤 Convocada por</strong></td><td style="padding:5px 0;">${creatorName}</td></tr>` : ''}
            </table>
          </div>
          ${description ? `<div style="margin-top:16px;"><h3 style="color:#560797;font-size:15px;margin:0 0 6px;">📝 Descripción</h3><p style="margin:0;color:#333;font-size:14px;line-height:1.6;">${description}</p></div>` : ''}
          ${agendaHtml}
          <div style="margin-top:24px;text-align:center;">
            <a href="https://plataforma.mundoworld.school/admin/staff/meetings" style="display:inline-block;background:#560797;color:#fff;text-decoration:none;padding:10px 22px;border-radius:6px;font-size:14px;">Ver en la plataforma</a>
          </div>
          <p style="margin-top:24px;color:#8c8c8c;font-size:12px;">Mundo World School · Sistema de gestión del claustro</p>
        </div>
      </div>`;
  }

  /** Envía el email detallado de la reunión a cada asistente. */
  private async sendMeetingEmails(
    attendees: User[],
    meetingData: { title: string; scheduledDate: Date; location?: string; description?: string; creatorName?: string; agendaItems?: any[]; resourceId?: string },
    options: { isReminder?: boolean; statusMessage?: string; triggerEvent?: string } = {},
  ): Promise<void> {
    const { isReminder = false, statusMessage, triggerEvent } = options;
    const recipients = (attendees || []).filter((u) => u?.email && u.email.includes('@'));
    const subjectDate = new Date(meetingData.scheduledDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' });
    const subject = statusMessage
      ? `📢 Reunión de claustro "${meetingData.title}" ${statusMessage} (${subjectDate})`
      : isReminder
        ? `⏰ Recordatorio: reunión de claustro "${meetingData.title}" (${subjectDate})`
        : `📅 Nueva reunión de claustro: "${meetingData.title}" (${subjectDate})`;

    await Promise.allSettled(
      recipients.map((u) => {
        const recipientName = (u as any).profile
          ? `${(u as any).profile.firstName} ${(u as any).profile.lastName}`
          : (u.email.split('@')[0]);
        const html = this.buildMeetingEmailHtml({
          recipientName,
          title: meetingData.title,
          scheduledDate: meetingData.scheduledDate,
          location: meetingData.location,
          description: meetingData.description,
          creatorName: meetingData.creatorName,
          agendaItems: meetingData.agendaItems,
          isReminder,
          statusMessage,
        });
        return this.emailService.sendEmail({
          to: u.email,
          subject,
          htmlContent: html,
          textContent: `${subject}. Fecha: ${new Date(meetingData.scheduledDate).toLocaleString('es-ES')}. Lugar: ${meetingData.location || 'Por determinar'}.`,
          priority: EmailPriority.HIGH,
          userId: u.id,
          triggerEvent: triggerEvent || ((statusMessage || isReminder) ? 'staff_meeting_reminder' : 'staff_meeting_created'),
          triggerResourceId: meetingData.resourceId,
          triggerResourceType: 'staff_meeting',
        });
      }),
    );
  }

  /**
   * Recordatorio PREVIO (día antes) a los asistentes, con el orden del día.
   * triggerEvent propio para deduplicar de forma independiente.
   */
  async sendPreMeetingReminder(meeting: StaffMeeting): Promise<void> {
    const creatorName = (meeting.createdBy as any)?.profile
      ? `${(meeting.createdBy as any).profile.firstName} ${(meeting.createdBy as any).profile.lastName}`
      : 'Un administrador';
    await this.sendMeetingEmails(
      meeting.attendees || [],
      {
        title: meeting.title,
        scheduledDate: meeting.scheduledDate,
        location: meeting.location,
        description: meeting.description,
        creatorName,
        agendaItems: meeting.agendaItems,
        resourceId: meeting.id,
      },
      { isReminder: true, triggerEvent: 'staff_meeting_pre_reminder' },
    );
  }

  async create(dto: CreateStaffMeetingDto, userId: string): Promise<StaffMeeting> {
    // Verify attendees exist and are staff
    let attendees: User[] = [];
    if (dto.attendeeIds?.length) {
      attendees = await this.userRepository.find({
        where: {
          id: In(dto.attendeeIds),
          role: In([UserRole.ADMIN, UserRole.TEACHER]),
          isActive: true,
        },
        relations: ['profile'],
      });
    }

    // Create meeting
    const meeting = this.meetingRepository.create({
      title: dto.title,
      description: dto.description,
      scheduledDate: new Date(dto.scheduledDate),
      location: dto.location,
      createdById: userId,
      attendees,
    });

    const savedMeeting = await this.meetingRepository.save(meeting);

    // Create agenda items if provided
    if (dto.agendaItems?.length) {
      const agendaItems = dto.agendaItems.map((item, index) =>
        this.agendaRepository.create({
          ...item,
          orderIndex: item.orderIndex ?? index,
          meetingId: savedMeeting.id,
        }),
      );
      await this.agendaRepository.save(agendaItems);
    }

    // Notify attendees about the new meeting
    if (attendees.length > 0) {
      try {
        const creator = await this.userRepository.findOne({
          where: { id: userId },
          relations: ['profile'],
        });
        const creatorName = creator?.profile
          ? `${creator.profile.firstName} ${creator.profile.lastName}`
          : 'Un administrador';

        // Email detallado de reunión (con orden del día), en vez de la plantilla
        // genérica EVENT_REMINDER que dejaba campos sin rellenar.
        await this.sendMeetingEmails(attendees, {
          title: dto.title,
          scheduledDate: new Date(dto.scheduledDate),
          location: dto.location,
          description: dto.description,
          creatorName,
          agendaItems: dto.agendaItems || [],
          resourceId: savedMeeting.id,
        });
        this.logger.log(`Meeting email sent for "${dto.title}" to ${attendees.length} attendees`);
      } catch (error) {
        this.logger.error('Failed to send meeting creation notification:', error);
      }
    }

    return this.findOne(savedMeeting.id);
  }

  async findAll(filters: StaffMeetingFiltersDto) {
    const query = this.meetingRepository
      .createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.profile', 'creatorProfile')
      .leftJoinAndSelect('meeting.attendees', 'attendees')
      .leftJoinAndSelect('attendees.profile', 'attendeeProfile')
      .leftJoinAndSelect('meeting.agendaItems', 'agendaItems')
      .leftJoinAndSelect('meeting.tasks', 'tasks');

    // Apply filters. `status` (estado exacto) manda sobre la pestaña archived.
    if (filters.status) {
      query.andWhere('meeting.status = :status', { status: filters.status });
    } else {
      const statuses = resolveMeetingStatusFilter(filters.archived);
      if (statuses) {
        query.andWhere('meeting.status IN (:...statuses)', { statuses });
      }
    }

    // "Pendientes de cierre": activas cuyo inicio ya pasó (proxy SQL barato; el fin
    // derivado se afina después con getMeetingLiveState sobre la página devuelta).
    if (filters.pendingClose) {
      query
        .andWhere('meeting.status IN (:...pendingStatuses)', {
          pendingStatuses: [StaffMeetingStatus.SCHEDULED, StaffMeetingStatus.IN_PROGRESS],
        })
        .andWhere('meeting.scheduledDate < :nowPending', { nowPending: new Date() });
    }

    if (filters.createdById) {
      query.andWhere('meeting.createdById = :createdById', { createdById: filters.createdById });
    }

    if (filters.scheduledDateFrom) {
      query.andWhere('meeting.scheduledDate >= :scheduledDateFrom', { scheduledDateFrom: filters.scheduledDateFrom });
    }

    if (filters.scheduledDateTo) {
      query.andWhere('meeting.scheduledDate <= :scheduledDateTo', { scheduledDateTo: filters.scheduledDateTo });
    }

    if (filters.search) {
      const search = `%${filters.search}%`;
      const agendaSubQuery = query
        .subQuery()
        .select('agenda.meetingId')
        .from(StaffMeetingAgenda, 'agenda')
        .where('agenda.title ILIKE :search')
        .getQuery();
      query.andWhere(
        new Brackets((qb) => {
          qb.where('meeting.title ILIKE :search', { search })
            .orWhere('meeting.description ILIKE :search', { search })
            .orWhere('meeting.id IN ' + agendaSubQuery, { search });
        }),
      );
    }

    // Sorting
    const sortBy = filters.sortBy || 'scheduledDate';
    const sortOrder = filters.sortOrder || 'ASC';
    query.orderBy(`meeting.${sortBy}`, sortOrder as 'ASC' | 'DESC');

    // Sort agenda items by order
    query.addOrderBy('agendaItems.orderIndex', 'ASC');

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    query.skip((page - 1) * limit).take(limit);

    const [meetings, total] = await query.getManyAndCount();
    const now = new Date();
    let data = meetings.map((m) => attachLiveState(m, now));
    if (filters.pendingClose) {
      data = data.filter((m) => m.liveState === 'pending_close');
    }

    return {
      data,
      meta: {
        total: filters.pendingClose ? data.length : total,
        page,
        limit,
        totalPages: Math.ceil((filters.pendingClose ? data.length : total) / limit),
      },
    };
  }

  async findUpcoming(limit: number = 5) {
    // Ensure limit is a valid number (query params come as strings)
    const takeLimit = Math.min(Math.max(Number(limit) || 5, 1), 50);

    const meetings = await this.meetingRepository.find({
      where: {
        status: In([StaffMeetingStatus.SCHEDULED, StaffMeetingStatus.IN_PROGRESS]),
      },
      relations: [
        'createdBy',
        'createdBy.profile',
        'attendees',
        'attendees.profile',
        'agendaItems',
      ],
      order: { scheduledDate: 'ASC' },
      take: takeLimit,
    });

    const now = new Date();
    return meetings.map((m) => attachLiveState(m, now));
  }

  async findOne(id: string): Promise<StaffMeeting> {
    const meeting = await this.meetingRepository.findOne({
      where: { id },
      relations: [
        'createdBy',
        'createdBy.profile',
        'attendees',
        'attendees.profile',
        'agendaItems',
        'tasks',
        'tasks.createdBy',
        'tasks.createdBy.profile',
        'tasks.assignments',
        'tasks.assignments.assignedTo',
        'tasks.assignments.assignedTo.profile',
      ],
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting with ID ${id} not found`);
    }

    // Sort agenda items
    if (meeting.agendaItems) {
      meeting.agendaItems.sort((a, b) => a.orderIndex - b.orderIndex);
    }

    return attachLiveState(meeting);
  }

  async update(id: string, dto: UpdateStaffMeetingDto, userId: string): Promise<StaffMeeting> {
    const meeting = await this.findOne(id);

    // Check permission
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });
    if (meeting.createdById !== userId && user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the meeting creator or admin can update this meeting');
    }

    // Track changes for notifications
    const oldStatus = meeting.status;
    const oldAttendeeIds = meeting.attendees.map(a => a.id);

    // Update basic fields
    if (dto.title) meeting.title = dto.title;
    if (dto.description !== undefined) meeting.description = dto.description;
    if (dto.scheduledDate) meeting.scheduledDate = new Date(dto.scheduledDate);
    if (dto.location !== undefined) meeting.location = dto.location;
    // Reabrir (de archivada a activa) solo lo permite un admin.
    if (dto.status && statusChangeRequiresAdmin(oldStatus, dto.status) && user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo un administrador puede reabrir una reunión archivada');
    }
    if (dto.status) meeting.status = dto.status;
    if (dto.notes !== undefined) meeting.notes = dto.notes;

    // Update attendees if provided
    let newAttendees: User[] = [];
    if (dto.attendeeIds) {
      const attendees = await this.userRepository.find({
        where: {
          id: In(dto.attendeeIds),
          role: In([UserRole.ADMIN, UserRole.TEACHER]),
          isActive: true,
        },
      });
      meeting.attendees = attendees;
      // Find newly added attendees
      newAttendees = attendees.filter(a => !oldAttendeeIds.includes(a.id));
    }

    await this.meetingRepository.save(meeting);

    // Update agenda items if provided
    if (dto.agendaItems) {
      // Get existing agenda IDs
      const existingIds = meeting.agendaItems.map(a => a.id);
      const updatedIds = dto.agendaItems.filter(a => a.id).map(a => a.id);

      // Delete removed items
      const toDelete = existingIds.filter(id => !updatedIds.includes(id));
      if (toDelete.length) {
        await this.agendaRepository.delete({ id: In(toDelete) });
      }

      // Update or create items
      for (let i = 0; i < dto.agendaItems.length; i++) {
        const item = dto.agendaItems[i];
        if (item.id) {
          // Update existing
          await this.agendaRepository.update(item.id, {
            ...item,
            orderIndex: item.orderIndex ?? i,
          });
        } else {
          // Create new
          const newItem = this.agendaRepository.create({
            ...item,
            orderIndex: item.orderIndex ?? i,
            meetingId: id,
          });
          await this.agendaRepository.save(newItem);
        }
      }
    }

    // Send notifications for changes
    const updaterName = user?.profile
      ? `${user.profile.firstName} ${user.profile.lastName}`
      : 'Un administrador';

    try {
      // Notify new attendees about being added to the meeting (email detallado con agenda)
      if (newAttendees.length > 0) {
        const agendaItems = await this.agendaRepository.find({
          where: { meetingId: meeting.id },
          order: { orderIndex: 'ASC' },
        });
        await this.sendMeetingEmails(newAttendees, {
          title: meeting.title,
          scheduledDate: meeting.scheduledDate,
          location: meeting.location,
          description: meeting.description,
          creatorName: updaterName,
          agendaItems,
          resourceId: meeting.id,
        });
        this.logger.log(`Meeting email sent to ${newAttendees.length} new attendees for "${meeting.title}"`);
      }

      // Notify all attendees if status changed (cancelled, completed o iniciada)
      // Email detallado con orden del día (mismo formato que la convocatoria),
      // en vez de la plantilla genérica EVENT_REMINDER que dejaba campos vacíos.
      if (dto.status && dto.status !== oldStatus) {
        const allAttendeeIds = meeting.attendees.map(a => a.id).filter(aid => aid !== userId);
        if (allAttendeeIds.length > 0) {
          const statusMessages: Record<string, string> = {
            cancelled: 'cancelada',
            completed: 'completada',
            in_progress: 'iniciada',
          };
          const statusMessage = statusMessages[dto.status] || dto.status;

          const recipients = await this.userRepository.find({
            where: { id: In(allAttendeeIds) },
            relations: ['profile'],
          });
          const agendaItems = await this.agendaRepository.find({
            where: { meetingId: meeting.id },
            order: { orderIndex: 'ASC' },
          });
          await this.sendMeetingEmails(recipients, {
            title: meeting.title,
            scheduledDate: meeting.scheduledDate,
            location: meeting.location,
            description: meeting.description,
            creatorName: updaterName,
            agendaItems,
            resourceId: meeting.id,
          }, { statusMessage });
          this.logger.log(`Status change notification sent for meeting "${meeting.title}" - Status: ${dto.status}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to send meeting update notification:', error);
    }

    return this.findOne(id);
  }

  async updateNotes(id: string, dto: UpdateMeetingNotesDto, userId: string): Promise<StaffMeeting> {
    const meeting = await this.findOne(id);

    // Any attendee or creator can update notes
    const isAttendee = meeting.attendees.some(a => a.id === userId);
    const isCreator = meeting.createdById === userId;

    if (!isAttendee && !isCreator) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user?.role !== UserRole.ADMIN) {
        throw new ForbiddenException('Only meeting participants or admin can update notes');
      }
    }

    meeting.notes = dto.notes;
    await this.meetingRepository.save(meeting);

    return this.findOne(id);
  }

  async addAgendaItem(meetingId: string, dto: CreateAgendaItemDto, userId: string): Promise<StaffMeetingAgenda> {
    const meeting = await this.findOne(meetingId);

    // Get next order index
    const maxOrder = meeting.agendaItems.reduce((max, item) => Math.max(max, item.orderIndex), -1);

    const agendaItem = this.agendaRepository.create({
      ...dto,
      orderIndex: dto.orderIndex ?? maxOrder + 1,
      meetingId,
    });

    return this.agendaRepository.save(agendaItem);
  }

  async updateAgendaItem(
    meetingId: string,
    agendaId: string,
    dto: UpdateAgendaItemDto,
    userId: string,
  ): Promise<StaffMeetingAgenda> {
    const meeting = await this.findOne(meetingId);
    const agendaItem = meeting.agendaItems.find(a => a.id === agendaId);

    if (!agendaItem) {
      throw new NotFoundException(`Agenda item with ID ${agendaId} not found`);
    }

    Object.assign(agendaItem, dto);
    return this.agendaRepository.save(agendaItem);
  }

  async reorderAgendaItems(
    meetingId: string,
    orderedIds: string[],
    userId: string,
  ): Promise<StaffMeeting> {
    const meeting = await this.findOne(meetingId);
    const updates = buildAgendaReorder(meeting.agendaItems.map((a) => a.id), orderedIds);
    if (!updates) {
      throw new BadRequestException('Los puntos enviados no coinciden con los de la reunión');
    }
    await Promise.all(updates.map((u) => this.agendaRepository.update(u.id, { orderIndex: u.orderIndex })));
    return this.findOne(meetingId);
  }

  async deleteAgendaItem(
    meetingId: string,
    agendaId: string,
    userId: string,
  ): Promise<void> {
    const meeting = await this.findOne(meetingId);

    // Check permission - only creator or admin can delete agenda items
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (meeting.createdById !== userId && user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the meeting creator or admin can delete agenda items');
    }

    const agendaItem = meeting.agendaItems.find(a => a.id === agendaId);
    if (!agendaItem) {
      throw new NotFoundException(`Agenda item with ID ${agendaId} not found`);
    }

    await this.agendaRepository.remove(agendaItem);
  }

  async delete(id: string, userId: string): Promise<void> {
    const meeting = await this.findOne(id);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (meeting.createdById !== userId && user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the meeting creator or admin can delete this meeting');
    }

    await this.meetingRepository.remove(meeting);
  }

  async getStats() {
    const now = new Date();

    const [total, upcoming, scheduled, completed, cancelled, activeMeetings] = await Promise.all([
      this.meetingRepository.count(),
      this.meetingRepository.count({
        where: {
          scheduledDate: MoreThanOrEqual(now),
          status: In([StaffMeetingStatus.SCHEDULED, StaffMeetingStatus.IN_PROGRESS]),
        },
      }),
      this.meetingRepository.count({
        where: { status: In([StaffMeetingStatus.SCHEDULED, StaffMeetingStatus.IN_PROGRESS]) },
      }),
      this.meetingRepository.count({ where: { status: StaffMeetingStatus.COMPLETED } }),
      this.meetingRepository.count({ where: { status: StaffMeetingStatus.CANCELLED } }),
      // Conjunto activo (pequeño) para calcular estados en vivo con el orden del día.
      this.meetingRepository.find({
        where: { status: In([StaffMeetingStatus.SCHEDULED, StaffMeetingStatus.IN_PROGRESS]) },
        relations: ['agendaItems'],
      }),
    ]);

    let inProgress = 0;
    let pendingClose = 0;
    for (const m of activeMeetings) {
      const live = getMeetingLiveState(m, now);
      if (live === 'in_progress') inProgress++;
      else if (live === 'pending_close') pendingClose++;
    }

    return {
      total,
      upcoming,
      scheduled,
      completed,
      cancelled,
      inProgress,
      pendingClose,
    };
  }
}
