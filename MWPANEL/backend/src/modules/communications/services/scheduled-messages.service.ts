import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduledMessage, ScheduledMessageStatus, ScheduledTargetType } from '../entities/scheduled-message.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { CommunicationsService } from '../communications.service';

interface CreateScheduledDto {
  subject?: string;
  content: string;
  contentType?: string;
  priority?: string;
  targetType: ScheduledTargetType;
  recipientId?: string;
  classGroupIds?: string[];
  scheduledFor: string; // ISO
}

@Injectable()
export class ScheduledMessagesService {
  private readonly logger = new Logger(ScheduledMessagesService.name);

  constructor(
    @InjectRepository(ScheduledMessage)
    private scheduledRepository: Repository<ScheduledMessage>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private communicationsService: CommunicationsService,
  ) {}

  /** Crea un envío programado (estilo Gmail). */
  async create(senderId: string, senderRole: UserRole, dto: CreateScheduledDto): Promise<ScheduledMessage> {
    if (!dto.content || dto.content.trim() === '') {
      throw new BadRequestException('El mensaje no puede estar vacío');
    }
    const scheduledFor = new Date(dto.scheduledFor);
    if (isNaN(scheduledFor.getTime())) {
      throw new BadRequestException('Fecha/hora de programación no válida');
    }
    if (scheduledFor.getTime() < Date.now() - 60 * 1000) {
      throw new BadRequestException('La fecha/hora debe ser futura');
    }

    // Validaciones por tipo de destinatario
    if (dto.targetType === ScheduledTargetType.INDIVIDUAL && !dto.recipientId) {
      throw new BadRequestException('Falta el destinatario');
    }
    if (dto.targetType === ScheduledTargetType.GROUPS && (!dto.classGroupIds || dto.classGroupIds.length === 0)) {
      throw new BadRequestException('Selecciona al menos un grupo');
    }
    // Solo admin puede enviar a TODOS
    if (dto.targetType === ScheduledTargetType.ALL && senderRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo los administradores pueden programar envíos a todos los usuarios');
    }

    const scheduled = this.scheduledRepository.create({
      senderId,
      subject: dto.subject || 'Mensaje',
      content: dto.content,
      contentType: dto.contentType || 'html',
      priority: dto.priority || 'normal',
      targetType: dto.targetType,
      recipientId: dto.targetType === ScheduledTargetType.INDIVIDUAL ? dto.recipientId : null,
      classGroupIds: dto.targetType === ScheduledTargetType.GROUPS ? dto.classGroupIds : null,
      scheduledFor,
      status: ScheduledMessageStatus.PENDING,
    });

    return this.scheduledRepository.save(scheduled);
  }

  /** Lista los envíos programados del usuario (pendientes y recientes). */
  async listForUser(senderId: string): Promise<ScheduledMessage[]> {
    return this.scheduledRepository.find({
      where: { senderId },
      order: { scheduledFor: 'ASC' },
      take: 100,
    });
  }

  /** Cancela un envío programado pendiente (solo su autor o admin). */
  async cancel(id: string, userId: string, userRole: UserRole): Promise<ScheduledMessage> {
    const scheduled = await this.scheduledRepository.findOne({ where: { id } });
    if (!scheduled) {
      throw new NotFoundException('Envío programado no encontrado');
    }
    if (scheduled.senderId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No puedes cancelar este envío');
    }
    if (scheduled.status !== ScheduledMessageStatus.PENDING) {
      throw new BadRequestException('Solo se pueden cancelar envíos pendientes');
    }
    scheduled.status = ScheduledMessageStatus.CANCELLED;
    return this.scheduledRepository.save(scheduled);
  }

  /**
   * Edita un envío programado PENDIENTE (solo su autor o admin).
   * Permite cambiar el contenido, asunto, prioridad, fecha/hora y los destinatarios.
   * Si es un mensaje masivo (groups/all), la edición se aplica a todos por igual,
   * porque el envío es una única entrada que se expande al despacharse.
   */
  async update(
    id: string,
    userId: string,
    userRole: UserRole,
    dto: Partial<CreateScheduledDto>,
  ): Promise<ScheduledMessage> {
    const scheduled = await this.scheduledRepository.findOne({ where: { id } });
    if (!scheduled) {
      throw new NotFoundException('Envío programado no encontrado');
    }
    if (scheduled.senderId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No puedes editar este envío');
    }
    if (scheduled.status !== ScheduledMessageStatus.PENDING) {
      throw new BadRequestException('Solo se pueden editar envíos pendientes');
    }

    if (dto.content !== undefined) {
      if (!dto.content || dto.content.trim() === '') {
        throw new BadRequestException('El mensaje no puede estar vacío');
      }
      scheduled.content = dto.content;
    }
    if (dto.subject !== undefined) scheduled.subject = dto.subject || 'Mensaje';
    if (dto.contentType !== undefined) scheduled.contentType = dto.contentType || 'html';
    if (dto.priority !== undefined) scheduled.priority = dto.priority || 'normal';

    if (dto.scheduledFor !== undefined) {
      const when = new Date(dto.scheduledFor);
      if (isNaN(when.getTime())) {
        throw new BadRequestException('Fecha/hora de programación no válida');
      }
      if (when.getTime() < Date.now() - 60 * 1000) {
        throw new BadRequestException('La fecha/hora debe ser futura');
      }
      scheduled.scheduledFor = when;
    }

    // Cambio de destinatarios (incluye el caso masivo)
    if (dto.targetType !== undefined) {
      if (dto.targetType === ScheduledTargetType.INDIVIDUAL && !dto.recipientId) {
        throw new BadRequestException('Falta el destinatario');
      }
      if (dto.targetType === ScheduledTargetType.GROUPS && (!dto.classGroupIds || dto.classGroupIds.length === 0)) {
        throw new BadRequestException('Selecciona al menos un grupo');
      }
      if (dto.targetType === ScheduledTargetType.ALL && userRole !== UserRole.ADMIN) {
        throw new ForbiddenException('Solo los administradores pueden programar envíos a todos los usuarios');
      }
      scheduled.targetType = dto.targetType;
      scheduled.recipientId = dto.targetType === ScheduledTargetType.INDIVIDUAL ? dto.recipientId : null;
      scheduled.classGroupIds = dto.targetType === ScheduledTargetType.GROUPS ? dto.classGroupIds : null;
    }

    return this.scheduledRepository.save(scheduled);
  }

  /**
   * Elimina definitivamente un envío programado que ya NO está pendiente
   * (cancelado, enviado o con error). Los pendientes hay que cancelarlos antes.
   */
  async remove(id: string, userId: string, userRole: UserRole): Promise<{ ok: boolean }> {
    const scheduled = await this.scheduledRepository.findOne({ where: { id } });
    if (!scheduled) {
      throw new NotFoundException('Envío programado no encontrado');
    }
    if (scheduled.senderId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No puedes eliminar este envío');
    }
    if (scheduled.status === ScheduledMessageStatus.PENDING) {
      throw new BadRequestException('Cancela primero el envío pendiente antes de eliminarlo');
    }
    await this.scheduledRepository.delete(id);
    return { ok: true };
  }

  /** Resuelve los IDs de destinatarios según el tipo. */
  private async resolveRecipientIds(scheduled: ScheduledMessage): Promise<string[]> {
    if (scheduled.targetType === ScheduledTargetType.INDIVIDUAL) {
      return scheduled.recipientId ? [scheduled.recipientId] : [];
    }
    if (scheduled.targetType === ScheduledTargetType.GROUPS) {
      const parents = await this.communicationsService.getParentsByClassGroups(scheduled.classGroupIds || []);
      return parents.map((p: any) => p.id).filter(Boolean);
    }
    // ALL: todos los usuarios activos excepto el emisor
    const users = await this.userRepository.find({
      where: { isActive: true },
      select: ['id'],
    });
    return users.map((u) => u.id).filter((id) => id !== scheduled.senderId);
  }

  /**
   * CRON: cada minuto despacha los envíos programados cuyo momento ya llegó.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchDueMessages(): Promise<void> {
    const due = await this.scheduledRepository.find({
      where: {
        status: ScheduledMessageStatus.PENDING,
        scheduledFor: LessThanOrEqual(new Date()),
      },
      take: 20,
    });

    if (due.length === 0) return;
    this.logger.log(`📨 Despachando ${due.length} mensaje(s) programado(s)`);

    for (const scheduled of due) {
      try {
        const recipientIds = await this.resolveRecipientIds(scheduled);
        if (recipientIds.length === 0) {
          scheduled.status = ScheduledMessageStatus.FAILED;
          scheduled.error = 'No se encontraron destinatarios';
          await this.scheduledRepository.save(scheduled);
          continue;
        }

        // Reutiliza la creación normal de mensajes (crea mensaje interno + envía email)
        await this.communicationsService.createMessage(scheduled.senderId, {
          subject: scheduled.subject,
          content: scheduled.content,
          contentType: scheduled.contentType,
          priority: scheduled.priority as any,
          type: 'direct' as any,
          recipientIds,
        } as any);

        scheduled.status = ScheduledMessageStatus.SENT;
        scheduled.sentAt = new Date();
        scheduled.recipientsCount = recipientIds.length;
        await this.scheduledRepository.save(scheduled);
        this.logger.log(`✅ Mensaje programado ${scheduled.id} enviado a ${recipientIds.length} destinatario(s)`);
      } catch (error) {
        this.logger.error(`❌ Error enviando mensaje programado ${scheduled.id}: ${error.message}`);
        scheduled.status = ScheduledMessageStatus.FAILED;
        scheduled.error = error.message?.substring(0, 500);
        await this.scheduledRepository.save(scheduled);
      }
    }
  }
}
