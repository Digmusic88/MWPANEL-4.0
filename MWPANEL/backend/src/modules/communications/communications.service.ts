import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { Message, MessageType, MessageStatus } from './entities/message.entity';
import { Notification, NotificationType, NotificationStatus } from './entities/notification.entity';
import { Conversation, ConversationType } from './entities/conversation.entity';
import { MessageAttachment } from './entities/message-attachment.entity';
import { MessageDeletion } from './entities/message-deletion.entity';
import { MessageGroup } from './entities/message-group.entity';
import { MessageGroupMember } from './entities/message-group-member.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { Student } from '../students/entities/student.entity';
import { Family, FamilyStudent } from '../users/entities/family.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { EmailService } from './services/email.service';
import { EmailTemplateType } from './entities/email-template.entity';
import { CommunicationConfigService } from './services/communication-config.service';
import { UnreadCounterService } from './services/unread-counter.service';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { TeacherAccessService } from '../../common/teacher-access/teacher-access.service';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { GoogleDriveService } from '../educational-resources/services/google-drive.service';

@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);

  // Direct Resend integration (following working pattern from grade-notifications.service.ts)
  private resend: Resend;
  private readonly fromEmail = 'no-reply@mundoworld.school';
  private readonly fromName = 'Mundo World School';

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(MessageAttachment)
    private readonly attachmentRepository: Repository<MessageAttachment>,
    @InjectRepository(MessageDeletion)
    private readonly messageDeletionRepository: Repository<MessageDeletion>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ClassGroup)
    private readonly classGroupRepository: Repository<ClassGroup>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Family)
    private readonly familyRepository: Repository<Family>,
    @InjectRepository(FamilyStudent)
    private readonly familyStudentRepository: Repository<FamilyStudent>,
    @InjectRepository(SubjectAssignment)
    private readonly subjectAssignmentRepository: Repository<SubjectAssignment>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(MessageGroup)
    private readonly messageGroupRepository: Repository<MessageGroup>,
    @InjectRepository(MessageGroupMember)
    private readonly messageGroupMemberRepository: Repository<MessageGroupMember>,
    private readonly emailService: EmailService,
    private configService: ConfigService,
    private readonly communicationConfigService: CommunicationConfigService,
    private readonly unreadCounterService: UnreadCounterService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly teacherAccess: TeacherAccessService,
    @Optional() private readonly googleDriveService?: GoogleDriveService,
  ) {
    // Initialize Resend directly (following working pattern from grade-notifications.service.ts)
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
      this.logger.log('✅ Resend initialized for CommunicationsService');
    } else {
      this.logger.warn('⚠️ RESEND_API_KEY not found');
    }
  }

  // ==================== MESSAGES ====================

  async createMessage(senderId: string, createMessageDto: CreateMessageDto): Promise<Message> {
    // DEBUG: Log incoming DTO to check isDraft value
    this.logger.log(`🔍 DEBUG createMessage - isDraft value: ${createMessageDto.isDraft}, type: ${typeof createMessageDto.isDraft}`);
    this.logger.log(`🔍 DEBUG createMessage - Full DTO: ${JSON.stringify(createMessageDto)}`);

    const { recipientId, recipientIds, targetGroupId, messageGroupId, relatedStudentId, parentMessageId, ...messageData } = createMessageDto;

    // RGPD: estudiantes y familias solo pueden escribir a su lista de contactos
    // permitidos (misma lista canónica que alimenta su desplegable de destinatarios:
    // profesores que les dan clase en el curso activo, tutores y administración).
    // Tampoco pueden enviar mensajes de grupo/difusión (capacidad de profesorado/admin).
    const aclSender = await this.userRepository.findOne({ where: { id: senderId } });
    if (aclSender && (aclSender.role === UserRole.STUDENT || aclSender.role === UserRole.FAMILY)) {
      if (targetGroupId || messageGroupId) {
        throw new ForbiddenException('No tienes permiso para enviar mensajes de grupo o difusión.');
      }
      const targets = [
        ...(recipientId ? [recipientId] : []),
        ...(recipientIds || []),
      ].filter(id => id && id !== senderId);
      if (targets.length > 0) {
        const allowed = await this.getAvailableRecipients(senderId);
        const allowedIds = new Set(allowed.map(r => r.id));
        const blocked = targets.find(id => !allowedIds.has(id));
        if (blocked) {
          throw new ForbiddenException(
            'No tienes permiso para contactar con este usuario. Solo puedes escribir a los profesores con los que tienes clase, tus tutores y a administración.'
          );
        }
      }
    }

    // Si se especifica un grupo de difusión, obtener sus miembros
    if (messageGroupId) {
      const group = await this.messageGroupRepository.findOne({
        where: { id: messageGroupId, isActive: true },
        relations: ['members', 'members.user']
      });

      if (!group) {
        throw new NotFoundException('Grupo de difusión no encontrado');
      }

      const groupMemberIds = group.members
        .filter(member => member.isActive && member.userId !== senderId) // Excluir al emisor del grupo
        .map(member => member.userId);

      if (groupMemberIds.length === 0) {
        throw new BadRequestException('El grupo no tiene miembros activos (o solo contiene al emisor)');
      }

      // Crear mensaje para todos los miembros del grupo con delay (excepto el emisor)
      return this.createMultipleMessagesWithDelay(senderId, {
        ...createMessageDto,
        recipientIds: groupMemberIds,
        messageGroupId: undefined // No pasar el groupId en la recursión
      });
    }

    // Si hay múltiples destinatarios, crear múltiples mensajes
    if (recipientIds && recipientIds.length > 0) {
      return this.createMultipleMessagesWithDelay(senderId, createMessageDto);
    }

    // Verificar que el remitente existe
    const sender = await this.userRepository.findOne({ where: { id: senderId } });
    if (!sender) {
      throw new NotFoundException('Remitente no encontrado');
    }

    // Validar destinatario para mensajes directos
    let recipient = null;
    if (recipientId) {
      recipient = await this.userRepository.findOne({ where: { id: recipientId } });
      if (!recipient) {
        throw new NotFoundException('Destinatario no encontrado');
      }
    }

    // Validar grupo destinatario para mensajes grupales
    let targetGroup = null;
    if (targetGroupId) {
      targetGroup = await this.classGroupRepository.findOne({
        where: { id: targetGroupId },
        relations: ['students', 'students.user', 'tutor', 'tutor.user'],
      });
      if (!targetGroup) {
        throw new NotFoundException('Grupo destinatario no encontrado');
      }
    }

    // Validar estudiante relacionado
    let relatedStudent = null;
    if (relatedStudentId) {
      relatedStudent = await this.studentRepository.findOne({
        where: { id: relatedStudentId },
        relations: ['user'],
      });
      if (!relatedStudent) {
        throw new NotFoundException('Estudiante relacionado no encontrado');
      }
    }

    // Validar mensaje padre
    let parentMessage = null;
    if (parentMessageId) {
      parentMessage = await this.messageRepository.findOne({
        where: { id: parentMessageId },
      });
      if (!parentMessage) {
        throw new NotFoundException('Mensaje padre no encontrado');
      }
    }

    // Validar permisos de envío
    await this.validateSendPermissions(sender, recipient, targetGroup, relatedStudent);

    // Crear el mensaje
    const message = this.messageRepository.create({
      ...messageData,
      contentType: createMessageDto.contentType || 'html', // Por defecto HTML para el editor
      isDraft: createMessageDto.isDraft || false, // Soporte para borradores
      status: createMessageDto.isDraft ? MessageStatus.DRAFT : MessageStatus.SENT, // Status según si es borrador
      sender,
      senderId,
      recipient,
      recipientId,
      targetGroup,
      targetGroupId,
      relatedStudent,
      relatedStudentId,
      parentMessage,
      parentMessageId,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Si es un borrador, no crear notificaciones ni enviar emails
    if (createMessageDto.isDraft) {
      this.logger.log(`📝 Draft saved with id ${savedMessage.id}`);
      return this.findOneMessage(savedMessage.id);
    }

    // Cargar el mensaje con las relaciones necesarias para las notificaciones
    const messageWithRelations = await this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['sender', 'sender.profile', 'recipient', 'targetGroup']
    });

    // Crear notificaciones para los destinatarios
    this.logger.log(`📬 Creating notifications for message ${messageWithRelations.id}`);
    await this.createMessageNotifications(messageWithRelations);

    return this.findOneMessage(savedMessage.id);
  }

  async createMultipleMessagesWithDelay(senderId: string, createMessageDto: CreateMessageDto): Promise<Message> {
    const { recipientIds: rawRecipientIds, ...restDto } = createMessageDto;

    if (!rawRecipientIds || rawRecipientIds.length === 0) {
      throw new BadRequestException('No se proporcionaron destinatarios');
    }

    // Excluir al emisor de la lista de destinatarios para evitar auto-notificaciones
    const recipientIds = rawRecipientIds.filter(id => id !== senderId);

    if (recipientIds.length === 0) {
      throw new BadRequestException('No se proporcionaron destinatarios válidos (el emisor no puede ser destinatario)');
    }

    // Validar que todos los destinatarios existen
    const recipients = await this.userRepository.find({
      where: { id: In(recipientIds) },
      relations: ['profile']
    });

    if (recipients.length !== recipientIds.length) {
      throw new NotFoundException('Uno o más destinatarios no fueron encontrados');
    }

    const messages: Message[] = [];
    const DELAY_BETWEEN_MESSAGES = 2000; // 2 segundos entre mensajes
    const DELAY_BETWEEN_EMAILS = 5000;   // 5 segundos entre emails

    this.logger.log(`Iniciando envío masivo a ${recipientIds.length} destinatarios con delay`);

    // Crear mensajes con delay para evitar spam
    for (let i = 0; i < recipientIds.length; i++) {
      const recipientId = recipientIds[i];
      const recipient = recipients.find(r => r.id === recipientId);

      try {
        // Aplicar delay entre mensajes (excepto el primero)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES));
        }

        const singleMessageDto = {
          ...restDto,
          recipientId
        };

        // Crear el mensaje individual
        const message = await this.createSingleMessage(senderId, singleMessageDto);
        messages.push(message);

        this.logger.log(`Mensaje ${i + 1}/${recipientIds.length} enviado a ${recipient?.profile?.firstName || 'Usuario'}`);

        // NOTA: el email de notificación ya lo envía createSingleMessage() (vía
        // createMessageNotifications → sendMessageNotificationEmail). Antes aquí se
        // enviaba un SEGUNDO email ("📨 Nuevo Mensaje Recibido") que provocaba correos
        // duplicados en envíos masivos/programados. Eliminado para enviar solo uno.

      } catch (error) {
        this.logger.error(`Error creando mensaje para destinatario ${recipientId}: ${error.message}`);
        // Continuar con los siguientes destinatarios
      }
    }

    this.logger.log(`Envío masivo completado: ${messages.length}/${recipientIds.length} mensajes enviados`);

    // Retornar el primer mensaje creado (para compatibilidad con la interfaz existente)
    return messages[0] || null;
  }

  async createMultipleMessages(senderId: string, createMessageDto: CreateMessageDto): Promise<Message> {
    const { recipientIds: rawRecipientIds, ...restDto } = createMessageDto;

    if (!rawRecipientIds || rawRecipientIds.length === 0) {
      throw new BadRequestException('No se proporcionaron destinatarios');
    }

    // Excluir al emisor de la lista de destinatarios
    const recipientIds = rawRecipientIds.filter(id => id !== senderId);

    if (recipientIds.length === 0) {
      throw new BadRequestException('No se proporcionaron destinatarios válidos');
    }

    // Validar que todos los destinatarios existen
    const recipients = await this.userRepository.find({
      where: { id: In(recipientIds) }
    });

    if (recipients.length !== recipientIds.length) {
      throw new NotFoundException('Uno o más destinatarios no fueron encontrados');
    }

    // Crear un mensaje para cada destinatario
    const messages: Message[] = [];
    for (const recipientId of recipientIds) {
      const singleMessageDto = {
        ...restDto,
        recipientId
      };

      // Llamar al método original para crear cada mensaje individual
      const message = await this.createSingleMessage(senderId, singleMessageDto);
      messages.push(message);
    }

    // Retornar el primer mensaje creado (para compatibilidad con la interfaz existente)
    return messages[0];
  }

  async createSingleMessage(senderId: string, createMessageDto: Omit<CreateMessageDto, 'recipientIds'>): Promise<Message> {
    const { recipientId, targetGroupId, relatedStudentId, parentMessageId, ...messageData } = createMessageDto;

    // Verificar que el remitente existe
    const sender = await this.userRepository.findOne({ where: { id: senderId } });
    if (!sender) {
      throw new NotFoundException('Remitente no encontrado');
    }

    // Validar destinatario para mensajes directos
    let recipient = null;
    if (recipientId) {
      recipient = await this.userRepository.findOne({ where: { id: recipientId } });
      if (!recipient) {
        throw new NotFoundException('Destinatario no encontrado');
      }
    }

    // Validar grupo destinatario para mensajes grupales
    let targetGroup = null;
    if (targetGroupId) {
      targetGroup = await this.classGroupRepository.findOne({
        where: { id: targetGroupId },
        relations: ['students', 'students.user', 'tutor', 'tutor.user'],
      });
      if (!targetGroup) {
        throw new NotFoundException('Grupo destinatario no encontrado');
      }
    }

    // Validar estudiante relacionado
    let relatedStudent = null;
    if (relatedStudentId) {
      relatedStudent = await this.studentRepository.findOne({
        where: { id: relatedStudentId },
        relations: ['user'],
      });
      if (!relatedStudent) {
        throw new NotFoundException('Estudiante relacionado no encontrado');
      }
    }

    // Validar mensaje padre
    let parentMessage = null;
    if (parentMessageId) {
      parentMessage = await this.messageRepository.findOne({
        where: { id: parentMessageId },
      });
      if (!parentMessage) {
        throw new NotFoundException('Mensaje padre no encontrado');
      }
    }

    // Validar permisos de envío
    await this.validateSendPermissions(sender, recipient, targetGroup, relatedStudent);

    // Crear el mensaje
    const isDraft = createMessageDto.isDraft || false;
    const message = this.messageRepository.create({
      ...messageData,
      contentType: createMessageDto.contentType || 'html',
      isDraft: isDraft,
      status: isDraft ? MessageStatus.DRAFT : MessageStatus.SENT,
      sender,
      senderId,
      recipient,
      recipientId,
      targetGroup,
      targetGroupId,
      relatedStudent,
      relatedStudentId,
      parentMessage,
      parentMessageId,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Si es un borrador, no crear notificaciones ni enviar emails
    if (isDraft) {
      this.logger.log(`📝 Draft saved with id ${savedMessage.id} (via createSingleMessage)`);
      return this.findOneMessage(savedMessage.id);
    }

    // Cargar relaciones para notificaciones
    const messageWithRelations = await this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: [
        'sender',
        'recipient',
        'targetGroup',
        'targetGroup.students',
        'targetGroup.students.user',
        'relatedStudent',
        'relatedStudent.user',
        'parentMessage',
      ],
    });

    // Crear notificaciones (solo para mensajes NO borradores)
    await this.createMessageNotifications(messageWithRelations);

    return this.findOneMessage(savedMessage.id);
  }

  async findAllMessages(userId: string, filters?: any): Promise<Message[] | { data: Message[]; total: number; page: number; limit: number; hasMore: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    let queryBuilder = this.messageRepository.createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('sender.profile', 'senderProfile')
      .leftJoinAndSelect('message.recipient', 'recipient')
      .leftJoinAndSelect('recipient.profile', 'recipientProfile')
      .leftJoinAndSelect('message.targetGroup', 'targetGroup')
      .leftJoinAndSelect('message.relatedStudent', 'relatedStudent')
      .leftJoinAndSelect('relatedStudent.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .leftJoinAndSelect('message.parentMessage', 'parentMessage')
      .leftJoinAndSelect('message.attachments', 'attachments')
      .where('message.isDeleted = :isDeleted', { isDeleted: false })
      // Los borradores NUNCA se muestran como mensajes del hilo (ni siquiera a su autor):
      // se gestionan aparte (se restauran en el editor y se listan como "Borrador").
      .andWhere('message.isDraft = false');

    // Filtrar mensajes eliminados por el usuario actual usando la tabla de eliminaciones
    if (user.role !== UserRole.ADMIN) {
      queryBuilder.andWhere(`
        NOT EXISTS (
          SELECT 1 FROM message_deletions md 
          WHERE md."messageId" = message.id AND md."userId" = :userId
        )
      `, { userId });
    }

    // Filtros por rol del usuario
    if (user.role === UserRole.TEACHER) {
      // Para profesores: obtener primero los grupos donde es tutor
      const teacherGroups = await this.classGroupRepository.find({
        where: { tutor: { user: { id: userId } } },
        select: ['id'],
        relations: ['tutor', 'tutor.user']
      });
      const groupIds = teacherGroups.map(g => g.id);
      
      if (groupIds.length > 0) {
        queryBuilder.andWhere(
          '(message.senderId = :userId OR message.recipientId = :userId OR message.targetGroupId IN (:...groupIds))',
          { userId, groupIds }
        );
      } else {
        queryBuilder.andWhere(
          '(message.senderId = :userId OR message.recipientId = :userId)',
          { userId }
        );
      }
    } else if (user.role === UserRole.FAMILY) {
      queryBuilder.andWhere(
        '(message.senderId = :userId OR message.recipientId = :userId)',
        { userId }
      );
    } else if (user.role === UserRole.STUDENT) {
      // SEGURIDAD CRÍTICA: Estudiantes solo pueden ver mensajes donde sean emisor o receptor directo
      queryBuilder.andWhere(
        '(message.senderId = :userId OR message.recipientId = :userId)',
        { userId }
      );
    } else if (user.role === UserRole.ADMIN) {
      // Admin puede ver todos los mensajes
    }

    // Aplicar filtros adicionales si se proporcionan
    if (filters?.type) {
      queryBuilder.andWhere('message.type = :type', { type: filters.type });
    }

    if (filters?.priority) {
      queryBuilder.andWhere('message.priority = :priority', { priority: filters.priority });
    }

    if (filters?.isRead !== undefined) {
      const isReadBool = filters.isRead === true || filters.isRead === 'true';
      if (!isReadBool) {
        // Bug #1 fix: "no leídos" solo aplica a mensajes RECIBIDOS por el usuario,
        // nunca a mensajes enviados por él (aunque el destinatario no los haya leído aún).
        queryBuilder.andWhere('message.isRead = :isRead AND message.recipientId = :userIdUnread', {
          isRead: false,
          userIdUnread: userId,
        });
      } else {
        queryBuilder.andWhere('message.isRead = :isRead', { isRead: true });
      }
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(message.subject ILIKE :search OR message.content ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    // partnerId: restringe el resultado al hilo 1:1 entre el usuario actual y el partner.
    // Útil para abrir una conversación concreta y poder paginar/buscar sólo sus mensajes.
    if (filters?.partnerId) {
      queryBuilder.andWhere(
        '((message.senderId = :userIdThread AND message.recipientId = :partnerId) OR (message.senderId = :partnerId AND message.recipientId = :userIdThread))',
        { userIdThread: userId, partnerId: filters.partnerId },
      );
    }

    queryBuilder.orderBy('message.createdAt', 'DESC');

    const limitRaw = filters?.limit !== undefined ? parseInt(filters.limit, 10) : undefined;
    const pageRaw = filters?.page !== undefined ? parseInt(filters.page, 10) : undefined;

    // Compat path: no `page` => return flat array (optionally truncated by `limit`).
    if (pageRaw === undefined || Number.isNaN(pageRaw)) {
      if (limitRaw !== undefined && !Number.isNaN(limitRaw) && limitRaw > 0) {
        return queryBuilder.take(Math.min(limitRaw, 100)).getMany();
      }
      return queryBuilder.getMany();
    }

    // Paginated path
    const page = Math.max(1, pageRaw);
    const limit = Math.min(100, Math.max(1, (limitRaw !== undefined && !Number.isNaN(limitRaw)) ? limitRaw : 25));
    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    } as any;
  }

  /**
   * Obtener mensajes para el panel de administración
   * @param adminId - ID del usuario admin
   * @param filters - Filtros incluyendo mode: 'direct' | 'supervision'
   * - mode='direct': Mensajes donde el admin es emisor o destinatario directo
   * - mode='supervision': Todos los mensajes de la plataforma (para supervisión)
   */
  async findAdminMessages(adminId: string, filters?: any): Promise<{ messages: Message[]; stats: any; total: number; page: number; limit: number; hasMore: boolean }> {
    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Acceso denegado: Solo administradores');
    }

    const mode = filters?.mode || 'direct';

    let queryBuilder = this.messageRepository.createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('sender.profile', 'senderProfile')
      .leftJoinAndSelect('message.recipient', 'recipient')
      .leftJoinAndSelect('recipient.profile', 'recipientProfile')
      .leftJoinAndSelect('message.targetGroup', 'targetGroup')
      .leftJoinAndSelect('message.relatedStudent', 'relatedStudent')
      .leftJoinAndSelect('relatedStudent.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .leftJoinAndSelect('message.attachments', 'attachments')
      .where('message.isDeleted = :isDeleted', { isDeleted: false });

    if (mode === 'direct') {
      // Modo DIRECTO: Solo mensajes donde el admin es emisor o destinatario
      queryBuilder.andWhere(
        '(message.senderId = :adminId OR message.recipientId = :adminId)',
        { adminId }
      );
    } else if (mode === 'supervision') {
      // Modo SUPERVISIÓN: Mensajes entre otros usuarios (excluyendo donde admin es parte)
      queryBuilder.andWhere(
        '(message.senderId != :adminId AND (message.recipientId IS NULL OR message.recipientId != :adminId))',
        { adminId }
      );
    }

    // Aplicar filtros adicionales
    if (filters?.type) {
      queryBuilder.andWhere('message.type = :type', { type: filters.type });
    }
    if (filters?.priority) {
      queryBuilder.andWhere('message.priority = :priority', { priority: filters.priority });
    }
    if (filters?.isRead !== undefined) {
      const isReadBool = filters.isRead === true || filters.isRead === 'true';
      if (!isReadBool) {
        // Bug #1 fix: "no leídos" solo aplica a mensajes recibidos por el admin,
        // nunca a mensajes que él envió (aunque el destinatario no los haya leído aún).
        queryBuilder.andWhere('message.isRead = :isRead AND message.recipientId = :adminIdUnread', {
          isRead: false,
          adminIdUnread: adminId,
        });
      } else {
        queryBuilder.andWhere('message.isRead = :isRead', { isRead: true });
      }
    }
    if (filters?.search) {
      queryBuilder.andWhere(
        '(message.subject ILIKE :search OR message.content ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    queryBuilder.orderBy('message.createdAt', 'DESC');

    const limitRaw = filters?.limit !== undefined ? parseInt(filters.limit, 10) : undefined;
    const pageRaw = filters?.page !== undefined ? parseInt(filters.page, 10) : undefined;

    const page = Math.max(1, (pageRaw !== undefined && !Number.isNaN(pageRaw)) ? pageRaw : 1);
    // Preserve historical default of 100 when no page is provided (legacy clients).
    // When page IS explicit, default to 25 (new clients opt in to pagination).
    const defaultLimit = (pageRaw !== undefined && !Number.isNaN(pageRaw)) ? 25 : 100;
    const limit = Math.min(100, Math.max(1, (limitRaw !== undefined && !Number.isNaN(limitRaw)) ? limitRaw : defaultLimit));

    const [messages, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Calcular estadísticas
    const directCount = await this.messageRepository.count({
      where: [
        { senderId: adminId, isDeleted: false },
        { recipientId: adminId, isDeleted: false }
      ]
    });

    const supervisionCount = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('message.senderId != :adminId', { adminId })
      .andWhere('(message.recipientId IS NULL OR message.recipientId != :adminId)')
      .getCount();

    const unreadDirectCount = await this.messageRepository.count({
      where: { recipientId: adminId, isRead: false, isDeleted: false }
    });

    return {
      messages,
      stats: {
        directCount,
        supervisionCount,
        unreadDirectCount,
        totalMessages: directCount + supervisionCount
      },
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  async findAllMessagesOld(userId: string, filters?: any): Promise<Message[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const queryBuilder = this.messageRepository.createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('sender.profile', 'senderProfile')
      .leftJoinAndSelect('message.recipient', 'recipient')
      .leftJoinAndSelect('recipient.profile', 'recipientProfile')
      .leftJoinAndSelect('message.targetGroup', 'targetGroup')
      .leftJoinAndSelect('message.relatedStudent', 'relatedStudent')
      .leftJoinAndSelect('relatedStudent.user', 'relatedStudentUser')
      .leftJoinAndSelect('relatedStudentUser.profile', 'relatedStudentProfile')
      .leftJoinAndSelect('message.parentMessage', 'parentMessage')
      .leftJoinAndSelect('message.attachments', 'attachments')
      .where('message.isDeleted = :isDeleted', { isDeleted: false });

    // Filtrar mensajes según el rol del usuario
    if (user.role === UserRole.TEACHER) {
      // Profesor puede ver mensajes donde sea remitente, destinatario, o tutor del grupo
      queryBuilder.andWhere(`(
        message.senderId = :userId OR 
        message.recipientId = :userId OR 
        targetGroup.tutorId = :userId
      )`, { userId });
    } else {
      // Familias y estudiantes solo ven mensajes donde sean remitente o destinatario
      queryBuilder.andWhere(`(
        message.senderId = :userId OR 
        message.recipientId = :userId
      )`, { userId });
    }

    // Aplicar filtros adicionales
    if (filters?.type) {
      queryBuilder.andWhere('message.type = :type', { type: filters.type });
    }
    if (filters?.priority) {
      queryBuilder.andWhere('message.priority = :priority', { priority: filters.priority });
    }
    if (filters?.isRead !== undefined) {
      const isReadBool = filters.isRead === true || filters.isRead === 'true';
      if (!isReadBool) {
        // Bug #1 fix: "no leídos" solo aplica a mensajes recibidos por el usuario.
        queryBuilder.andWhere('message.isRead = :isRead AND message.recipientId = :userIdUnread', {
          isRead: false,
          userIdUnread: userId,
        });
      } else {
        queryBuilder.andWhere('message.isRead = :isRead', { isRead: true });
      }
    }

    return queryBuilder
      .orderBy('message.createdAt', 'DESC')
      .getMany();
  }

  async findOneMessage(id: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id, isDeleted: false },
      relations: [
        'sender',
        'sender.profile',
        'recipient',
        'recipient.profile',
        'targetGroup',
        'relatedStudent',
        'relatedStudent.user',
        'relatedStudent.user.profile',
        'parentMessage',
        'replies',
        'attachments',
      ],
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    return message;
  }

  /**
   * RGPD: obtener un mensaje verificando que el usuario es participante legítimo.
   * Autorizado: admin, remitente, destinatario, comunicado (announcement),
   * participante de la conversación o miembro del grupo destino. Cierra el IDOR
   * por el que cualquier FAMILY/STUDENT podía leer un mensaje ajeno por su UUID.
   */
  async findOneMessageForUser(id: string, userId: string): Promise<Message> {
    const message = await this.findOneMessage(id);
    const user = await this.userRepository.findOne({ where: { id: userId } });

    const isAdmin = user?.role === UserRole.ADMIN;
    const isDirectParticipant = message.senderId === userId || message.recipientId === userId;
    const isAnnouncement = message.type === MessageType.ANNOUNCEMENT;

    let isConversationParticipant = false;
    if (message.conversationId) {
      const result = await this.messageRepository.query(
        `SELECT 1 FROM conversation_participants WHERE "conversationId" = $1 AND "userId" = $2 LIMIT 1`,
        [message.conversationId, userId],
      );
      isConversationParticipant = result.length > 0;
    }

    const isInGroup = isConversationParticipant || (await this.isUserInMessageGroup(userId, message.id));

    if (!(isAdmin || isDirectParticipant || isAnnouncement || isInGroup)) {
      throw new ForbiddenException('No tienes permisos para ver este mensaje');
    }

    return message;
  }

  async updateMessage(id: string, userId: string, updateMessageDto: UpdateMessageDto): Promise<Message> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const message = await this.findOneMessage(id);

    // Verificar permisos: Admin, remitente o destinatario pueden actualizar
    const canUpdate = 
      user.role === UserRole.ADMIN ||
      message.senderId === userId ||
      message.recipientId === userId ||
      (message.type === MessageType.ANNOUNCEMENT); // Cualquier usuario puede marcar comunicados como leídos

    if (!canUpdate) {
      throw new ForbiddenException('No tienes permisos para actualizar este mensaje');
    }

    // Actualizar campos permitidos
    const wasUnread = !message.isRead;

    if (updateMessageDto.isRead !== undefined) {
      message.isRead = updateMessageDto.isRead;
      if (updateMessageDto.isRead) {
        message.readAt = new Date();
      }
    }

    if (updateMessageDto.isArchived !== undefined) {
      message.isArchived = updateMessageDto.isArchived;
    }

    if (updateMessageDto.status) {
      message.status = updateMessageDto.status;
      // Sincronizar isRead y readAt cuando status cambia a 'read'
      if (updateMessageDto.status === 'read' && !message.isRead) {
        message.isRead = true;
        message.readAt = new Date();
      }
    }

    const saved = await this.messageRepository.save(message);

    // Si el mensaje pasó de no leído a leído: decrementar contador del receptor
    const nowRead = saved.isRead;
    const isRecipient = saved.recipientId === userId;
    const isGroupRecipient = !!saved.targetGroupId && saved.senderId !== userId;
    if (wasUnread && nowRead && (isRecipient || isGroupRecipient)) {
      const newCount = await this.unreadCounterService.decrementMessages(userId);
      this.notificationsGateway.sendBadgeUpdate(userId, { messages: newCount });
    }

    return saved;
  }

  async deleteMessage(id: string, userId: string): Promise<void> {
    this.logger.debug(`=== DELETE MESSAGE DEBUG ===`);
    this.logger.debug(`Attempting to delete message ${id} by user ${userId}`);
    
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    
    this.logger.debug(`User found: ${user.email}, role: ${user.role}`);

    const message = await this.findOneMessage(id);
    this.logger.debug(`Message found: senderId=${message.senderId}, recipientId=${message.recipientId}, type=${message.type}`);

    // Verificar permisos: 
    // - Admin puede eliminar cualquier mensaje (eliminación completa)
    // - Remitente puede eliminar sus mensajes enviados (solo para él)
    // - Destinatario puede eliminar mensajes recibidos (solo para él)
    // - Para mensajes grupales: miembros del grupo pueden eliminar (solo para ellos)
    const isAdmin = user.role === UserRole.ADMIN;
    const isSender = message.senderId === userId;
    const isRecipient = message.recipientId === userId;
    const isAnnouncement = message.type === MessageType.ANNOUNCEMENT;
    
    this.logger.debug(`Permission checks: isAdmin=${isAdmin}, isSender=${isSender}, isRecipient=${isRecipient}, isAnnouncement=${isAnnouncement}`);
    
    const canDelete = isAdmin || isSender || isRecipient || isAnnouncement;
    
    this.logger.debug(`Final canDelete result: ${canDelete}`);

    if (!canDelete) {
      this.logger.error(`Permission denied for user ${userId} (${user.role}) to delete message ${id}`);
      throw new ForbiddenException('No tienes permisos para eliminar este mensaje');
    }

    // Lógica de eliminación diferenciada usando tabla de eliminaciones
    if (isAdmin) {
      // Admin elimina completamente el mensaje para todos
      message.isDeleted = true;
      await this.messageRepository.save(message);
      this.logger.debug(`Admin deletion - marking message as completely deleted`);
    } else {
      // Para usuarios normales: crear registro de eliminación personal
      // Verificar si ya existe un registro de eliminación para este usuario y mensaje
      const existingDeletion = await this.messageDeletionRepository.findOne({
        where: { messageId: id, userId }
      });

      if (!existingDeletion) {
        // Crear registro de eliminación personal
        const deletion = this.messageDeletionRepository.create({
          messageId: id,
          userId,
          message,
          user,
        });
        await this.messageDeletionRepository.save(deletion);
        this.logger.debug(`Created personal deletion record for user ${userId} and message ${id}`);

        // Para mensajes directos: si ambos usuarios han eliminado el mensaje, eliminarlo completamente
        if (message.type === MessageType.DIRECT && message.recipientId) {
          const allDeletions = await this.messageDeletionRepository.count({
            where: { messageId: id }
          });
          
          // Si tanto emisor como receptor han eliminado el mensaje (2 eliminaciones)
          if (allDeletions >= 2) {
            message.isDeleted = true;
            await this.messageRepository.save(message);
            this.logger.debug(`Both users deleted direct message - marking as completely deleted`);
          }
        }
      } else {
        this.logger.debug(`User ${userId} already deleted message ${id}`);
      }
    }
    
    this.logger.log(`Usuario ${userId} eliminó el mensaje ${id} exitosamente`);
    this.logger.debug(`=== END DELETE MESSAGE DEBUG ===`);
  }

  // ==================== DRAFTS ====================

  /**
   * Obtener todos los borradores del usuario
   */
  async getUserDrafts(userId: string): Promise<Message[]> {
    this.logger.log(`📝 Getting drafts for user ${userId}`);

    const drafts = await this.messageRepository.find({
      where: {
        senderId: userId,
        isDraft: true,
        isDeleted: false,
      },
      relations: ['sender', 'sender.profile', 'recipient', 'recipient.profile', 'targetGroup', 'attachments'],
      order: { updatedAt: 'DESC' },
    });

    this.logger.log(`📝 Found ${drafts.length} drafts for user ${userId}`);
    return drafts;
  }

  /**
   * Obtener el número de borradores del usuario
   */
  async getDraftsCount(userId: string): Promise<number> {
    return this.messageRepository.count({
      where: {
        senderId: userId,
        isDraft: true,
        isDeleted: false,
      },
    });
  }

  /**
   * Obtener un borrador específico (verificando que pertenece al usuario)
   */
  async getDraft(draftId: string, userId: string): Promise<Message> {
    const draft = await this.messageRepository.findOne({
      where: {
        id: draftId,
        senderId: userId,
        isDraft: true,
        isDeleted: false,
      },
      relations: ['sender', 'sender.profile', 'recipient', 'recipient.profile', 'targetGroup', 'relatedStudent', 'attachments'],
    });

    if (!draft) {
      throw new NotFoundException('Borrador no encontrado');
    }

    return draft;
  }

  /**
   * Actualizar un borrador
   */
  async updateDraft(draftId: string, userId: string, updateMessageDto: UpdateMessageDto): Promise<Message> {
    const draft = await this.getDraft(draftId, userId);

    // Actualizar campos del borrador
    const { recipientId, targetGroupId, relatedStudentId, ...updateData } = updateMessageDto;

    // Si se actualiza el destinatario
    if (recipientId !== undefined) {
      if (recipientId) {
        const recipient = await this.userRepository.findOne({ where: { id: recipientId } });
        if (!recipient) {
          throw new NotFoundException('Destinatario no encontrado');
        }
        draft.recipient = recipient;
        draft.recipientId = recipientId;
      } else {
        draft.recipient = null;
        draft.recipientId = null;
      }
    }

    // Si se actualiza el grupo destinatario
    if (targetGroupId !== undefined) {
      if (targetGroupId) {
        const targetGroup = await this.classGroupRepository.findOne({ where: { id: targetGroupId } });
        if (!targetGroup) {
          throw new NotFoundException('Grupo no encontrado');
        }
        draft.targetGroup = targetGroup;
        draft.targetGroupId = targetGroupId;
      } else {
        draft.targetGroup = null;
        draft.targetGroupId = null;
      }
    }

    // Si se actualiza el estudiante relacionado
    if (relatedStudentId !== undefined) {
      if (relatedStudentId) {
        const relatedStudent = await this.studentRepository.findOne({ where: { id: relatedStudentId } });
        if (!relatedStudent) {
          throw new NotFoundException('Estudiante no encontrado');
        }
        draft.relatedStudent = relatedStudent;
        draft.relatedStudentId = relatedStudentId;
      } else {
        draft.relatedStudent = null;
        draft.relatedStudentId = null;
      }
    }

    // Actualizar otros campos
    Object.assign(draft, updateData);

    await this.messageRepository.save(draft);
    this.logger.log(`📝 Draft ${draftId} updated by user ${userId}`);

    return this.getDraft(draftId, userId);
  }

  /**
   * Enviar un borrador (convertirlo en mensaje enviado)
   */
  async sendDraft(draftId: string, userId: string): Promise<Message> {
    const draft = await this.getDraft(draftId, userId);

    // Validar que el borrador tiene los campos necesarios para ser enviado
    if (!draft.subject || draft.subject.trim() === '') {
      throw new BadRequestException('El borrador debe tener un asunto para poder enviarse');
    }

    if (!draft.content || draft.content.trim() === '') {
      throw new BadRequestException('El borrador debe tener contenido para poder enviarse');
    }

    // Debe tener al menos un destinatario (directo o grupo)
    if (!draft.recipientId && !draft.targetGroupId) {
      throw new BadRequestException('El borrador debe tener al menos un destinatario para poder enviarse');
    }

    // Validar permisos de envío
    const sender = await this.userRepository.findOne({ where: { id: userId } });
    await this.validateSendPermissions(sender, draft.recipient, draft.targetGroup, draft.relatedStudent);

    // Convertir el borrador en mensaje enviado
    draft.isDraft = false;
    draft.status = MessageStatus.SENT;
    await this.messageRepository.save(draft);

    // Cargar el mensaje con las relaciones necesarias para las notificaciones
    const messageWithRelations = await this.messageRepository.findOne({
      where: { id: draft.id },
      relations: ['sender', 'sender.profile', 'recipient', 'targetGroup']
    });

    // Crear notificaciones para los destinatarios
    this.logger.log(`📬 Creating notifications for sent draft ${messageWithRelations.id}`);
    await this.createMessageNotifications(messageWithRelations);

    this.logger.log(`📤 Draft ${draftId} sent by user ${userId}`);

    return this.findOneMessage(draft.id);
  }

  /**
   * Eliminar un borrador permanentemente
   */
  async deleteDraft(draftId: string, userId: string): Promise<void> {
    const draft = await this.getDraft(draftId, userId);

    // Eliminar adjuntos asociados
    if (draft.attachments && draft.attachments.length > 0) {
      await this.attachmentRepository.delete({ message: { id: draftId } });
    }

    // Eliminar el borrador permanentemente (no soft delete)
    await this.messageRepository.delete(draftId);
    this.logger.log(`🗑️ Draft ${draftId} permanently deleted by user ${userId}`);
  }


  // ==================== NOTIFICATIONS ====================

  async createNotification(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const { userId, triggeredById, relatedStudentId, relatedGroupId, ...notificationData } = createNotificationDto;

    // Verificar que el usuario destinatario existe
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario destinatario no encontrado');
    }

    // Verificar usuario que genera la notificación
    let triggeredBy = null;
    if (triggeredById) {
      triggeredBy = await this.userRepository.findOne({ where: { id: triggeredById } });
    }

    // Verificar estudiante relacionado
    let relatedStudent = null;
    if (relatedStudentId) {
      relatedStudent = await this.studentRepository.findOne({ where: { id: relatedStudentId } });
    }

    // Verificar grupo relacionado
    let relatedGroup = null;
    if (relatedGroupId) {
      relatedGroup = await this.classGroupRepository.findOne({ where: { id: relatedGroupId } });
    }

    const notification = this.notificationRepository.create({
      ...notificationData,
      user,
      userId,
      triggeredBy,
      triggeredById,
      relatedStudent,
      relatedStudentId,
      relatedGroup,
      relatedGroupId,
    });

    const saved = await this.notificationRepository.save(notification);

    // Incrementar contador y notificar en tiempo real al receptor
    // Solo si el destinatario NO es quien generó la notificación (no auto-notificación)
    if (!triggeredById || triggeredById !== userId) {
      const newCount = await this.unreadCounterService.incrementNotifications(userId);
      this.notificationsGateway.sendNewNotification(userId, {
        notificationId: saved.id,
        title: saved.title,
        content: saved.content,
        type: saved.type,
        actionUrl: saved.actionUrl,
        unreadCount: newCount,
      });
    }

    return saved;
  }

  async findUserNotifications(userId: string, filters?: any): Promise<Notification[]> {
    const queryBuilder = this.notificationRepository.createQueryBuilder('notification')
      .leftJoinAndSelect('notification.triggeredBy', 'triggeredBy')
      .leftJoinAndSelect('triggeredBy.profile', 'triggeredByProfile')
      .leftJoinAndSelect('notification.relatedStudent', 'relatedStudent')
      .leftJoinAndSelect('relatedStudent.user', 'relatedStudentUser')
      .leftJoinAndSelect('relatedStudentUser.profile', 'relatedStudentProfile')
      .leftJoinAndSelect('notification.relatedGroup', 'relatedGroup')
      .where('notification.userId = :userId', { userId })
      // Bug #2 fix: los mensajes directos NO deben aparecer en el panel de notificaciones
      .andWhere('notification.type != :msgType', { msgType: NotificationType.MESSAGE });

    // Aplicar filtros
    if (filters?.type) {
      queryBuilder.andWhere('notification.type = :type', { type: filters.type });
    }
    if (filters?.status) {
      queryBuilder.andWhere('notification.status = :status', { status: filters.status });
    }

    return queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .getMany();
  }

  async updateNotification(id: string, userId: string, updateNotificationDto: UpdateNotificationDto): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    const wasUnread = notification.status === NotificationStatus.UNREAD;

    if (updateNotificationDto.status) {
      notification.status = updateNotificationDto.status;
      if (updateNotificationDto.status === NotificationStatus.READ) {
        notification.readAt = new Date();
      } else if (updateNotificationDto.status === NotificationStatus.DISMISSED) {
        notification.dismissedAt = new Date();
      }
    }

    const saved = await this.notificationRepository.save(notification);

    // Decrementar contador de campana al pasar de unread → read/dismissed
    if (wasUnread && saved.status !== NotificationStatus.UNREAD) {
      const newCount = await this.unreadCounterService.decrementNotifications(userId);
      this.notificationsGateway.sendBadgeUpdate(userId, { notifications: newCount });
    }

    return saved;
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    // Leer desde Redis/BD materializada (O(1), < 5ms)
    return this.unreadCounterService.getNotifications(userId);
  }

  /** Devuelve mensajes + notificaciones no leídas en una sola llamada (< 5ms). */
  async getBadges(userId: string): Promise<{ messages: number; notifications: number }> {
    return this.unreadCounterService.getBoth(userId);
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, status: NotificationStatus.UNREAD },
      { status: NotificationStatus.READ, readAt: new Date() }
    );

    // Resetear contador y notificar al cliente via WS
    await this.unreadCounterService.resetNotifications(userId);
    this.notificationsGateway.sendBadgeUpdate(userId, { notifications: 0 });
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    await this.notificationRepository.remove(notification);
  }

  async deleteAllNotifications(userId: string): Promise<number> {
    const notifications = await this.notificationRepository.find({
      where: { userId },
    });

    const count = notifications.length;
    await this.notificationRepository.remove(notifications);
    
    return count;
  }

  // ==================== HELPER METHODS ====================

  private async validateSendPermissions(
    sender: User,
    recipient: User | null,
    targetGroup: ClassGroup | null,
    relatedStudent: Student | null,
  ): Promise<void> {
    this.logger.debug(`=== VALIDATE SEND PERMISSIONS ===`);
    this.logger.debug(`Sender: ${sender.email} (${sender.role})`);
    this.logger.debug(`Recipient: ${recipient?.email || 'N/A'} (${recipient?.role || 'N/A'})`);
    this.logger.debug(`TargetGroup: ${targetGroup?.name || 'N/A'}`);
    this.logger.debug(`RelatedStudent: ${relatedStudent?.id || 'N/A'}`);

    // Admin puede enviar mensajes a cualquiera
    if (sender.role === UserRole.ADMIN) {
      this.logger.debug('Admin sender - all permissions granted');
      return;
    }

    // Validaciones específicas por rol
    if (sender.role === UserRole.TEACHER) {
      this.logger.debug('Teacher sender - validating permissions');
      
      // Profesores pueden enviar:
      // 1. Mensajes a otros profesores/admin (sin restricciones)
      // 2. Mensajes grupales a sus clases
      // 3. Comunicados oficiales
      // 4. Mensajes a familias de estudiantes de sus clases
      
      if (recipient) {
        // Mensaje directo a otro usuario
        if (recipient.role === UserRole.ADMIN || recipient.role === UserRole.TEACHER) {
          this.logger.debug('Teacher to Admin/Teacher - allowed');
          return; // Profesores pueden contactar con admin y otros profesores
        }
        
        if (recipient.role === UserRole.FAMILY) {
          if (!relatedStudent) {
            this.logger.debug('Teacher to Family without relatedStudent - allowed for general communication');
            return; // Permitir comunicación general con familias
          }
          
          // Si hay estudiante relacionado, verificar que está en sus clases
          // Primero obtener el teacher record del usuario
          const teacher = await this.userRepository.findOne({
            where: { id: sender.id },
            relations: ['profile']
          });
          
          if (!teacher) {
            this.logger.error(`Teacher user ${sender.id} not found`);
            throw new ForbiddenException('Usuario profesor no encontrado');
          }

          // Buscar los grupos donde este usuario es tutor a través de la tabla teachers
          const classGroups = await this.classGroupRepository.find({
            where: { tutor: { user: { id: sender.id } } },
            relations: ['students', 'tutor', 'tutor.user'],
          });

          this.logger.debug(`Found ${classGroups.length} class groups for teacher ${sender.id}`);

          const hasStudent = classGroups.some(group =>
            group.students.some(student => student.id === relatedStudent.id)
          );

          if (!hasStudent) {
            this.logger.error(`Teacher ${sender.id} doesn't have access to student ${relatedStudent.id}. Groups: ${classGroups.map(g => g.name).join(', ')}`);
            throw new ForbiddenException('No tienes permisos para contactar con esta familia sobre este estudiante');
          }
          
          this.logger.debug('Teacher to Family with valid student - allowed');
          return;
        }
        
        if (recipient.role === UserRole.STUDENT) {
          this.logger.debug('Teacher to Student - allowed');
          return; // Profesores pueden contactar con estudiantes
        }
      }
      
      if (targetGroup) {
        // Mensaje grupal - verificar si es tutor del grupo
        const isGroupTutor = await this.classGroupRepository.findOne({
          where: { id: targetGroup.id, tutor: { user: { id: sender.id } } },
          relations: ['tutor', 'tutor.user']
        });
        
        if (!isGroupTutor) {
          this.logger.error(`Teacher ${sender.id} is not tutor of group ${targetGroup.id}`);
          throw new ForbiddenException('No tienes permisos para enviar mensajes a este grupo');
        }
        
        this.logger.debug('Teacher to own group - allowed');
        return;
      }
      
      this.logger.debug('Teacher general case - allowed');
      return; // Otros casos para profesores permitidos
      
    } else if (sender.role === UserRole.FAMILY) {
      this.logger.debug('Family sender - validating permissions');
      
      // Las familias solo pueden enviar mensajes a profesores y admin
      if (recipient && ![UserRole.TEACHER, UserRole.ADMIN].includes(recipient.role)) {
        this.logger.error(`Family ${sender.id} trying to contact ${recipient.role}`);
        throw new ForbiddenException('Las familias solo pueden contactar con profesores y administración');
      }
      
      this.logger.debug('Family to Teacher/Admin - allowed');
      return;
      
    } else if (sender.role === UserRole.STUDENT) {
      this.logger.debug('Student sender - validating permissions');
      
      // Los estudiantes pueden enviar mensajes a profesores y admin
      if (recipient && ![UserRole.TEACHER, UserRole.ADMIN].includes(recipient.role)) {
        this.logger.error(`Student ${sender.id} trying to contact ${recipient.role}`);
        throw new ForbiddenException('Los estudiantes solo pueden contactar con profesores y administración');
      }
      
      this.logger.debug('Student to Teacher/Admin - allowed');
      return;
    }
    
    this.logger.debug('=== END VALIDATE SEND PERMISSIONS ===');
  }

  private async createMessageNotifications(message: Message): Promise<void> {
    this.logger.log(`=== CREATE MESSAGE NOTIFICATIONS ===`);
    this.logger.log(`Message ID: ${message.id}, Sender: ${message.senderId}, Recipient: ${message.recipientId || 'N/A'}`);

    const notifications: CreateNotificationDto[] = [];

    const senderName = message.sender?.profile
      ? `${message.sender.profile.firstName} ${message.sender.profile.lastName}`.trim()
      : 'Usuario';
    const preview = (message.content || '').replace(/<[^>]*>/g, '').substring(0, 120);

    if (message.recipient) {
      // Mensaje directo — solo notificar al receptor, nunca al emisor
      if (message.recipientId !== message.senderId) {
        notifications.push({
          title: `Nuevo mensaje de ${senderName}`,
          content: message.subject,
          type: NotificationType.MESSAGE,
          userId: message.recipientId,
          triggeredById: message.senderId,
          relatedStudentId: message.relatedStudentId,
          actionUrl: `/communications?messageId=${message.id}`,
        });

        // Incrementar contador de mensajes del receptor y emitir por WS
        const newMsgCount = await this.unreadCounterService.incrementMessages(message.recipientId);
        this.notificationsGateway.sendNewMessage(message.recipientId, {
          messageId: message.id,
          senderId: message.senderId,
          senderName,
          subject: message.subject,
          preview,
          type: 'direct',
          unreadCount: newMsgCount,
        });

        this.logger.debug(`Direct message notification + counter for user ${message.recipientId}`);
      } else {
        this.logger.debug(`Skipped self-notification for sender ${message.senderId}`);
      }

    } else if (message.targetGroup) {
      // Mensaje grupal — notificar a todos los miembros excepto al emisor
      const groupUsers = await this.getGroupUsers(message.targetGroup);
      this.logger.debug(`Found ${groupUsers.length} users in group ${message.targetGroup.name}`);

      for (const user of groupUsers) {
        if (user.id !== message.senderId) {
          notifications.push({
            title: `Nuevo mensaje grupal en ${message.targetGroup.name}`,
            content: message.subject,
            type: NotificationType.MESSAGE,
            userId: user.id,
            triggeredById: message.senderId,
            relatedGroupId: message.targetGroupId,
            actionUrl: `/communications?messageId=${message.id}`,
          });

          const newMsgCount = await this.unreadCounterService.incrementMessages(user.id);
          this.notificationsGateway.sendNewMessage(user.id, {
            messageId: message.id,
            senderId: message.senderId,
            senderName,
            subject: message.subject,
            preview,
            type: 'group',
            unreadCount: newMsgCount,
          });
        }
      }
    }

    // Bug #2 fix: Los mensajes NO deben crear registros en la tabla notifications
    // (lo cual incrementaría el contador de notificaciones/campana).
    // Solo se usa el contador de mensajes + evento WS new_message.
    // Se envían emails de forma independiente.
    this.logger.debug(`Sending ${notifications.length} message email notifications (without creating Notification records)`);

    for (const notificationDto of notifications) {
      try {
        await this.sendMessageNotificationEmail(message, notificationDto.userId);
      } catch (error) {
        this.logger.error(`Error sending message email to user ${notificationDto.userId}:`, error);
      }
    }

    this.logger.debug(`=== END CREATE MESSAGE NOTIFICATIONS ===`);
  }

  private async sendMessageNotificationEmail(message: Message, recipientUserId: string): Promise<void> {
    try {
      this.logger.log(`📧 Sending email notification for message ${message.id} to user ${recipientUserId}`);

      // Obtener datos del usuario destinatario
      const recipient = await this.userRepository.findOne({
        where: { id: recipientUserId },
        relations: ['profile'],
      });

      if (!recipient || !recipient.email) {
        this.logger.warn(`No email found for user ${recipientUserId}, skipping email notification`);
        return;
      }

      // Preparar datos para la plantilla
      const senderName = message.sender.profile
        ? `${message.sender.profile.firstName} ${message.sender.profile.lastName}`.trim()
        : 'Usuario del sistema';

      const senderInitials = message.sender.profile
        ? `${message.sender.profile.firstName?.charAt(0) || ''}${message.sender.profile.lastName?.charAt(0) || ''}`.toUpperCase()
        : 'US';

      const recipientName = recipient.profile
        ? `${recipient.profile.firstName} ${recipient.profile.lastName}`.trim()
        : 'Usuario';

      // Determinar el rol del remitente para mostrar en el email
      const senderRoleMapping = {
        [UserRole.ADMIN]: 'Administrador',
        [UserRole.TEACHER]: 'Profesor',
        [UserRole.STUDENT]: 'Estudiante',
        [UserRole.FAMILY]: 'Familia',
      };
      const senderRole = senderRoleMapping[message.sender.role] || 'Usuario';

      // Preparar preview del mensaje (máximo 100 caracteres)
      const messagePreview = message.content
        ? message.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...'
        : 'Sin contenido de preview disponible';

      // Datos para la plantilla
      const templateData = {
        userName: recipientName,
        senderName: senderName,
        senderRole: senderRole,
        senderInitials: senderInitials,
        messageDate: new Date(message.createdAt).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        messageSubject: message.subject || 'Sin asunto',
        messagePreview: messagePreview,
        platformUrl: 'https://plataforma.mundoworld.school',
        schoolName: 'Mundo World School',
      };

      // Enviar email directamente usando Resend (método que funciona 100%)
      const htmlContent = this.generateMessageNotificationHTML(templateData, message);
      const textContent = this.generateMessageNotificationText(templateData, message);

      await this.sendEmailDirectly(
        recipient.email,
        `💬 Tienes un nuevo mensaje de ${senderName}`,
        htmlContent,
        textContent
      );

      this.logger.log(`📧 Email notification sent successfully to ${recipient.email} for message ${message.id}`);
    } catch (error) {
      this.logger.error(`Failed to send email notification for message ${message.id} to user ${recipientUserId}:`, error);
    }
  }

  private async getGroupUsers(group: ClassGroup): Promise<User[]> {
    const users: User[] = [];

    // Agregar tutor
    if (group.tutor && group.tutor.user && group.tutor.user.id) {
      const tutor = await this.userRepository.findOne({
        where: { id: group.tutor.user.id },
      });
      if (tutor) users.push(tutor);
    }

    // Agregar familias de los estudiantes
    for (const student of group.students) {
      if (student.user) {
        users.push(student.user);
        
        // TODO: Agregar usuarios de la familia del estudiante
        // Esto requeriría acceso al repositorio de familias
      }
    }

    return users;
  }

  // ==================== STATISTICS ====================

  async getUserMessagingStats(userId: string): Promise<any> {
    const [
      totalSent,
      totalReceived,
      unreadMessages,
      unreadNotifications,
    ] = await Promise.all([
      this.messageRepository.count({
        where: { senderId: userId, isDeleted: false, isDeletedBySender: false },
      }),
      this.messageRepository.count({
        where: { recipientId: userId, isDeleted: false, isDeletedByRecipient: false },
      }),
      this.getUnreadMessagesCount(userId),
      this.getUnreadNotificationsCount(userId),
    ]);

    return {
      totalSent,
      totalReceived,
      unreadMessages,
      unreadNotifications,
      totalMessages: totalSent + totalReceived,
    };
  }

  async getUnreadMessagesCount(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // 1. Leer desde Redis/BD materializada (O(1), < 5ms)
    return this.unreadCounterService.getMessages(userId);
  }

  // ==================== AVAILABLE RECIPIENTS ====================

  async getAvailableRecipients(userId: string): Promise<any[]> {
    console.log('🚨🚨🚨 METHOD getAvailableRecipients CALLED!!! 🚨🚨🚨');
    console.log('🚨🚨🚨 USER ID:', userId, '🚨🚨🚨');

    try {
      console.log(`🔍 MAIN METHOD CALLED: getAvailableRecipients for ${userId}`);
      console.log(`🔍 MAIN METHOD: Starting execution...`);
      this.logger.debug(`Getting available recipients for user ${userId}`);

      // TEMPORARY TEST: Force family testing with specific family user ID
      const FAMILY_TEST_USER_ID = '7a741cf7-f0e9-4e48-88fb-2f9c6802fda4'; // adrimatus@gmail.com
      if (userId === FAMILY_TEST_USER_ID) {
        console.log('🧪 FORCING FAMILY TEST for adrimatus@gmail.com');
        return this.getAvailableRecipientsForFamily(userId);
      }

      // Get current user to determine role - SIMPLIFIED FOR TESTING
      console.log(`🔍 MAIN: About to query currentUser for ${userId}...`);
      const currentUser = await this.userRepository.findOne({
        where: { id: userId }
        // Temporarily removed relations to isolate the error
      });
      console.log(`🔍 MAIN: CurrentUser query successful for ${userId} - role: ${currentUser?.role}`);

      if (!currentUser) {
        this.logger.error(`User ${userId} not found`);
        return [];
      }

      this.logger.debug(`User role: ${currentUser.role}`);
      console.log(`🔍 SWITCH STATEMENT: currentUser.role = "${currentUser.role}"`);
      console.log(`🔍 SWITCH STATEMENT: UserRole.STUDENT = "${UserRole.STUDENT}"`);
      console.log(`🔍 SWITCH STATEMENT: Are they equal? ${currentUser.role === UserRole.STUDENT}`);
      console.log(`🔍 SWITCH STATEMENT: UserRole.FAMILY = "${UserRole.FAMILY}"`);
      console.log(`🔍 SWITCH STATEMENT: Are they equal? ${currentUser.role === UserRole.FAMILY}`);

      switch (currentUser.role) {
        case UserRole.ADMIN:
          console.log('🔍 SWITCH: Entering ADMIN case');
          return this.getAvailableRecipientsForAdmin();

        case UserRole.TEACHER:
          console.log('🔍 SWITCH: Entering TEACHER case');
          console.log('🚨🚨🚨 DEBUG: About to call getAvailableRecipientsForTeacher method 🚨🚨🚨');
          const teacherResult = this.getAvailableRecipientsForTeacher(userId);
          console.log('🚨🚨🚨 DEBUG: Method call completed, result type:', typeof teacherResult, '🚨🚨🚨');
          return teacherResult;

        case UserRole.STUDENT:
          return this.getAvailableRecipientsForStudent(userId);

        case UserRole.FAMILY:
          console.log('🔍 SWITCH: Entering FAMILY case');
          console.log('🔍 SWITCH: About to call getAvailableRecipientsForFamily');
          return this.getAvailableRecipientsForFamily(userId);

        default:
          console.log(`🔍 SWITCH: Entering DEFAULT case with role: ${currentUser.role}`);
          this.logger.warn(`Unknown role ${currentUser.role} for user ${userId}`);
          return [];
      }
    } catch (error) {
      this.logger.error(`Error getting available recipients for user ${userId}:`, error);
      return [];
    }
  }

  // TEMPORARY TESTING METHOD - REMOVE AFTER FIXING FAMILY FILTERING
  async testFamilyFiltering(familyUserId: string): Promise<any[]> {
    console.log('🧪 TESTING SERVICE: testFamilyFiltering called for:', familyUserId);
    return await this.getAvailableRecipientsForFamily(familyUserId);
  }

  async getAvailableGroups(userId: string): Promise<any[]> {
    const user = await this.userRepository.findOne({ 
      where: { id: userId },
      relations: ['profile']
    });
    
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    this.logger.debug(`Getting available groups for user ${user.email} (${user.role})`);

    let availableGroups: ClassGroup[] = [];

    if (user.role === UserRole.ADMIN) {
      // Admin puede enviar mensajes a cualquier grupo
      availableGroups = await this.classGroupRepository.find({
        relations: ['tutor', 'tutor.user', 'tutor.user.profile'],
        order: { name: 'ASC' }
      });
      
    } else if (user.role === UserRole.TEACHER) {
      // Profesores solo pueden enviar a grupos donde son tutores
      availableGroups = await this.classGroupRepository.find({
        where: { tutor: { user: { id: userId } } },
        relations: ['tutor', 'tutor.user', 'tutor.user.profile'],
        order: { name: 'ASC' }
      });
    }

    // Formatear respuesta
    const formattedGroups = availableGroups.map(g => ({
      id: g.id,
      name: g.name,
      section: g.section,
      tutor: g.tutor ? {
        id: g.tutor.id,
        name: `${g.tutor.user?.profile?.firstName || ''} ${g.tutor.user?.profile?.lastName || ''}`.trim()
      } : null,
      displayName: g.section ? `${g.name} - ${g.section}` : g.name
    }));

    this.logger.debug(`Found ${formattedGroups.length} available groups for ${user.role}`);
    return formattedGroups;
  }

  // ==================== BULK OPERATIONS FOR MESSAGES ====================

  async markAllMessagesAsRead(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Obtener todos los mensajes que el usuario puede ver (usando la misma lógica que findAllMessages)
    const queryBuilder = this.messageRepository.createQueryBuilder('message')
      .where('message.isDeleted = :isDeleted AND message.isRead = :isRead', { 
        isDeleted: false, 
        isRead: false 
      });

    // Filtrar mensajes eliminados por el usuario actual usando la tabla de eliminaciones
    if (user.role !== UserRole.ADMIN) {
      queryBuilder.andWhere(`
        NOT EXISTS (
          SELECT 1 FROM message_deletions md 
          WHERE md."messageId" = message.id AND md."userId" = :userId
        )
      `, { userId });
    }

    // Aplicar filtros por rol del usuario (misma lógica que findAllMessages)
    if (user.role === UserRole.TEACHER) {
      // Para profesores: obtener primero los grupos donde es tutor
      const teacherGroups = await this.classGroupRepository.find({
        where: { tutor: { user: { id: userId } } },
        select: ['id'],
        relations: ['tutor', 'tutor.user']
      });
      const groupIds = teacherGroups.map(g => g.id);
      
      if (groupIds.length > 0) {
        queryBuilder.andWhere(
          '(message.senderId = :userId OR message.recipientId = :userId OR message.targetGroupId IN (:...groupIds))',
          { userId, groupIds }
        );
      } else {
        queryBuilder.andWhere(
          '(message.senderId = :userId OR message.recipientId = :userId)',
          { userId }
        );
      }
    } else if (user.role === UserRole.FAMILY) {
      queryBuilder.andWhere(
        '(message.senderId = :userId OR message.recipientId = :userId)',
        { userId }
      );
    } else if (user.role === UserRole.STUDENT) {
      // SEGURIDAD CRÍTICA: Estudiantes solo pueden ver mensajes donde sean emisor o receptor directo
      queryBuilder.andWhere(
        '(message.senderId = :userId OR message.recipientId = :userId)',
        { userId }
      );
    } else if (user.role === UserRole.ADMIN) {
      // Admin puede marcar todos los mensajes como leídos
    }

    // Obtener los IDs de los mensajes a marcar
    const messages = await queryBuilder.select('message.id').getMany();
    const messageIds = messages.map(m => m.id);

    if (messageIds.length > 0) {
      // Marcar como leídos todos los mensajes encontrados
      await this.messageRepository.update(
        { id: In(messageIds) },
        { 
          isRead: true, 
          readAt: new Date() 
        }
      );
    }

    this.logger.log(`Usuario ${userId} marcó ${messageIds.length} mensajes como leídos`);

    // Resetear contador y notificar al cliente vía WebSocket
    await this.unreadCounterService.resetMessages(userId);
    this.notificationsGateway.sendBadgeUpdate(userId, { messages: 0 });
  }

  async markMessageAsUnread(messageId: string, userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const message = await this.findOneMessage(messageId);

    // Verificar permisos: Admin, remitente o destinatario pueden marcar como no leído
    const canUpdate = 
      user.role === UserRole.ADMIN ||
      message.senderId === userId ||
      message.recipientId === userId ||
      (message.type === MessageType.ANNOUNCEMENT);

    if (!canUpdate) {
      throw new ForbiddenException('No tienes permisos para actualizar este mensaje');
    }

    // Solo marcar como no leído si actualmente está marcado como leído
    if (message.isRead) {
      await this.messageRepository.update(
        { id: messageId },
        {
          isRead: false,
          readAt: null
        }
      );

      // Actualizar contador Redis e informar al cliente vía WebSocket
      const newCount = await this.unreadCounterService.incrementMessages(userId);
      this.notificationsGateway.sendBadgeUpdate(userId, { messages: newCount });

      this.logger.log(`Usuario ${userId} marcó mensaje ${messageId} como no leído`);
    }
  }

  async deleteAllMessages(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.role === UserRole.ADMIN) {
      // Admin elimina completamente todos los mensajes
      const result = await this.messageRepository.update(
        { isDeleted: false },
        { isDeleted: true }
      );
      const deletedCount = result.affected || 0;
      this.logger.log(`Admin ${userId} eliminó completamente ${deletedCount} mensajes`);
      return deletedCount;
    }

    // Para usuarios normales: obtener mensajes que pueden ver y crear registros de eliminación
    const queryBuilder = this.messageRepository.createQueryBuilder('message')
      .where('message.isDeleted = :isDeleted', { isDeleted: false });

    // Filtrar mensajes ya eliminados por el usuario actual
    queryBuilder.andWhere(`
      NOT EXISTS (
        SELECT 1 FROM message_deletions md 
        WHERE md."messageId" = message.id AND md."userId" = :userId
      )
    `, { userId });

    // Aplicar filtros por rol del usuario (misma lógica que findAllMessages)
    if (user.role === UserRole.TEACHER) {
      // Para profesores: obtener primero los grupos donde es tutor
      const teacherGroups = await this.classGroupRepository.find({
        where: { tutor: { user: { id: userId } } },
        select: ['id'],
        relations: ['tutor', 'tutor.user']
      });
      const groupIds = teacherGroups.map(g => g.id);
      
      if (groupIds.length > 0) {
        queryBuilder.andWhere(
          '(message.senderId = :userId OR message.recipientId = :userId OR message.targetGroupId IN (:...groupIds))',
          { userId, groupIds }
        );
      } else {
        queryBuilder.andWhere(
          '(message.senderId = :userId OR message.recipientId = :userId)',
          { userId }
        );
      }
    } else if (user.role === UserRole.FAMILY) {
      queryBuilder.andWhere(
        '(message.senderId = :userId OR message.recipientId = :userId)',
        { userId }
      );
    } else if (user.role === UserRole.STUDENT) {
      // SEGURIDAD CRÍTICA: Estudiantes solo pueden eliminar mensajes donde sean emisor o receptor directo
      queryBuilder.andWhere(
        '(message.senderId = :userId OR message.recipientId = :userId)',
        { userId }
      );
    } else if (user.role === UserRole.ADMIN) {
      // Admin puede eliminar todos los mensajes (sin filtros adicionales)
    }

    // Obtener los IDs de los mensajes a eliminar
    const messages = await queryBuilder.select('message.id').getMany();
    const messageIds = messages.map(m => m.id);

    let deletedCount = 0;
    if (messageIds.length > 0) {
      // Crear registros de eliminación para cada mensaje
      const deletions = messageIds.map(messageId => ({
        messageId,
        userId,
      }));

      await this.messageDeletionRepository.insert(deletions);
      deletedCount = messageIds.length;

      // Para mensajes directos: verificar si necesitamos eliminar completamente algunos mensajes
      const directMessages = await this.messageRepository.find({
        where: { 
          id: In(messageIds), 
          type: MessageType.DIRECT,
          recipientId: Not(IsNull())
        }
      });

      for (const message of directMessages) {
        const allDeletions = await this.messageDeletionRepository.count({
          where: { messageId: message.id }
        });
        
        // Si tanto emisor como receptor han eliminado el mensaje (2 eliminaciones)
        if (allDeletions >= 2) {
          await this.messageRepository.update(
            { id: message.id },
            { isDeleted: true }
          );
          this.logger.debug(`Both users deleted direct message ${message.id} - marking as completely deleted`);
        }
      }
    }

    this.logger.log(`Usuario ${userId} eliminó ${deletedCount} mensajes`);
    return deletedCount;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Obtiene los profesores que están dando clase a los hijos de una familia
   * @param familyUserId ID del usuario familia
   * @returns Lista de profesores que pueden contactar
   */
  private async getTeachersForFamily(familyUserId: string): Promise<User[]> {
    this.logger.debug(`Getting allowed teachers for family user ${familyUserId}`);

    try {
      // 1. Encontrar la familia a la que pertenece este usuario
      const family = await this.familyRepository
        .createQueryBuilder('family')
        .leftJoin('family.primaryContact', 'primaryContact')
        .leftJoin('family.secondaryContact', 'secondaryContact')
        .where('primaryContact.id = :userId OR secondaryContact.id = :userId', { userId: familyUserId })
        .getOne();

      if (!family) {
        this.logger.warn(`No family found for user ${familyUserId}`);
        return [];
      }

      // 2. Obtener los estudiantes de esta familia
      const familyStudents = await this.familyStudentRepository.find({
        where: { familyId: family.id },
        relations: ['student', 'student.classGroups', 'student.classGroups.tutor', 'student.classGroups.tutor.user']
      });

      if (familyStudents.length === 0) {
        this.logger.warn(`No students found for family ${family.id}`);
        return [];
      }

      const teacherIds = new Set<string>();

      // 3. Para cada estudiante, obtener sus profesores
      for (const familyStudent of familyStudents) {
        const student = familyStudent.student;
        
        if (!student.classGroups) {
          continue;
        }

        // 3a. Obtener tutores de las clases del estudiante
        for (const classGroup of student.classGroups) {
          if (classGroup.tutor && classGroup.tutor.user) {
            teacherIds.add(classGroup.tutor.user.id);
          }
        }

        // 3b. Obtener profesores de las materias en las clases del estudiante
        const classGroupIds = student.classGroups.map(cg => cg.id);

        if (classGroupIds.length > 0) {
          const subjectAssignments = await this.subjectAssignmentRepository.find({
            where: { classGroupId: In(classGroupIds) },
            relations: ['teacher', 'teacher.user']
          });

          for (const assignment of subjectAssignments) {
            if (assignment.teacher && assignment.teacher.user) {
              teacherIds.add(assignment.teacher.user.id);
            }
          }
        }
      }

      // 4. Obtener los usuarios profesor únicos
      if (teacherIds.size === 0) {
        this.logger.debug(`No teachers found for family ${family.id}`);
        return [];
      }

      const teachers = await this.userRepository.find({
        where: { 
          id: In(Array.from(teacherIds)),
          isActive: true,
          role: UserRole.TEACHER
        },
        relations: ['profile'],
        order: { profile: { firstName: 'ASC' } }
      });

      this.logger.debug(`Found ${teachers.length} allowed teachers for family ${family.id}`);
      return teachers;
    } catch (error) {
      this.logger.error(`Error getting teachers for family ${familyUserId}:`, error);
      return [];
    }
  }

  // ==================== AVAILABLE RECIPIENTS ====================


  private async getAvailableRecipientsForAdmin(): Promise<any[]> {
    console.log('🔍 ADMIN METHOD CALLED: getAvailableRecipientsForAdmin');
    
    try {
      // Query SQL directa para obtener usuarios y familias con sus hijos
      console.log('🔍 ADMIN: Ejecutando query SQL directa para familias...');
      
      const usersWithFamilyInfo = await this.userRepository.query(`
        SELECT DISTINCT
          u.id,
          u.email,
          u.role,
          up."firstName",
          up."lastName",
          CASE 
            WHEN u.role = 'family' THEN string_agg(sup."firstName" || ' ' || sup."lastName", ' y ')
            ELSE NULL
          END as children_names
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up."userId"
        LEFT JOIN families f ON (f."primaryContactId" = u.id OR f."secondaryContactId" = u.id)
        LEFT JOIN family_students fs ON f.id = fs."familyId"
        LEFT JOIN students s ON fs."studentId" = s.id
        LEFT JOIN users su ON s."userId" = su.id
        LEFT JOIN user_profiles sup ON su.id = sup."userId"
        WHERE u."isActive" = true
        GROUP BY u.id, u.email, u.role, up."firstName", up."lastName"
        ORDER BY u.role, up."firstName"
      `);

      console.log(`🔍 ADMIN: Query exitosa, encontrados ${usersWithFamilyInfo.length} usuarios`);
      
      const recipients = usersWithFamilyInfo.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        profile: {
          firstName: user.firstName || 'Sin nombre',
          lastName: user.lastName || ''
        },
        displayName: `${user.firstName || 'Sin nombre'} ${user.lastName || ''} (${user.role})`.trim(),
        // Agregar familyInfo solo para familias que tienen hijos
        ...(user.role === 'family' && user.children_names ? {
          familyInfo: {
            children: user.children_names,
            childrenCount: user.children_names.split(' y ').length
          }
        } : {})
      }));

      const familiesWithChildren = recipients.filter(r => r.familyInfo);
      console.log(`🔍 ADMIN: Encontradas ${familiesWithChildren.length} familias con hijos`);
      console.log(`🔍 ADMIN: Ejemplo:`, familiesWithChildren.slice(0, 2));
      
      return recipients;
      
    } catch (error) {
      console.log(`❌ ERROR in getAvailableRecipientsForAdmin:`, error.message);
      console.log(`❌ ERROR STACK:`, error.stack);
      return [];
    }
  }

  private async getAvailableRecipientsForTeacher(teacherUserId: string): Promise<any[]> {
    console.log(`🚨🚨🚨 TEACHER METHOD START SIMPLE: getAvailableRecipientsForTeacher for userId ${teacherUserId} 🚨🚨🚨`);
    console.log(`🚨🚨🚨 TEACHER METHOD: INSIDE METHOD EXECUTING! 🚨🚨🚨`);
    try {
      const recipients = [];

      // Filtro RGPD: solo grupos donde el profesor es tutor o imparte asignatura ($1 = userId)
      const teacherGroupsFilter = `(
        cg."tutorId" IN (SELECT t.id FROM teachers t WHERE t."userId" = $1)
        OR cg.id IN (
          SELECT sa."classGroupId" FROM subject_assignments sa
          JOIN teachers t2 ON sa."teacherId" = t2.id WHERE t2."userId" = $1
        )
      )`;

      // 1. Familias SOLO de los alumnos del profesor (tutoría ∪ asignatura)
      const familiesWithChildren = await this.userRepository.query(`
        SELECT DISTINCT u.id, u.email, u.role, up."firstName", up."lastName",
          string_agg(sup."firstName" || ' ' || sup."lastName", ' y ') as children_names
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up."userId"
        JOIN families f ON (f."primaryContactId" = u.id OR f."secondaryContactId" = u.id)
        JOIN family_students fs ON f.id = fs."familyId"
        JOIN students s ON fs."studentId" = s.id
        JOIN class_students cs ON s.id = cs."studentId"
        JOIN class_groups cg ON cs."classId" = cg.id
        LEFT JOIN users su ON s."userId" = su.id
        LEFT JOIN user_profiles sup ON su.id = sup."userId"
        WHERE u."isActive" = true AND u.role = 'family' AND ${teacherGroupsFilter}
        GROUP BY u.id, u.email, u.role, up."firstName", up."lastName"
        ORDER BY up."firstName", up."lastName"
      `, [teacherUserId]);

      familiesWithChildren.forEach(user => {
        const recipientData: any = {
          id: user.id,
          email: user.email,
          role: user.role,
          profile: {
            firstName: user.firstName || 'Sin nombre',
            lastName: user.lastName || ''
          },
          displayName: `${user.firstName || 'Sin nombre'} ${user.lastName || ''} (${user.role})`.trim()
        };

        if (user.role === 'family' && user.children_names) {
          recipientData.familyInfo = {
            children: user.children_names,
            childrenCount: user.children_names.split(' y ').length
          };
        }

        recipients.push(recipientData);
      });

      // 2. Alumnos SOLO de los grupos del profesor
      const myStudents = await this.userRepository.query(`
        SELECT DISTINCT su.id, sup."firstName", sup."lastName"
        FROM students s
        JOIN users su ON s."userId" = su.id
        JOIN class_students cs ON s.id = cs."studentId"
        JOIN class_groups cg ON cs."classId" = cg.id
        LEFT JOIN user_profiles sup ON su.id = sup."userId"
        WHERE su."isActive" = true AND ${teacherGroupsFilter}
      `, [teacherUserId]);

      myStudents.forEach(studentUser => {
        recipients.push({
          id: studentUser.id,
          role: 'student',
          profile: {
            firstName: studentUser.firstName || 'N/A',
            lastName: studentUser.lastName || 'N/A'
          }
        });
      });

      // 3. Add ONLY ACTIVE teachers and admins (FIX for inexistent teachers)
      const teachersAndAdmins = await this.userRepository.find({
        where: [
          { role: UserRole.TEACHER, isActive: true },
          { role: UserRole.ADMIN, isActive: true }
        ],
        relations: ['profile']
      });

      teachersAndAdmins.forEach(user => {
        if (user.id !== teacherUserId) {
          recipients.push({
            id: user.id,
            role: user.role,
            profile: {
              firstName: user.profile?.firstName || 'N/A',
              lastName: user.profile?.lastName || 'N/A'
            }
          });
        }
      });

      console.log(`🚨🚨🚨 TEACHER SIMPLE METHOD: Returning ${recipients.length} total recipients 🚨🚨🚨`);
      return recipients;
    } catch (error) {
      console.error(`🚨🚨🚨 ERROR in getAvailableRecipientsForTeacher:`, error);
      this.logger.error(`Error getting available recipients for teacher ${teacherUserId}:`, error);
      return [];
    }
  }

  private async getAvailableRecipientsForStudent(studentUserId: string): Promise<any[]> {
    try {
      this.logger.debug(`Getting available recipients for student ${studentUserId}`);

      // Student can ONLY message:
      // 1. Administrators (for system/academic issues)
      // 2. Teachers who teach them (through subjects/class groups)
      // 3. Teachers who are tutors of their class

      const recipients = [];

      // Add administrators - students should be able to contact admin for system issues
      const administrators = await this.userRepository.find({
        where: { role: UserRole.ADMIN, isActive: true },
        relations: ['profile']
      });

      administrators.forEach(admin => {
        recipients.push({
          id: admin.id,
          role: 'admin',
          profile: {
            firstName: admin.profile?.firstName || 'Administrador',
            lastName: admin.profile?.lastName || 'Sistema'
          },
          context: 'Administrador del sistema'
        });
      });

      // Get student entity
      const student = await this.studentRepository.findOne({
        where: { user: { id: studentUserId } },
        relations: [
          'classGroups',
          'classGroups.tutor',
          'classGroups.tutor.user',
          'classGroups.tutor.user.profile'
        ]
      });

      if (!student) {
        this.logger.warn(`Student not found for user ${studentUserId}`);
        return recipients; // Return administrators at least
      }

      this.logger.debug(`Student found: ${student.id}, class groups: ${student.classGroups?.length || 0}`);

      // Add teachers from subject assignments in all class groups
      if (student.classGroups && student.classGroups.length > 0) {
        const classGroupIds = student.classGroups.map(cg => cg.id);
        const subjectAssignments = await this.subjectAssignmentRepository.find({
          where: { classGroupId: In(classGroupIds) },
          relations: ['teacher', 'teacher.user', 'teacher.user.profile', 'subject']
        });

        subjectAssignments.forEach(assignment => {
          if (assignment.teacher?.user) {
            recipients.push({
              id: assignment.teacher.user.id,
              role: 'teacher',
              profile: {
                firstName: assignment.teacher.user.profile?.firstName || 'N/A',
                lastName: assignment.teacher.user.profile?.lastName || 'N/A'
              },
              context: `Profesor/a de ${assignment.subject?.name || 'asignatura'}`
            });
          }
        });
      }

      // Add class tutors if different from subject teachers
      student.classGroups?.forEach(classGroup => {
        if (classGroup.tutor?.user) {
          const tutorExists = recipients.find(r => r.id === classGroup.tutor.user.id);
          if (!tutorExists) {
            recipients.push({
              id: classGroup.tutor.user.id,
              role: 'teacher', 
              profile: {
                firstName: classGroup.tutor.user.profile?.firstName || 'N/A',
                lastName: classGroup.tutor.user.profile?.lastName || 'N/A'
              },
              context: 'Tutor/a de clase'
            });
          }
        }
      });

      // 4. Add tutors from tutoring groups (NEW: BIDIRECTIONAL TUTORING SYSTEM)
      console.log(`🚨🚨🚨 STUDENT TUTORING GROUPS: Looking for tutoring groups for student ${student.id} 🚨🚨🚨`);

      const tutoringGroupTutors = await this.userRepository.query(`
        SELECT DISTINCT
          t.id as teacher_id,
          t."userId" as teacher_user_id,
          up."firstName" as teacher_firstname,
          up."lastName" as teacher_lastname,
          tg.name as tutoring_group_name
        FROM tutoring_students ts
        JOIN tutoring_groups tg ON ts."tutoringGroupId" = tg.id
        JOIN teachers t ON tg."tutorId" = t.id
        JOIN users u ON t."userId" = u.id
        JOIN user_profiles up ON u.id = up."userId"
        WHERE ts."studentId" = $1
          AND ts."isActive" = true
          AND tg."isActive" = true
          AND u."isActive" = true
      `, [student.id]);

      console.log(`🔍 STUDENT TUTORING GROUPS: Found ${tutoringGroupTutors.length} tutoring group tutors`);

      tutoringGroupTutors.forEach(tutor => {
        // Check if tutor doesn't already exist
        const tutorExists = recipients.find(r => r.id === tutor.teacher_user_id);
        if (!tutorExists) {
          recipients.push({
            id: tutor.teacher_user_id,
            role: 'teacher',
            profile: {
              firstName: tutor.teacher_firstname || 'N/A',
              lastName: tutor.teacher_lastname || 'N/A'
            },
            context: `Tutor/a de tutoría (${tutor.tutoring_group_name})`
          });
          console.log(`🔍 STUDENT TUTORING GROUPS: Added tutor ${tutor.teacher_firstname} ${tutor.teacher_lastname} from ${tutor.tutoring_group_name}`);
        } else {
          console.log(`🔍 STUDENT TUTORING GROUPS: Skipped duplicate tutor ${tutor.teacher_firstname} ${tutor.teacher_lastname}`);
        }
      });

      // Remove duplicates by id
      const uniqueRecipients = recipients.filter((recipient, index, self) =>
        index === self.findIndex(r => r.id === recipient.id)
      );

      this.logger.debug(`Student ${studentUserId} can message ${uniqueRecipients.length} teachers`);
      return uniqueRecipients;

    } catch (error) {
      this.logger.error(`Error getting recipients for student ${studentUserId}:`, error);
      return [];
    }
  }

  private async getAvailableRecipientsForFamily(familyUserId: string): Promise<any[]> {
    console.log('🚨🚨🚨 FAMILY METHOD CALLED: getAvailableRecipientsForFamily for userId:', familyUserId, '🚨🚨🚨');
    console.log('🔍 FAMILY METHOD CALLED: getAvailableRecipientsForFamily for userId:', familyUserId);

    try {
      const recipients = [];

      // 1. Obtener los hijos de esta familia
      const familyStudents = await this.userRepository.query(`
        SELECT DISTINCT
          s.id as student_id,
          s."userId" as student_user_id,
          sup."firstName" as student_firstname,
          sup."lastName" as student_lastname
        FROM families f
        LEFT JOIN family_students fs ON f.id = fs."familyId"
        LEFT JOIN students s ON fs."studentId" = s.id
        LEFT JOIN users su ON s."userId" = su.id
        LEFT JOIN user_profiles sup ON su.id = sup."userId"
        WHERE (f."primaryContactId" = $1 OR f."secondaryContactId" = $1)
          AND su."isActive" = true
      `, [familyUserId]);

      console.log(`🔍 FAMILY: Encontrados ${familyStudents.length} hijos para la familia`);

      if (familyStudents.length === 0) {
        console.log('🔍 FAMILY: Esta familia no tiene hijos asignados');
        // Solo administradores si no tiene hijos
        const admins = await this.userRepository.query(`
          SELECT u.id, u.email, u.role, up."firstName", up."lastName"
          FROM users u
          LEFT JOIN user_profiles up ON u.id = up."userId"
          WHERE u."isActive" = true AND u.role = 'admin'
          ORDER BY up."firstName"
        `);

        return admins.map(admin => ({
          id: admin.id,
          email: admin.email,
          role: admin.role,
          profile: {
            firstName: admin.firstName || 'Sin nombre',
            lastName: admin.lastName || ''
          },
          displayName: `${admin.firstName || 'Sin nombre'} ${admin.lastName || ''} (Administrador)`.trim()
        }));
      }

      const studentIds = familyStudents.map(fs => fs.student_id);

      // 2. Obtener TUTORES de los hijos (de grupos de tutoría)
      const tutors = await this.userRepository.query(`
        SELECT DISTINCT
          tu.id as tutor_id,
          tu.email as tutor_email,
          tup."firstName" as tutor_firstname,
          tup."lastName" as tutor_lastname,
          tg.name as tutoring_group_name
        FROM tutoring_students ts
        LEFT JOIN tutoring_groups tg ON ts."tutoringGroupId" = tg.id
        LEFT JOIN teachers t ON tg."tutorId" = t.id
        LEFT JOIN users tu ON t."userId" = tu.id
        LEFT JOIN user_profiles tup ON tu.id = tup."userId"
        WHERE ts."studentId" = ANY($1::uuid[])
          AND ts."isActive" = true
          AND tg."isActive" = true
          AND tu."isActive" = true
      `, [studentIds]);

      console.log(`🔍 FAMILY: Encontrados ${tutors.length} tutores`);

      // 3. Obtener PROFESORES que dan clases a los hijos (asignaciones de materias)
      const subjectTeachers = await this.userRepository.query(`
        SELECT DISTINCT
          tu.id as teacher_id,
          tu.email as teacher_email,
          tup."firstName" as teacher_firstname,
          tup."lastName" as teacher_lastname,
          sub.name as subject_name
        FROM students s
        LEFT JOIN class_students cs ON s.id = cs."studentId"
        LEFT JOIN class_groups cg ON cs."classId" = cg.id
        LEFT JOIN subject_assignments sa ON sa."classGroupId" = cg.id
        LEFT JOIN teachers t ON sa."teacherId" = t.id
        LEFT JOIN users tu ON t."userId" = tu.id
        LEFT JOIN user_profiles tup ON tu.id = tup."userId"
        LEFT JOIN subjects sub ON sa."subjectId" = sub.id
        WHERE s.id = ANY($1::uuid[])
          AND sa."teacherId" IS NOT NULL
          AND tu."isActive" = true
      `, [studentIds]);

      console.log(`🔍 FAMILY: Encontrados ${subjectTeachers.length} profesores de asignaturas`);

      // 4. Obtener ADMINISTRADORES (siempre permitidos)
      const admins = await this.userRepository.query(`
        SELECT u.id, u.email, u.role, up."firstName", up."lastName"
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up."userId"
        WHERE u."isActive" = true AND u.role = 'admin'
        ORDER BY up."firstName"
      `);

      console.log(`🔍 FAMILY: Encontrados ${admins.length} administradores`);

      // 5. Agregar tutores con información específica
      tutors.forEach(tutor => {
        recipients.push({
          id: tutor.tutor_id,
          // RGPD: NO exponer el email del profesor/tutor a las familias.
          role: 'teacher',
          profile: {
            firstName: tutor.tutor_firstname || 'Sin nombre',
            lastName: tutor.tutor_lastname || ''
          },
          displayName: `${tutor.tutor_firstname || 'Sin nombre'} ${tutor.tutor_lastname || ''} (Tutor - ${tutor.tutoring_group_name})`.trim(),
          teacherType: 'tutor',
          additionalInfo: tutor.tutoring_group_name
        });
      });

      // 6. Agregar profesores de asignaturas (evitando duplicados)
      const existingTeacherIds = new Set(recipients.map(r => r.id));
      subjectTeachers.forEach(teacher => {
        if (!existingTeacherIds.has(teacher.teacher_id)) {
          recipients.push({
            id: teacher.teacher_id,
            // RGPD: NO exponer el email del profesor a las familias.
            role: 'teacher',
            profile: {
              firstName: teacher.teacher_firstname || 'Sin nombre',
              lastName: teacher.teacher_lastname || ''
            },
            displayName: `${teacher.teacher_firstname || 'Sin nombre'} ${teacher.teacher_lastname || ''} (Profesor - ${teacher.subject_name})`.trim(),
            teacherType: 'subject',
            additionalInfo: teacher.subject_name
          });
          existingTeacherIds.add(teacher.teacher_id);
        }
      });

      // 7. Agregar administradores
      admins.forEach(admin => {
        recipients.push({
          id: admin.id,
          email: admin.email,
          role: admin.role,
          profile: {
            firstName: admin.firstName || 'Sin nombre',
            lastName: admin.lastName || ''
          },
          displayName: `${admin.firstName || 'Sin nombre'} ${admin.lastName || ''} (Administrador)`.trim()
        });
      });

      console.log(`🔍 FAMILY: Total de contactos permitidos: ${recipients.length}`);
      console.log(`🔍 FAMILY: Tipos: ${recipients.map(r => r.role).join(', ')}`);

      return recipients;

    } catch (error) {
      console.error('🔍 FAMILY ERROR:', error);
      this.logger.error('Error in getAvailableRecipientsForFamily:', error);
      return [];
    }
  }

  /* COMENTADO - Función duplicada
  async getAvailableGroups(userId: string): Promise<any[]> {
    try {
      // Get current user to determine role
      const currentUser = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['teacher']
      });

      if (!currentUser) {
        return [];
      }

      // Only teachers and admins can send group messages
      if (currentUser.role === UserRole.ADMIN) {
        // Admin can message any group
        const groups = await this.classGroupRepository.find({
          order: { name: 'ASC' }
        });
        
        return groups.map(group => ({
          id: group.id,
          name: group.name
        }));
      }

      if (currentUser.role === UserRole.TEACHER) {
        // RGPD: grupos donde el profesor es tutor O imparte una asignatura
        const groups = await this.classGroupRepository.query(`
          SELECT DISTINCT cg.id, cg.name FROM class_groups cg
          WHERE cg."tutorId" IN (SELECT t.id FROM teachers t WHERE t."userId" = $1)
             OR cg.id IN (
               SELECT sa."classGroupId" FROM subject_assignments sa
               JOIN teachers t2 ON sa."teacherId" = t2.id WHERE t2."userId" = $1
             )
          ORDER BY cg.name ASC
        `, [userId]);

        return groups.map(group => ({
          id: group.id,
          name: group.name
        }));
      }

      return [];
    } catch (error) {
      this.logger.error(`Error getting available groups for user ${userId}:`, error);
      return [];
    }
  }
  */ // FIN COMENTARIO - Función duplicada

  /**
   * Envío directo de email usando Resend (método que funciona 100%)
   * Patrón copiado de grade-notifications.service.ts
   */
  private async sendEmailDirectly(
    recipientEmail: string,
    subject: string,
    htmlContent: string,
    textContent: string,
  ): Promise<void> {
    try {
      this.logger.log(`📧 [DIRECT] Sending email to: ${recipientEmail}`);

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

      this.logger.log(`✅ [DIRECT] Email sent successfully to: ${recipientEmail} (ID: ${result.data?.id || 'unknown'})`);

    } catch (error) {
      this.logger.error(`❌ [DIRECT] Failed to send email to: ${recipientEmail}`, error);
      throw error;
    }
  }

  /**
   * Generar contenido HTML para notificación de nuevo mensaje
   * Basado en la misma estructura que grade-notifications.service.ts
   */
  private generateMessageNotificationHTML(templateData: any, message: Message): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nuevo Mensaje - ${templateData.senderName}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: #f8f9fa; color: #333; padding: 30px 20px; text-align: center; border-bottom: 1px solid #e9ecef; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .header p { margin: 5px 0 0; opacity: 0.7; color: #666; }
          .content { padding: 30px 20px; }
          .greeting { font-size: 16px; margin-bottom: 20px; }
          .message-card { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1890ff; }
          .message-header { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; }
          .sender-avatar { width: 50px; height: 50px; border-radius: 50%; background: #1890ff; color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; }
          .sender-info { flex: 1; }
          .sender-name { font-size: 18px; font-weight: 600; color: #1890ff; margin: 0; }
          .sender-role { color: #666; font-size: 14px; margin: 2px 0 0; }
          .message-details { margin: 15px 0; }
          .message-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .message-label { font-weight: 500; color: #666; }
          .message-value { font-weight: 600; }
          .message-preview { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #e6f7ff; }
          .preview-title { font-weight: 600; margin-bottom: 8px; color: #1890ff; }
          .preview-content { color: #555; font-style: italic; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; transition: transform 0.2s; }
          .btn:hover { transform: translateY(-2px); }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-top: 1px solid #e9ecef; }
          .footer-links { margin: 10px 0; }
          .footer-links a { color: #1890ff; text-decoration: none; margin: 0 10px; }
          @media (max-width: 600px) {
            .message-row { flex-direction: column; }
            .message-label, .message-value { margin: 2px 0; }
            .message-header { flex-direction: column; text-align: center; }
            .sender-info { text-align: center; margin-top: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-container" style="margin-bottom: 20px;">
              <img src="${templateData.platformUrl}/logo-MWSchool.png" alt="Mundo World School" style="max-width: 120px; height: auto;" onerror="this.style.display='none'">
            </div>
            <h1>Nuevo Mensaje Recibido</h1>
            <p>Mundo World School - Sistema de Comunicación</p>
          </div>

          <div class="content">
            <div class="greeting">
              <strong>Hola ${templateData.userName},</strong>
            </div>

            <p>Has recibido un nuevo mensaje en la plataforma Mundo World School.</p>

            <div class="message-card">
              <div class="message-header">
                <div class="sender-avatar">
                  ${templateData.senderInitials}
                </div>
                <div class="sender-info">
                  <h3 class="sender-name">${templateData.senderName}</h3>
                  <div class="sender-role">${templateData.senderRole}</div>
                </div>
              </div>

              <div class="message-details">
                <div class="message-row">
                  <span class="message-label">Asunto:</span>
                  <span class="message-value">${templateData.messageSubject}</span>
                </div>
                <div class="message-row">
                  <span class="message-label">Fecha:</span>
                  <span class="message-value">${templateData.messageDate}</span>
                </div>
              </div>

              <div class="message-preview">
                <div class="preview-title">Vista previa del mensaje:</div>
                <div class="preview-content">${templateData.messagePreview}</div>
              </div>
            </div>

            <div class="btn-container">
              <a href="${templateData.platformUrl}" class="btn">
                Leer Mensaje Completo
              </a>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              <strong>Importante:</strong> Este correo ha sido enviado automáticamente cuando recibiste un nuevo mensaje.
              Para responder y ver el contenido completo, accede a la plataforma.
            </p>
          </div>

          <div class="footer">
            <p><strong>Mundo World School</strong> - Sistema de Gestión Educativa</p>
            <div class="footer-links">
              <a href="${templateData.platformUrl}">Acceder a la Plataforma</a> |
              <a href="${templateData.platformUrl}/communications">Ver Mensajes</a>
            </div>
            <p style="font-size: 12px; margin-top: 15px;">
              ${templateData.schoolName} - Sistema de Comunicación Integrado<br>
              Para cambiar las notificaciones de correo, accede a tu perfil en la plataforma.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generar contenido de texto plano para notificación de nuevo mensaje
   */
  private generateMessageNotificationText(templateData: any, message: Message): string {
    return `
Nuevo Mensaje Recibido - Mundo World School

Hola ${templateData.userName},

Has recibido un nuevo mensaje en la plataforma Mundo World School.

DETALLES DEL MENSAJE:

De: ${templateData.senderName} (${templateData.senderRole})
Asunto: ${templateData.messageSubject}
Fecha: ${templateData.messageDate}

Vista previa del mensaje:
${templateData.messagePreview}

Para leer el mensaje completo y responder, accede a la plataforma:
${templateData.platformUrl}

---
Este correo ha sido generado automáticamente por la plataforma Mundo World School
Sistema de Gestión Educativa - ${templateData.schoolName}

Para cambiar las notificaciones de correo, accede a tu perfil en la plataforma.
    `.trim();
  }

  // ==================== TEACHER BULK MESSAGING ====================

  async sendMessageToTeacherStudents(teacherUserId: string, createMessageDto: Omit<CreateMessageDto, 'recipientIds' | 'targetGroupId'>): Promise<any> {
    const teacher = await this.userRepository.findOne({
      where: { id: teacherUserId, role: UserRole.TEACHER },
      relations: ['profile']
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    // Obtener todos los estudiantes de las clases del profesor
    const students = await this.getTeacherStudents(teacherUserId);

    if (students.length === 0) {
      throw new BadRequestException('No tienes estudiantes asignados en tus clases');
    }

    // Extraer IDs de estudiantes
    const studentIds = students.map(student => student.id);

    // Crear mensaje con múltiples destinatarios
    const bulkMessageDto: CreateMessageDto = {
      ...createMessageDto,
      recipientIds: studentIds
    };

    const result = await this.createMultipleMessages(teacherUserId, bulkMessageDto);

    return {
      success: true,
      message: `Mensaje enviado exitosamente a ${studentIds.length} estudiantes de tus clases`,
      recipientCount: studentIds.length,
      studentsReached: students.map(s => ({
        id: s.id,
        name: s.displayName,
        class: s.classGroup
      })),
      firstMessageId: result.id
    };
  }

  async getTeacherStudents(teacherUserId: string): Promise<any[]> {
    const teacher = await this.userRepository.findOne({
      where: { id: teacherUserId, role: UserRole.TEACHER }
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    // Obtener estudiantes de grupos donde el profesor es tutor
    const tutorStudents = await this.userRepository.query(`
      SELECT DISTINCT
        u.id,
        u.email,
        up."firstName",
        up."lastName",
        cg.name as class_name,
        cg.section as class_section
      FROM users u
      INNER JOIN user_profiles up ON u.id = up."userId"
      INNER JOIN students s ON u.id = s."userId"
      INNER JOIN class_groups cg ON s."classGroupId" = cg.id
      INNER JOIN teachers t ON cg."tutorId" = t.id
      WHERE t."userId" = $1
        AND u."isActive" = true
        AND u.role = 'student'
      ORDER BY up."firstName", up."lastName"
    `, [teacherUserId]);

    // Obtener estudiantes de asignaturas que enseña el profesor
    const subjectStudents = await this.userRepository.query(`
      SELECT DISTINCT
        u.id,
        u.email,
        up."firstName",
        up."lastName",
        cg.name as class_name,
        cg.section as class_section,
        sub.name as subject_name
      FROM users u
      INNER JOIN user_profiles up ON u.id = up."userId"
      INNER JOIN students s ON u.id = s."userId"
      INNER JOIN class_groups cg ON s."classGroupId" = cg.id
      INNER JOIN subject_assignments sa ON cg.id = sa."classGroupId"
      INNER JOIN teachers t ON sa."teacherId" = t.id
      INNER JOIN subjects sub ON sa."subjectId" = sub.id
      WHERE t."userId" = $1
        AND u."isActive" = true
        AND u.role = 'student'
      ORDER BY up."firstName", up."lastName"
    `, [teacherUserId]);

    // Combinar y eliminar duplicados
    const allStudentsMap = new Map();

    [...tutorStudents, ...subjectStudents].forEach(student => {
      if (!allStudentsMap.has(student.id)) {
        allStudentsMap.set(student.id, {
          id: student.id,
          email: student.email,
          role: 'student',
          profile: {
            firstName: student.firstName || 'N/A',
            lastName: student.lastName || 'N/A'
          },
          displayName: `${student.firstName || 'N/A'} ${student.lastName || 'N/A'}`.trim(),
          classGroup: student.class_section ?
            `${student.class_name} - ${student.class_section}` :
            student.class_name,
          subjectName: student.subject_name || null
        });
      }
    });

    return Array.from(allStudentsMap.values());
  }

  // ==================== BULK USER SELECTION ====================

  async getAvailableRecipientsForBulk(userId: string, filters?: {
    roles?: UserRole[];
    classGroups?: string[];
    subjects?: string[];
  }): Promise<any[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile']
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    let recipients = [];

    // Administradores pueden ver todos los usuarios
    if (user.role === UserRole.ADMIN) {
      recipients = await this.getAvailableRecipientsForAdmin();
    }
    // Profesores pueden ver familias, estudiantes de sus clases, y otros profesores
    else if (user.role === UserRole.TEACHER) {
      recipients = await this.getAvailableRecipientsForTeacher(userId);
    }
    // Familias solo pueden ver profesores y administradores relacionados
    else {
      recipients = await this.getAvailableRecipients(userId);
    }

    // Aplicar filtros si se proporcionan
    if (filters) {
      if (filters.roles && filters.roles.length > 0) {
        recipients = recipients.filter(r => filters.roles.includes(r.role as UserRole));
      }

      if (filters.classGroups && filters.classGroups.length > 0) {
        recipients = recipients.filter(r =>
          !r.classGroup || filters.classGroups.includes(r.classGroup)
        );
      }
    }

    return recipients;
  }

  /**
   * Obtener padres (familias) cuyos hijos están en los grupos de clase especificados
   * Deduplica automáticamente si un padre tiene múltiples hijos en los grupos seleccionados
   * @param classGroupIds Array de IDs de grupos de clase
   * @returns Array de usuarios (padres/contactos familiares) con información básica
   */
  async getParentsByClassGroups(classGroupIds: string[]): Promise<any[]> {
    if (!classGroupIds || classGroupIds.length === 0) {
      return [];
    }

    // Query para obtener padres únicos de estudiantes en los grupos especificados
    // Nota: students y class_groups tienen relación ManyToMany a través de class_students
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('families', 'family', 'family.primaryContactId = user.id OR family.secondaryContactId = user.id')
      .leftJoin('family_students', 'fs', 'fs.familyId = family.id')
      .leftJoin('students', 'student', 'student.id = fs.studentId')
      .leftJoin('class_students', 'cs', 'cs.studentId = student.id')
      .leftJoin('class_groups', 'cg', 'cg.id = cs.classId')
      .leftJoin('user_profiles', 'profile', 'profile.userId = user.id')
      .where('cg.id IN (:...classGroupIds)', { classGroupIds })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .select([
        'DISTINCT user.id as id',
        'user.email as email',
        'user.role as role',
        'profile.firstName as "firstName"',
        'profile.lastName as "lastName"',
        'profile.phone as phone',
        // Agregamos los nombres de los hijos para contexto adicional
        'string_agg(DISTINCT cg.name, \', \') as "classGroups"'
      ])
      .groupBy('user.id, user.email, user.role, profile.firstName, profile.lastName, profile.phone');

    const parents = await query.getRawMany();

    // Formatear la respuesta para que sea consistente con otros endpoints
    return parents.map(parent => ({
      id: parent.id,
      email: parent.email,
      role: parent.role,
      firstName: parent.firstName,
      lastName: parent.lastName,
      phone: parent.phone,
      displayName: parent.firstName && parent.lastName
        ? `${parent.firstName} ${parent.lastName}`
        : parent.email,
      classGroups: parent.classGroups, // Grupos de sus hijos
      description: `${parent.firstName || ''} ${parent.lastName || ''} - Grupos: ${parent.classGroups}`.trim()
    }));
  }

  // ==================== NOTIFICACIONES EMAIL ====================

  private async sendEmailNotification(message: Message, recipient: User): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Resend no está configurado, saltando notificación por email');
      return;
    }

    if (!recipient.email) {
      this.logger.warn(`Usuario ${recipient.id} no tiene email configurado`);
      return;
    }

    try {
      const emailData = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [recipient.email],
        subject: `Nuevo mensaje: ${message.subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h2 style="color: #343a40; margin-bottom: 20px;">
                📨 Nuevo Mensaje Recibido
              </h2>

              <div style="background-color: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                <h3 style="color: #495057; margin-bottom: 10px;">Asunto:</h3>
                <p style="font-size: 16px; font-weight: bold; color: #212529;">${message.subject}</p>

                <h3 style="color: #495057; margin-bottom: 10px;">De:</h3>
                <p style="color: #6c757d;">
                  ${message.sender.profile?.firstName || ''} ${message.sender.profile?.lastName || ''}
                </p>

                <h3 style="color: #495057; margin-bottom: 10px;">Tipo:</h3>
                <p style="color: #6c757d;">${this.getMessageTypeLabel(message.type)}</p>

                <h3 style="color: #495057; margin-bottom: 10px;">Prioridad:</h3>
                <p style="color: ${this.getPriorityColor(message.priority)}; font-weight: bold;">
                  ${this.getPriorityLabel(message.priority)}
                </p>
              </div>

              <div style="background-color: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                <h3 style="color: #495057; margin-bottom: 15px;">Vista previa del contenido:</h3>
                <div style="color: #6c757d; line-height: 1.6;">
                  ${this.truncateContent(message.content, 200)}
                </div>
              </div>

              <div style="text-align: center; margin-top: 30px;">
                <a href="https://plataforma.mundoworld.school/communications"
                   style="background-color: #007bff; color: white; padding: 12px 30px;
                          text-decoration: none; border-radius: 6px; font-weight: bold;
                          display: inline-block;">
                  Ver Mensaje Completo
                </a>
              </div>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;
                          text-align: center; color: #6c757d; font-size: 14px;">
                <p>Este es un mensaje automático de MW Panel - Sistema de Gestión Educativa</p>
                <p>No responda a este correo. Para responder al mensaje, acceda a la plataforma.</p>
              </div>
            </div>
          </div>
        `,
      };

      const result = await this.resend.emails.send(emailData);
      this.logger.log(`Email enviado exitosamente a ${recipient.email}: ${result.data?.id}`);

    } catch (error) {
      this.logger.error(`Error enviando email a ${recipient.email}: ${error.message}`);
      // No relanzar el error para no interrumpir el flujo de mensajes
    }
  }

  private getMessageTypeLabel(type: string): string {
    const labels = {
      'direct': 'Mensaje Directo',
      'group': 'Mensaje Grupal',
      'announcement': 'Comunicado Oficial',
      'notification': 'Notificación',
      'alert': 'Alerta',
      'reminder': 'Recordatorio'
    };
    return labels[type] || type;
  }

  private getPriorityLabel(priority: string): string {
    const labels = {
      'low': 'Baja',
      'normal': 'Normal',
      'high': 'Alta',
      'urgent': 'Urgente'
    };
    return labels[priority] || priority;
  }

  private getPriorityColor(priority: string): string {
    const colors = {
      'low': '#28a745',
      'normal': '#6c757d',
      'high': '#fd7e14',
      'urgent': '#dc3545'
    };
    return colors[priority] || '#6c757d';
  }

  private truncateContent(content: string, maxLength: number): string {
    if (!content) return '';

    // Remover HTML tags para la vista previa
    const textContent = content.replace(/<[^>]*>/g, '');

    if (textContent.length <= maxLength) {
      return textContent;
    }

    return textContent.substring(0, maxLength) + '...';
  }

  // ==================== ARCHIVOS ADJUNTOS ====================

  /**
   * Agregar múltiples archivos adjuntos a un mensaje
   */
  async addAttachmentsToMessage(messageId: string, files: Array<Express.Multer.File>): Promise<MessageAttachment[]> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    const attachments: MessageAttachment[] = [];

    for (const file of files) {
      const attachment = this.attachmentRepository.create({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        message,
        messageId,
      });

      const savedAttachment = await this.attachmentRepository.save(attachment);

      // Upload audio notes to Google Drive to avoid server disk usage
      if (file.mimetype.startsWith('audio/') && this.googleDriveService) {
        const localPath = file.path;
        try {
          const fileBuffer = fs.readFileSync(localPath);
          const driveResult = await this.googleDriveService.uploadVoiceNote(
            fileBuffer,
            file.originalname,
            file.mimetype,
          );
          if (driveResult) {
            savedAttachment.path = driveResult.downloadLink;
            await this.attachmentRepository.save(savedAttachment);
            fs.unlink(localPath, (err) => {
              if (err) this.logger.warn(`Could not delete local voice note ${localPath}: ${err.message}`);
            });
          }
        } catch (driveErr) {
          this.logger.warn(`Drive upload failed for voice note, keeping local file: ${driveErr.message}`);
        }
      }

      attachments.push(savedAttachment);
    }

    this.logger.log(`${attachments.length} archivos adjuntados al mensaje ${messageId}`);
    return attachments;
  }

  /**
   * Obtener archivo adjunto para descarga
   */
  async downloadAttachment(attachmentId: string, userId: string): Promise<MessageAttachment> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId },
      relations: ['message', 'message.sender', 'message.recipient'],
    });

    if (!attachment) {
      throw new NotFoundException('Archivo adjunto no encontrado');
    }

    // Obtener información del usuario para verificar roles
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    // Verificar permisos: solo el remitente, destinatario, admin o familia pueden descargar
    const message = attachment.message;

    // Admin siempre tiene acceso
    const isAdmin = user?.role === UserRole.ADMIN;

    // Verificar si es el sender o recipient
    const isDirectParticipant = message.senderId === userId || message.recipientId === userId;

    // Verificar si es familia y el mensaje es de/para sus hijos
    const isFamilyMember = (user as any)?.family && (
      (message.sender && (user as any).family.children.some(child => child.id === message.sender.id)) ||
      (message.recipient && (user as any).family.children.some(child => child.id === message.recipient.id))
    );

    // Verificar si es participante del grupo de chat (via conversationId)
    // Usamos raw SQL para evitar problemas con el query builder de TypeORM
    let isConversationParticipant = false;
    if (message.conversationId) {
      const result = await this.attachmentRepository.query(
        `SELECT 1 FROM conversation_participants WHERE "conversationId" = $1 AND "userId" = $2 LIMIT 1`,
        [message.conversationId, userId]
      );
      isConversationParticipant = result.length > 0;
    }

    // Verificar si es parte del grupo del mensaje (ClassGroup)
    const isInGroup = isConversationParticipant || await this.isUserInMessageGroup(userId, message.id);

    const isAuthorized = isAdmin || isDirectParticipant || isFamilyMember || isInGroup;

    if (!isAuthorized) {
      this.logger.warn(`Acceso denegado al attachment ${attachmentId} para usuario ${userId}`);
      throw new ForbiddenException('No tienes permisos para descargar este archivo');
    }

    return attachment;
  }

  /**
   * Verificar si un usuario es parte de un mensaje grupal
   */
  private async isUserInMessageGroup(userId: string, messageId: string): Promise<boolean> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['targetGroup', 'targetGroup.students', 'targetGroup.students.user'],
    });

    if (!message) {
      return false;
    }

    // Verificar si el usuario es participante de la conversación (chat de grupo)
    if (message.conversationId) {
      const count = await this.conversationRepository
        .createQueryBuilder('conv')
        .innerJoin('conv.participants', 'participant')
        .where('conv.id = :convId', { convId: message.conversationId })
        .andWhere('participant.id = :userId', { userId })
        .getCount();
      if (count > 0) return true;
    }

    if (!message.targetGroup) {
      return false;
    }

    // Verificar si el usuario es estudiante del grupo
    const isStudent = message.targetGroup.students.some(
      (student) => student.user.id === userId
    );

    if (isStudent) {
      return true;
    }

    // Verificar si el usuario es profesor del grupo: TUTOR del grupo O imparte
    // asignatura en él (criterio canónico RGPD, no solo subject-assignment).
    return this.teacherAccess.canTeacherAccessClassGroup(userId, message.targetGroup.id);
  }

  /**
   * Stream a voice-note attachment through the backend proxy.
   * Extracts the Drive file ID from the stored download URL and fetches
   * the raw audio bytes via the service-account credentials, returning
   * { buffer, mimeType, filename } so the controller can pipe them back
   * to the client with the correct Content-Type and Range support.
   *
   * Fallback: if the attachment is still stored on local disk (Drive upload
   * failed), reads the file directly from disk.
   */
  async streamAttachment(
    attachmentId: string,
    userId: string,
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    // Reuse the existing permission check
    const attachment = await this.downloadAttachment(attachmentId, userId);

    const isDriveUrl =
      attachment.path?.startsWith('https://drive.google.com') ||
      attachment.path?.startsWith('https://');

    if (isDriveUrl && this.googleDriveService) {
      // Extract the Drive file ID from either of:
      //   https://drive.google.com/uc?id=FILE_ID&export=download
      //   https://drive.google.com/file/d/FILE_ID/view?...
      let fileId: string | null = null;

      const ucMatch = attachment.path.match(/[?&]id=([^&]+)/);
      if (ucMatch) {
        fileId = ucMatch[1];
      } else {
        const fileMatch = attachment.path.match(/\/file\/d\/([^/?]+)/);
        if (fileMatch) fileId = fileMatch[1];
      }

      if (fileId) {
        try {
          const buffer = await this.googleDriveService.downloadFile(fileId);
          return {
            buffer,
            mimeType: attachment.mimeType || 'audio/webm',
            filename: attachment.originalName || attachment.filename,
          };
        } catch (driveErr) {
          this.logger.warn(
            `Drive stream failed for attachment ${attachmentId}: ${driveErr.message}`,
          );
          // fall through to local file fallback below
        }
      }
    }

    // Local file fallback
    if (attachment.path && !attachment.path.startsWith('https://')) {
      const buffer = fs.readFileSync(attachment.path);
      return {
        buffer,
        mimeType: attachment.mimeType || 'audio/webm',
        filename: attachment.originalName || attachment.filename,
      };
    }

    throw new NotFoundException('No se pudo obtener el contenido del archivo adjunto');
  }

  /**
   * Actualizar findOneMessage para incluir adjuntos
   */
  async findOneMessageWithAttachments(id: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id },
      relations: [
        'sender',
        'sender.profile',
        'recipient',
        'recipient.profile',
        'targetGroup',
        'relatedStudent',
        'relatedStudent.user',
        'relatedStudent.user.profile',
        'replies',
        'replies.sender',
        'replies.sender.profile',
        'attachments', // Incluir archivos adjuntos
      ],
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    return message;
  }
}