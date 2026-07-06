import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import { Repository, In } from 'typeorm';
import { Conversation, ConversationType } from '../entities/conversation.entity';
import { Message, MessageType, MessageStatus } from '../entities/message.entity';
import { MessageAttachment } from '../entities/message-attachment.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { ConversationReadStatus } from '../entities/conversation-read-status.entity';
import { ConversationAdmin } from '../entities/conversation-admin.entity';
import { MessageReadStatus } from '../entities/message-read-status.entity';
import {
  CreateGroupChatDto,
  UpdateGroupChatDto,
  ManageGroupMembersDto,
  SendGroupMessageDto,
  GroupChatSummaryDto,
  GroupChatDetailDto,
  GroupMessageDto,
} from '../dto/group-chat.dto';
import { formatDateLocal } from '../../../common/transformers/date.transformer';
import { GroupNotificationService } from './group-notification.service';
import { GoogleDriveService } from '../../educational-resources/services/google-drive.service';

@Injectable()
export class GroupChatsService {
  private readonly logger = new Logger(GroupChatsService.name);

  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(ConversationReadStatus)
    private readStatusRepository: Repository<ConversationReadStatus>,
    @InjectRepository(MessageAttachment)
    private attachmentRepository: Repository<MessageAttachment>,
    @InjectRepository(ConversationAdmin)
    private adminRepository: Repository<ConversationAdmin>,
    @InjectRepository(MessageReadStatus)
    private messageReadStatusRepository: Repository<MessageReadStatus>,
    @Inject(forwardRef(() => GroupNotificationService))
    private groupNotificationService: GroupNotificationService,
    @Optional() private readonly googleDriveService?: GoogleDriveService,
  ) {}

  /**
   * Verificar si el usuario es creador del grupo o admin
   */
  private async isGroupAdmin(userId: string, group: Conversation): Promise<boolean> {
    if (group.createdById === userId) {
      return true;
    }
    const adminRecord = await this.adminRepository.findOne({
      where: { conversationId: group.id, userId },
    });
    return !!adminRecord;
  }

  /**
   * Verificar si el usuario puede crear/administrar grupos
   * Solo admin y teacher pueden crear grupos
   */
  private canManageGroups(role: string): boolean {
    return role === UserRole.ADMIN || role === UserRole.TEACHER;
  }

  /**
   * Verificar si el usuario es creador del grupo o admin
   */
  private async canModifyGroup(userId: string, userRole: string, group: Conversation): Promise<boolean> {
    // Admin de la plataforma siempre puede
    if (userRole === UserRole.ADMIN) return true;
    
    // Verificar si es admin del grupo (creador o promovido)
    return this.isGroupAdmin(userId, group);
  }

  /**
   * Crear un nuevo grupo de chat
   */
  async createGroupChat(
    creatorId: string,
    dto: CreateGroupChatDto,
  ): Promise<GroupChatDetailDto> {
    const creator = await this.userRepository.findOne({
      where: { id: creatorId },
      relations: ['profile'],
    });

    if (!creator) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar permisos - solo admin y teacher
    if (!this.canManageGroups(creator.role)) {
      throw new ForbiddenException('No tienes permisos para crear grupos de chat');
    }

    // Verificar que los participantes existen
    const participants = await this.userRepository.find({
      where: { id: In(dto.participantIds) },
      relations: ['profile'],
    });

    if (participants.length !== dto.participantIds.length) {
      throw new BadRequestException('Algunos participantes no fueron encontrados');
    }

    // Agregar al creador como participante si no esta incluido
    const allParticipants = participants.find(p => p.id === creatorId)
      ? participants
      : [creator, ...participants];

    // Crear la conversacion de grupo
    const group = this.conversationRepository.create({
      title: dto.title,
      description: dto.description,
      type: ConversationType.GROUP,
      participants: allParticipants,
      createdBy: creator,
      createdById: creatorId,
      isActive: true,
      isArchived: false,
      lastMessageAt: new Date(),
    });

    const savedGroup = await this.conversationRepository.save(group);

    // Si hay mensaje inicial, crearlo
    if (dto.initialMessage) {
      await this.sendGroupMessage(creatorId, savedGroup.id, {
        content: dto.initialMessage,
        contentType: 'html',
      });
    }

    return this.getGroupDetail(creatorId, savedGroup.id);
  }

  /**
   * Promover un miembro a admin del grupo
   */
  async promoteToAdmin(
    promoterId: string,
    groupId: string,
    memberIdToPromote: string,
  ): Promise<GroupChatDetailDto> {
    const promoter = await this.userRepository.findOne({ where: { id: promoterId } });
    if (!promoter) throw new NotFoundException('Usuario promotor no encontrado');

    const group = await this.conversationRepository.findOne({
      where: { id: groupId, type: ConversationType.GROUP },
      relations: ['participants'],
    });
    if (!group) throw new NotFoundException('Grupo no encontrado');

    // Solo un admin del grupo puede promover a otros
    if (!(await this.isGroupAdmin(promoterId, group)) && promoter.role !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permisos para promover administradores en este grupo.');
    }

    // Verificar que el usuario a promover es miembro
    const memberToPromote = group.participants.find(p => p.id === memberIdToPromote);
    if (!memberToPromote) {
      throw new BadRequestException('El usuario a promover no es miembro de este grupo.');
    }

    // Verificar que no sea ya admin
    if (await this.isGroupAdmin(memberIdToPromote, group)) {
      throw new BadRequestException('Este usuario ya es un administrador.');
    }

    // Crear el registro de admin
    const newAdmin = this.adminRepository.create({
      conversationId: groupId,
      userId: memberIdToPromote,
    });
    await this.adminRepository.save(newAdmin);

    return this.getGroupDetail(promoterId, groupId);
  }

  /**
   * Revocar a un miembro como admin del grupo
   */
  async demoteAdmin(
    demoterId: string,
    groupId: string,
    memberIdToDemote: string,
  ): Promise<GroupChatDetailDto> {
    const demoter = await this.userRepository.findOne({ where: { id: demoterId } });
    if (!demoter) throw new NotFoundException('Usuario revocador no encontrado');

    const group = await this.conversationRepository.findOne({
      where: { id: groupId, type: ConversationType.GROUP },
      relations: ['participants'],
    });
    if (!group) throw new NotFoundException('Grupo no encontrado');

    // Solo un admin del grupo puede revocar a otros
    if (!(await this.isGroupAdmin(demoterId, group)) && demoter.role !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permisos para revocar administradores en este grupo.');
    }
    
    // El creador del grupo no puede ser revocado
    if (memberIdToDemote === group.createdById) {
      throw new BadRequestException('No se puede revocar al creador del grupo.');
    }

    // Verificar que el usuario a revocar es admin
    const adminRecord = await this.adminRepository.findOne({
      where: { conversationId: groupId, userId: memberIdToDemote },
    });
    if (!adminRecord) {
      throw new BadRequestException('Este usuario no es un administrador.');
    }

    // Eliminar el registro de admin
    await this.adminRepository.remove(adminRecord);

    return this.getGroupDetail(demoterId, groupId);
  }

  /**
   * Obtener todos los grupos donde el usuario es participante
   */
  async getGroupsForUser(userId: string): Promise<GroupChatSummaryDto[]> {
    const groups = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participants', 'participant')
      .leftJoinAndSelect('participant.profile', 'participantProfile')
      .leftJoinAndSelect('conversation.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.profile', 'createdByProfile')
      .where('conversation.type = :type', { type: ConversationType.GROUP })
      .andWhere('participant.id = :userId', { userId })
      .andWhere('conversation.isActive = true')
      .andWhere('conversation.isArchived = false')
      .orderBy('conversation.lastMessageAt', 'DESC')
      .getMany();

    const summaries: GroupChatSummaryDto[] = [];

    for (const group of groups) {
      // Obtener ultimo mensaje del grupo
      const lastMessage = await this.messageRepository.findOne({
        where: {
          type: MessageType.GROUP,
          conversationId: group.id,  // Usamos conversationId en lugar de targetGroupId para grupos de chat
          isDeleted: false,
        },
        relations: ['sender', 'sender.profile'],
        order: { createdAt: 'DESC' },
      });

      // Contar mensajes no leidos para este usuario
      const unreadCount = await this.getUnreadCountForGroup(userId, group.id);

      summaries.push({
        id: group.id,
        title: group.title,
        description: group.description,
        avatarUrl: group.avatarUrl,
        type: group.type,
        participantCount: group.participants.length,
        unreadCount,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content.substring(0, 100),
              sender: {
                id: lastMessage.sender.id,
                firstName: lastMessage.sender.profile?.firstName || '',
                lastName: lastMessage.sender.profile?.lastName || '',
              },
              createdAt: formatDateLocal(lastMessage.createdAt),
            }
          : undefined,
        // lastMessageAt ya viene formateado por el DateTransformer de la entidad
        lastMessageAt: (group.lastMessageAt as unknown as string) || undefined,
        isActive: group.isActive,
        isArchived: group.isArchived,
        // createdAt ya viene formateado por el ReadOnlyDateTransformer de la entidad
        createdAt: group.createdAt as unknown as string,
        createdBy: group.createdBy
          ? {
              id: group.createdBy.id,
              firstName: group.createdBy.profile?.firstName || '',
              lastName: group.createdBy.profile?.lastName || '',
              role: group.createdBy.role,
            }
          : undefined,
      });
    }

    return summaries;
  }

  /**
   * Obtener detalle de un grupo
   */
  async getGroupDetail(userId: string, groupId: string): Promise<GroupChatDetailDto> {
    const group = await this.conversationRepository.findOne({
      where: { id: groupId, type: ConversationType.GROUP },
      relations: ['participants', 'participants.profile', 'createdBy', 'createdBy.profile'],
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    // Verificar que el usuario es participante
    const isParticipant = group.participants.some(p => p.id === userId);
    if (!isParticipant) {
      throw new ForbiddenException('No tienes acceso a este grupo');
    }

    // Obtener la lista de admins para este grupo
    const groupAdmins = await this.adminRepository.find({
      where: { conversationId: groupId },
    });
    const adminUserIds = new Set(groupAdmins.map(a => a.userId));
    
    // El creador siempre es admin
    if (group.createdById) {
      adminUserIds.add(group.createdById);
    }

    return {
      id: group.id,
      title: group.title,
      description: group.description,
      avatarUrl: group.avatarUrl,
      type: group.type,
      participants: group.participants.map(p => ({
        id: p.id,
        firstName: p.profile?.firstName || '',
        lastName: p.profile?.lastName || '',
        // email quitado por protección de datos
        role: p.role,
        avatarUrl: p.profile?.avatarUrl,
        isCreator: p.id === group.createdById,
        isAdmin: adminUserIds.has(p.id),
      })),
      participantCount: group.participants.length,
      isActive: group.isActive,
      isArchived: group.isArchived,
      // createdAt ya viene formateado por el ReadOnlyDateTransformer de la entidad
      createdAt: group.createdAt as unknown as string,
      createdById: group.createdById,
      createdBy: group.createdBy
        ? {
            id: group.createdBy.id,
            firstName: group.createdBy.profile?.firstName || '',
            lastName: group.createdBy.profile?.lastName || '',
            role: group.createdBy.role,
          }
        : undefined,
    };
  }

  /**
   * Actualizar un grupo
   */
  async updateGroup(
    userId: string,
    groupId: string,
    dto: UpdateGroupChatDto,
  ): Promise<GroupChatDetailDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const group = await this.conversationRepository.findOne({
      where: { id: groupId, type: ConversationType.GROUP },
      relations: ['participants'],
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    // Verificar permisos
    if (!await this.canModifyGroup(userId, user.role, group)) {
      throw new ForbiddenException('No tienes permisos para modificar este grupo');
    }

    // Actualizar campos
    if (dto.title !== undefined) group.title = dto.title;
    if (dto.description !== undefined) group.description = dto.description;
    if (dto.avatarUrl !== undefined) group.avatarUrl = dto.avatarUrl;

    await this.conversationRepository.save(group);

    return this.getGroupDetail(userId, groupId);
  }

  /**
   * Agregar miembros al grupo
   */
  async addMembers(
    adminId: string,
    groupId: string,
    dto: ManageGroupMembersDto,
  ): Promise<GroupChatDetailDto> {
    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const group = await this.conversationRepository.findOne({
      where: { id: groupId, type: ConversationType.GROUP },
      relations: ['participants'],
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    // Verificar permisos
    if (!await this.canModifyGroup(adminId, admin.role, group)) {
      throw new ForbiddenException('No tienes permisos para agregar miembros a este grupo');
    }

    // Obtener usuarios a agregar
    const newMembers = await this.userRepository.find({
      where: { id: In(dto.userIds) },
    });

    if (newMembers.length !== dto.userIds.length) {
      throw new BadRequestException('Algunos usuarios no fueron encontrados');
    }

    // Filtrar usuarios que ya son participantes
    const existingIds = group.participants.map(p => p.id);
    const membersToAdd = newMembers.filter(m => !existingIds.includes(m.id));

    if (membersToAdd.length === 0) {
      throw new BadRequestException('Todos los usuarios ya son miembros del grupo');
    }

    // Verificar limite de participantes
    if (group.participants.length + membersToAdd.length > 256) {
      throw new BadRequestException('No se pueden agregar mas de 256 participantes al grupo');
    }

    // Agregar nuevos miembros
    group.participants = [...group.participants, ...membersToAdd];
    await this.conversationRepository.save(group);

    return this.getGroupDetail(adminId, groupId);
  }

  /**
   * Quitar un miembro del grupo
   */
  async removeMember(
    adminId: string,
    groupId: string,
    memberIdToRemove: string,
  ): Promise<GroupChatDetailDto> {
    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const group = await this.conversationRepository.findOne({
      where: { id: groupId, type: ConversationType.GROUP },
      relations: ['participants'],
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    // Verificar permisos
    if (!await this.canModifyGroup(adminId, admin.role, group)) {
      throw new ForbiddenException('No tienes permisos para quitar miembros de este grupo');
    }

    // No se puede quitar al creador
    if (memberIdToRemove === group.createdById) {
      throw new BadRequestException('No se puede quitar al creador del grupo');
    }

    // Verificar que el miembro existe en el grupo
    const memberIndex = group.participants.findIndex(p => p.id === memberIdToRemove);
    if (memberIndex === -1) {
      throw new BadRequestException('El usuario no es miembro de este grupo');
    }

    // Quitar miembro
    group.participants.splice(memberIndex, 1);
    await this.conversationRepository.save(group);

    return this.getGroupDetail(adminId, groupId);
  }

  /**
   * Abandonar un grupo
   */
  async leaveGroup(userId: string, groupId: string): Promise<void> {
    const group = await this.conversationRepository.findOne({
      where: { id: groupId, type: ConversationType.GROUP },
      relations: ['participants'],
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    // Verificar que es participante
    const isParticipant = group.participants.some(p => p.id === userId);
    if (!isParticipant) {
      throw new BadRequestException('No eres miembro de este grupo');
    }

    // El creador no puede abandonar
    if (group.createdById === userId) {
      throw new BadRequestException('El creador no puede abandonar el grupo. Transfiere la propiedad primero o elimina el grupo.');
    }

    // Quitar al usuario de los participantes
    group.participants = group.participants.filter(p => p.id !== userId);
    await this.conversationRepository.save(group);
  }

  /**
   * Enviar mensaje al grupo
   */
  async sendGroupMessage(
    senderId: string,
    groupId: string,
    dto: SendGroupMessageDto,
  ): Promise<GroupMessageDto> {
    const sender = await this.userRepository.findOne({
      where: { id: senderId },
      relations: ['profile'],
    });

    if (!sender) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const group = await this.conversationRepository.findOne({
      where: { id: groupId, type: ConversationType.GROUP },
      relations: ['participants'],
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    // Verificar que es participante
    const isParticipant = group.participants.some(p => p.id === senderId);
    if (!isParticipant) {
      throw new ForbiddenException('No tienes acceso a este grupo');
    }

    // Crear el mensaje
    const message = this.messageRepository.create({
      subject: `Mensaje en ${group.title}`,
      content: dto.content,
      contentType: dto.contentType || 'html',
      type: MessageType.GROUP,
      status: MessageStatus.SENT,
      sender,
      senderId,
      conversationId: groupId,  // Usamos conversationId para grupos de chat (targetGroupId es para ClassGroups)
      isRead: false,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Actualizar timestamp del grupo
    group.lastMessageAt = new Date();
    await this.conversationRepository.save(group);

    // Encolar notificación para digest horario
    try {
      await this.groupNotificationService.queueGroupMessageNotification(
        groupId,
        savedMessage.id,
        senderId,
      );
    } catch (error) {
      // No fallar si la notificación falla, solo loguear
      console.error('Error queuing group notification:', error);
    }

    return {
      id: savedMessage.id,
      content: savedMessage.content,
      contentType: savedMessage.contentType as 'text' | 'html' | 'markdown',
      sender: {
        id: sender.id,
        firstName: sender.profile?.firstName || '',
        lastName: sender.profile?.lastName || '',
        role: sender.role,
        avatarUrl: sender.profile?.avatarUrl,
      },
      isRead: savedMessage.isRead,
      createdAt: formatDateLocal(savedMessage.createdAt),
    };
  }

  /**
   * Enviar mensaje al grupo con archivos adjuntos
   */
  async sendGroupMessageWithAttachments(
    senderId: string,
    groupId: string,
    dto: SendGroupMessageDto,
    files: Express.Multer.File[],
  ): Promise<GroupMessageDto> {
    const sender = await this.userRepository.findOne({
      where: { id: senderId },
      relations: ['profile'],
    });

    if (!sender) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const group = await this.conversationRepository.findOne({
      where: { id: groupId, type: ConversationType.GROUP },
      relations: ['participants'],
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    // Verificar que es participante
    const isParticipant = group.participants.some(p => p.id === senderId);
    if (!isParticipant) {
      throw new ForbiddenException('No tienes acceso a este grupo');
    }

    // Crear el mensaje
    const message = this.messageRepository.create({
      subject: `Mensaje en ${group.title}`,
      content: dto.content || '',
      contentType: dto.contentType || 'html',
      type: MessageType.GROUP,
      status: MessageStatus.SENT,
      sender,
      senderId,
      conversationId: groupId,
      isRead: false,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Guardar adjuntos si hay archivos
    const savedAttachments: MessageAttachment[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const attachment = this.attachmentRepository.create({
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: file.path,
          messageId: savedMessage.id,
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

        savedAttachments.push(savedAttachment);
      }
    }

    // Actualizar timestamp del grupo
    group.lastMessageAt = new Date();
    await this.conversationRepository.save(group);

    // Encolar notificación para digest horario
    try {
      await this.groupNotificationService.queueGroupMessageNotification(
        groupId,
        savedMessage.id,
        senderId,
      );
    } catch (error) {
      // No fallar si la notificación falla, solo loguear
      console.error('Error queuing group notification:', error);
    }

    return {
      id: savedMessage.id,
      content: savedMessage.content,
      contentType: savedMessage.contentType as 'text' | 'html' | 'markdown',
      sender: {
        id: sender.id,
        firstName: sender.profile?.firstName || '',
        lastName: sender.profile?.lastName || '',
        role: sender.role,
        avatarUrl: sender.profile?.avatarUrl,
      },
      isRead: savedMessage.isRead,
      createdAt: formatDateLocal(savedMessage.createdAt),
      attachments: savedAttachments.map(att => ({
        id: att.id,
        filename: att.filename,
        originalName: att.originalName,
        mimeType: att.mimeType,
        size: att.size,
        url: att.path?.startsWith('https://') ? att.path : undefined,
      })),
    };
  }

  /**
   * Obtener mensajes del grupo con paginacion
   */
  async getGroupMessages(
    userId: string,
    groupId: string,
    limit: number = 500,
    offset: number = 0,
  ): Promise<GroupMessageDto[]> {
    const group = await this.conversationRepository.findOne({
      where: { id: groupId, type: ConversationType.GROUP },
      relations: ['participants'],
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    const isParticipant = group.participants.some(p => p.id === userId);
    if (!isParticipant) {
      throw new ForbiddenException('No tienes acceso a este grupo');
    }

    const totalCount = await this.messageRepository.count({
      where: {
        type: MessageType.GROUP,
        conversationId: groupId,
        isDeleted: false,
      },
    });

    const userIsAdmin = await this.isGroupAdmin(userId, group);

    // Fetch newest messages first (DESC), then reverse to display in chronological order
    const messages = await this.messageRepository.find({
      where: {
        type: MessageType.GROUP,
        conversationId: groupId,
        isDeleted: false,
      },
      relations: ['sender', 'sender.profile', 'attachments'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    messages.reverse();

    const messageDtos: GroupMessageDto[] = [];

    for (const msg of messages) {
      const dto: GroupMessageDto = {
        id: msg.id,
        content: msg.content,
        contentType: msg.contentType as 'text' | 'html' | 'markdown',
        sender: {
          id: msg.sender.id,
          firstName: msg.sender.profile?.firstName || '',
          lastName: msg.sender.profile?.lastName || '',
          role: msg.sender.role,
          avatarUrl: msg.sender.profile?.avatarUrl,
        },
        isRead: msg.isRead, // This likely refers to the sender's own read status, might need review
        readAt: msg.readAt ? formatDateLocal(msg.readAt) : undefined,
        createdAt: formatDateLocal(msg.createdAt),
        isEdited: msg.isEdited,
        editedAt: msg.editedAt ? formatDateLocal(msg.editedAt) : undefined,
        attachments: msg.attachments?.map(att => ({
          id: att.id,
          filename: att.filename,
          originalName: att.originalName,
          mimeType: att.mimeType,
          size: att.size,
          url: att.path?.startsWith('https://') ? att.path : undefined,
        })),
      };

      // Mostrar seenBy a TODOS los participantes del grupo, no solo admins
      const readStatuses = await this.messageReadStatusRepository.find({
        where: { messageId: msg.id },
        relations: ['user', 'user.profile'],
      });
      dto.seenBy = readStatuses.map(rs => ({
        userId: rs.userId,
        firstName: rs.user.profile?.firstName || '',
        lastName: rs.user.profile?.lastName || '',
        readAt: formatDateLocal(rs.readAt),
        viewCount: rs.viewCount || 1,
      }));

      messageDtos.push(dto);
    }

    return messageDtos;
  }

  /**
   * Marcar un mensaje específico como leído
   */
  async markMessageAsRead(userId: string, messageId: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message || !message.conversationId) {
      throw new NotFoundException('Mensaje o conversación asociada no encontrados.');
    }

    const conversation = await this.conversationRepository.findOne({
        where: { id: message.conversationId },
        relations: ['participants'],
    });

    if (!conversation) {
        throw new NotFoundException('La conversación asociada al mensaje no fue encontrada.');
    }

    const isParticipant = conversation.participants.some(p => p.id === userId);
    if (!isParticipant) {
      throw new ForbiddenException('No eres miembro del grupo de este mensaje.');
    }

    const existingReadStatus = await this.messageReadStatusRepository.findOne({
      where: { userId, messageId },
    });

    if (existingReadStatus) {
      // Incrementar contador de vistas
      existingReadStatus.viewCount = (existingReadStatus.viewCount || 1) + 1;
      await this.messageReadStatusRepository.save(existingReadStatus);
      return;
    }

    const newReadStatus = this.messageReadStatusRepository.create({
      userId,
      messageId,
      groupId: message.conversationId,
    });

    await this.messageReadStatusRepository.save(newReadStatus);
  }

  /**
   * Contar mensajes no leidos en un grupo para un usuario
   */
  private async getUnreadCountForGroup(userId: string, groupId: string): Promise<number> {
    // Para grupos, contamos mensajes que:
    // - Son del tipo GROUP
    // - Pertenecen a este grupo
    // - No fueron enviados por el usuario
    // - No estan marcados como leidos por el usuario
    // Como los grupos no tienen tracking individual de lectura por ahora,
    // simplemente contamos mensajes recientes que no son del usuario
    const lastRead = await this.getLastReadTimestamp(userId, groupId);

    const count = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.type = :type', { type: MessageType.GROUP })
      .andWhere('message.conversationId = :groupId', { groupId })  // Usamos conversationId para grupos de chat
      .andWhere('message.senderId != :userId', { userId })
      .andWhere('message.isDeleted = false')
      .andWhere('message.createdAt > :lastRead', { lastRead: lastRead || new Date(0) })
      .getCount();

    return count;
  }

  /**
   * Obtener el ultimo timestamp de lectura del usuario en un grupo
   * Usa la tabla conversation_read_status para tracking individual
   */
  private async getLastReadTimestamp(userId: string, groupId: string): Promise<Date | null> {
    const readStatus = await this.readStatusRepository.findOne({
      where: { userId, conversationId: groupId },
    });

    return readStatus?.lastReadAt || null;
  }

  /**
   * Marcar mensajes como leidos en un grupo para un usuario específico
   * Usa la tabla conversation_read_status para tracking individual
   * También crea registros en message_read_status para tracking de "visto por"
   */
  async markGroupAsRead(userId: string, groupId: string): Promise<void> {
    const group = await this.conversationRepository.findOne({
      where: { id: groupId, type: ConversationType.GROUP },
      relations: ['participants'],
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    // Verificar que es participante
    const isParticipant = group.participants.some(p => p.id === userId);
    if (!isParticipant) {
      throw new ForbiddenException('No tienes acceso a este grupo');
    }

    const now = new Date();

    // Obtener todos los mensajes del grupo que no han sido leídos por este usuario
    const allMessages = await this.messageRepository.find({
      where: {
        conversationId: groupId,
        type: MessageType.GROUP,
        isDeleted: false,
      },
    });

    // Crear registros de lectura individual para cada mensaje no leído
    for (const message of allMessages) {
      // No marcar mensajes propios como leídos
      if (message.senderId === userId) continue;

      // Verificar si ya existe registro de lectura para este mensaje
      const existingReadStatus = await this.messageReadStatusRepository.findOne({
        where: { userId, messageId: message.id },
      });

      if (!existingReadStatus) {
        try {
          const newReadStatus = this.messageReadStatusRepository.create({
            userId,
            messageId: message.id,
            groupId,
          });
          await this.messageReadStatusRepository.save(newReadStatus);
        } catch (error) {
          // Ignorar errores de duplicados (constraint unique)
          if (!error.message?.includes('duplicate')) {
            this.logger.warn(`Error creating read status for message ${message.id}: ${error.message}`);
          }
        }
      }
    }

    // Upsert: Actualizar o crear el registro de lectura de conversación para este usuario
    const existingStatus = await this.readStatusRepository.findOne({
      where: { userId, conversationId: groupId },
    });

    if (existingStatus) {
      // Actualizar el timestamp
      existingStatus.lastReadAt = now;
      await this.readStatusRepository.save(existingStatus);
      this.logger.debug(`Updated read status for user ${userId} in group ${groupId}`);
    } else {
      // Crear nuevo registro
      const newStatus = this.readStatusRepository.create({
        userId,
        conversationId: groupId,
        lastReadAt: now,
      });
      await this.readStatusRepository.save(newStatus);
      this.logger.debug(`Created read status for user ${userId} in group ${groupId}`);
    }
  }

  /**
   * Marcar grupo como no leído (eliminar estados de lectura del usuario)
   */
  async markGroupAsUnread(userId: string, groupId: string): Promise<void> {
    const group = await this.conversationRepository.findOne({
      where: { id: groupId, type: ConversationType.GROUP },
      relations: ['participants'],
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    const isParticipant = group.participants.some(p => p.id === userId);
    if (!isParticipant) {
      throw new ForbiddenException('No tienes acceso a este grupo');
    }

    // Get message IDs for this group
    const messageIds = await this.messageRepository.find({
      where: {
        conversationId: groupId,
        type: MessageType.GROUP,
        isDeleted: false,
      },
      select: ['id'],
    });

    if (messageIds.length > 0) {
      // Delete read statuses for this user in this group
      await this.messageReadStatusRepository.delete({
        userId: userId,
        messageId: In(messageIds.map(m => m.id)),
      });
    }

    // Also delete the conversation-level read status
    await this.readStatusRepository.delete({
      userId: userId,
      conversationId: groupId,
    });
  }

  /**
   * Archivar un grupo
   */
  async archiveGroup(userId: string, groupId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const group = await this.conversationRepository.findOne({
      where: { id: groupId, type: ConversationType.GROUP },
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    // Verificar permisos
    if (!await this.canModifyGroup(userId, user.role, group)) {
      throw new ForbiddenException('No tienes permisos para archivar este grupo');
    }

    group.isArchived = true;
    await this.conversationRepository.save(group);
  }

  /**
   * Desarchivar un grupo
   */
  async unarchiveGroup(userId: string, groupId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const group = await this.conversationRepository.findOne({
      where: { id: groupId, type: ConversationType.GROUP },
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    // Verificar permisos
    if (!await this.canModifyGroup(userId, user.role, group)) {
      throw new ForbiddenException('No tienes permisos para desarchivar este grupo');
    }

    group.isArchived = false;
    await this.conversationRepository.save(group);
  }

  /**
   * Eliminar un grupo (solo admin o creador)
   */
  async deleteGroup(userId: string, groupId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const group = await this.conversationRepository.findOne({
      where: { id: groupId, type: ConversationType.GROUP },
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    // Solo admin o creador pueden eliminar
    if (user.role !== UserRole.ADMIN && group.createdById !== userId) {
      throw new ForbiddenException('Solo el administrador o el creador pueden eliminar el grupo');
    }

    // Soft delete - marcar como inactivo
    group.isActive = false;
    await this.conversationRepository.save(group);
  }

  /**
   * Obtener usuarios disponibles para agregar a un grupo
   */
  async getAvailableUsersForGroup(userId: string): Promise<any[]> {
    const users = await this.userRepository.find({
      where: { isActive: true },
      relations: ['profile'],
      order: { role: 'ASC' },
    });

    return users
      .filter(u => u.id !== userId)
      .map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        firstName: u.profile?.firstName || '',
        lastName: u.profile?.lastName || '',
        fullName: `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim(),
      }));
  }

  /**
   * Obtener el conteo total de mensajes no leídos en todos los grupos del usuario
   */
  async getTotalUnreadCount(userId: string): Promise<{ count: number; groups: { groupId: string; groupTitle: string; unreadCount: number }[] }> {
    // Obtener todos los grupos donde el usuario es participante
    const groups = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participants', 'participant')
      .where('conversation.type = :type', { type: ConversationType.GROUP })
      .andWhere('participant.id = :userId', { userId })
      .andWhere('conversation.isActive = true')
      .andWhere('conversation.isArchived = false')
      .getMany();

    let totalCount = 0;
    const groupsWithUnread: { groupId: string; groupTitle: string; unreadCount: number }[] = [];

    for (const group of groups) {
      const unreadCount = await this.getUnreadCountForGroup(userId, group.id);
      if (unreadCount > 0) {
        totalCount += unreadCount;
        groupsWithUnread.push({
          groupId: group.id,
          groupTitle: group.title,
          unreadCount,
        });
      }
    }

    return {
      count: totalCount,
      groups: groupsWithUnread,
    };
  }

  /**
   * Generar datos retroactivos de lectura para mensajes históricos
   * Basado en ConversationReadStatus.lastReadAt, crea registros en MessageReadStatus
   * para todos los mensajes que fueron leídos antes de esa fecha
   */
  async backfillMessageReadStatuses(): Promise<number> {
    let processedCount = 0;

    // Obtener todos los registros de ConversationReadStatus con sus conversaciones
    const allReadStatuses = await this.readStatusRepository.find();

    this.logger.log(`Starting backfill for ${allReadStatuses.length} conversation read statuses`);

    for (const status of allReadStatuses) {
      // Verificar que la conversación existe y es un grupo
      const conversation = await this.conversationRepository.findOne({
        where: { id: status.conversationId, type: ConversationType.GROUP },
      });

      if (!conversation) continue;

      // Obtener todos los mensajes del grupo anteriores a lastReadAt
      const messages = await this.messageRepository.find({
        where: {
          conversationId: status.conversationId,
          type: MessageType.GROUP,
          isDeleted: false,
        },
      });

      for (const message of messages) {
        // No crear registro para mensajes propios
        if (message.senderId === status.userId) continue;

        // Solo mensajes anteriores o iguales a lastReadAt
        if (message.createdAt > status.lastReadAt) continue;

        // Verificar si ya existe registro
        const existing = await this.messageReadStatusRepository.findOne({
          where: { userId: status.userId, messageId: message.id },
        });

        if (!existing) {
          try {
            const newReadStatus = this.messageReadStatusRepository.create({
              userId: status.userId,
              messageId: message.id,
              groupId: status.conversationId,
            });
            await this.messageReadStatusRepository.save(newReadStatus);
            processedCount++;
          } catch (error) {
            // Ignorar errores de duplicados
            if (!error.message?.includes('duplicate')) {
              this.logger.warn(`Error creating backfill read status: ${error.message}`);
            }
          }
        }
      }
    }

    this.logger.log(`Backfill completed. Processed ${processedCount} new read status records`);
    return processedCount;
  }

  // ==================== EDICIÓN Y ELIMINACIÓN DE MENSAJES ====================

  /**
   * Editar el contenido de un mensaje de grupo
   * Solo el remitente puede editar el mensaje y dentro de un tiempo límite (24 horas)
   */
  async editGroupMessage(
    userId: string,
    groupId: string,
    messageId: string,
    newContent: string,
  ): Promise<GroupMessageDto> {
    // Verificar que el grupo existe
    const group = await this.conversationRepository.findOne({
      where: { id: groupId, type: ConversationType.GROUP },
      relations: ['participants'],
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    // Verificar que el usuario es participante
    const isParticipant = group.participants.some(p => p.id === userId);
    if (!isParticipant) {
      throw new ForbiddenException('No tienes acceso a este grupo');
    }

    // Buscar el mensaje
    const message = await this.messageRepository.findOne({
      where: {
        id: messageId,
        conversationId: groupId,
        type: MessageType.GROUP,
        isDeleted: false,
      },
      relations: ['sender', 'sender.profile', 'attachments'],
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    // Solo el remitente puede editar el mensaje
    if (message.senderId !== userId) {
      throw new ForbiddenException('Solo puedes editar tus propios mensajes');
    }

    // Verificar límite de tiempo (24 horas desde el envío)
    const hoursLimit = 24;
    const createdAtStr = String(message.createdAt);
    const createdAtDate = createdAtStr.endsWith('Z') || createdAtStr.includes('+')
      ? new Date(createdAtStr)
      : new Date(createdAtStr + 'Z');
    const timeSinceCreation = Date.now() - createdAtDate.getTime();
    const hoursElapsed = timeSinceCreation / (1000 * 60 * 60);

    if (hoursElapsed > hoursLimit) {
      throw new ForbiddenException(`No puedes editar mensajes con más de ${hoursLimit} horas de antigüedad`);
    }

    // Guardar contenido original si es la primera edición
    if (!message.isEdited) {
      message.originalContent = message.content;
    }

    // Actualizar contenido
    message.content = newContent;
    message.isEdited = true;
    message.editedAt = new Date();

    const savedMessage = await this.messageRepository.save(message);

    // Obtener información de "visto por" para el mensaje editado
    const readStatuses = await this.messageReadStatusRepository.find({
      where: { messageId: savedMessage.id },
      relations: ['user', 'user.profile'],
    });

    const seenBy = readStatuses
      .filter(rs => rs.userId !== savedMessage.senderId)
      .map(rs => ({
        userId: rs.userId,
        firstName: rs.user?.profile?.firstName || '',
        lastName: rs.user?.profile?.lastName || '',
        readAt: formatDateLocal(rs.readAt),
        viewCount: rs.viewCount || 1,
      }));

    return {
      id: savedMessage.id,
      content: savedMessage.content,
      contentType: (savedMessage.contentType || 'html') as 'text' | 'html' | 'markdown',
      sender: {
        id: savedMessage.sender.id,
        firstName: savedMessage.sender.profile?.firstName || '',
        lastName: savedMessage.sender.profile?.lastName || '',
        role: savedMessage.sender.role,
        avatarUrl: savedMessage.sender.profile?.avatarUrl || null,
      },
      isRead: true,
      createdAt: formatDateLocal(savedMessage.createdAt),
      isEdited: savedMessage.isEdited,
      editedAt: savedMessage.editedAt ? formatDateLocal(savedMessage.editedAt) : undefined,
      attachments: savedMessage.attachments?.map(att => ({
        id: att.id,
        filename: att.filename,
        originalName: att.originalName,
        mimeType: att.mimeType,
        size: att.size,
        url: att.path?.startsWith('https://') ? att.path : undefined,
      })) || [],
      seenBy,
    };
  }

  /**
   * Eliminar mensaje de grupo para todos los participantes
   * Solo el remitente puede eliminar para todos, dentro de 1 hora
   * Los administradores del grupo también pueden eliminar cualquier mensaje
   */
  async deleteGroupMessageForAll(
    userId: string,
    userRole: string,
    groupId: string,
    messageId: string,
  ): Promise<void> {
    // Verificar que el grupo existe
    const group = await this.conversationRepository.findOne({
      where: { id: groupId, type: ConversationType.GROUP },
      relations: ['participants'],
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    // Verificar que el usuario es participante
    const isParticipant = group.participants.some(p => p.id === userId);
    if (!isParticipant) {
      throw new ForbiddenException('No tienes acceso a este grupo');
    }

    // Buscar el mensaje
    const message = await this.messageRepository.findOne({
      where: {
        id: messageId,
        conversationId: groupId,
        type: MessageType.GROUP,
        isDeleted: false,
      },
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    const isMessageOwner = message.senderId === userId;
    const isGroupAdmin = await this.isGroupAdmin(userId, group);
    const isPlatformAdmin = userRole === UserRole.ADMIN;

    // Solo el remitente, admin del grupo, o admin de plataforma pueden eliminar
    if (!isMessageOwner && !isGroupAdmin && !isPlatformAdmin) {
      throw new ForbiddenException('No tienes permiso para eliminar este mensaje');
    }

    // Si es el dueño del mensaje, verificar límite de tiempo (1 hora)
    // Los admins pueden eliminar sin límite de tiempo
    if (isMessageOwner && !isGroupAdmin && !isPlatformAdmin) {
      const hoursLimit = 1;
      const createdAtStr = String(message.createdAt);
      const createdAtDate = createdAtStr.endsWith('Z') || createdAtStr.includes('+')
        ? new Date(createdAtStr)
        : new Date(createdAtStr + 'Z');
      const timeSinceCreation = Date.now() - createdAtDate.getTime();
      const hoursElapsed = timeSinceCreation / (1000 * 60 * 60);

      if (hoursElapsed > hoursLimit) {
        throw new ForbiddenException(`No puedes eliminar mensajes después de ${hoursLimit} hora(s). Contacta a un administrador del grupo.`);
      }
    }

    // Marcar como eliminado
    message.isDeleted = true;
    message.isDeletedBySender = true;
    message.isDeletedByRecipient = true;

    await this.messageRepository.save(message);

    // También eliminar los registros de lectura asociados
    await this.messageReadStatusRepository.delete({ messageId });

    this.logger.log(`Message ${messageId} deleted from group ${groupId} by user ${userId}`);
  }
}
