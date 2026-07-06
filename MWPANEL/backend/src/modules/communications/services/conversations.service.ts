import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Conversation, ConversationType } from '../entities/conversation.entity';
import { Message, MessageType, MessageStatus } from '../entities/message.entity';
import { User } from '../../users/entities/user.entity';
import {
  CreateConversationDto,
  CreateConversationMessageDto,
  ConversationSummaryDto,
  ConversationDetailDto,
  ConversationMessageDto
} from '../dto/conversation.dto';
import { formatDateLocal } from '../../../common/transformers/date.transformer';
import { CommunicationsService } from '../communications.service';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly communicationsService: CommunicationsService,
  ) {}

  async createConversation(
    userId: string,
    createConversationDto: CreateConversationDto,
  ): Promise<Conversation> {
    const { participantId, title, initialMessage, contentType = 'html' } = createConversationDto;

    // Verificar que el usuario existe
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar que el participante existe
    const participant = await this.userRepository.findOne({ where: { id: participantId } });
    if (!participant) {
      throw new NotFoundException('Participante no encontrado');
    }

    // No permitir conversación consigo mismo
    if (userId === participantId) {
      throw new BadRequestException('No puedes crear una conversación contigo mismo');
    }

    // Validar permisos de contacto para familias
    if (user.role === 'family') {
      await this.validateFamilyCanContactUser(userId, participantId);
    }

    // Validar permisos de contacto para estudiantes: solo profesores con los que
    // tiene clase en el curso activo, sus tutores y administración.
    if (user.role === 'student') {
      await this.validateStudentCanContactUser(userId, participantId);
    }

    // Verificar si ya existe una conversación entre estos usuarios
    const existingConversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoin('conversation.participants', 'participant')
      .where('conversation.type = :type', { type: ConversationType.DIRECT })
      .andWhere('participant.id IN (:...userIds)', { userIds: [userId, participantId] })
      .groupBy('conversation.id')
      .having('COUNT(participant.id) = 2')
      .getOne();

    if (existingConversation) {
      // Si ya existe, solo enviamos el mensaje inicial a la conversación existente
      await this.sendMessage(userId, existingConversation.id, {
        content: initialMessage,
        contentType,
      });
      return existingConversation;
    }

    // Crear nueva conversación
    const conversation = this.conversationRepository.create({
      title,
      type: ConversationType.DIRECT,
      participants: [user, participant],
      isActive: true,
    });

    const savedConversation = await this.conversationRepository.save(conversation);

    // Crear mensaje inicial
    const message = this.messageRepository.create({
      subject: title || 'Conversación directa',
      content: initialMessage,
      contentType,
      type: MessageType.DIRECT,
      status: MessageStatus.SENT,
      sender: user,
      senderId: userId,
      recipient: participant,
      recipientId: participantId,
      isRead: false,
    });

    await this.messageRepository.save(message);

    // Actualizar timestamp de la conversación
    savedConversation.lastMessageAt = new Date();
    await this.conversationRepository.save(savedConversation);

    return savedConversation;
  }

  async getUserConversations(userId: string): Promise<ConversationSummaryDto[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participants', 'participant')
      .leftJoinAndSelect('participant.profile', 'participantProfile')
      .leftJoin('conversation.messages', 'message')
      .leftJoinAndSelect('message.sender', 'messageSender')
      .leftJoinAndSelect('messageSender.profile', 'messageSenderProfile')
      .where('participant.id = :userId', { userId })
      .andWhere('conversation.isActive = true')
      .orderBy('conversation.lastMessageAt', 'DESC')
      .getMany();

    const conversationSummaries: ConversationSummaryDto[] = [];

    for (const conversation of conversations) {
      // Obtener el otro participante (no el usuario actual)
      const otherParticipant = conversation.participants.find(p => p.id !== userId);
      if (!otherParticipant) continue;

      // Obtener el último mensaje
      const lastMessage = await this.messageRepository.findOne({
        where: [
          { senderId: userId, recipientId: otherParticipant.id },
          { senderId: otherParticipant.id, recipientId: userId },
        ],
        relations: ['sender', 'sender.profile'],
        order: { createdAt: 'DESC' },
      });

      // Contar mensajes no leídos del usuario actual
      const unreadCount = await this.messageRepository.count({
        where: {
          senderId: otherParticipant.id,
          recipientId: userId,
          isRead: false,
        },
      });

      conversationSummaries.push({
        id: conversation.id,
        title: conversation.title,
        participant: {
          id: otherParticipant.id,
          profile: {
            firstName: otherParticipant.profile?.firstName || '',
            lastName: otherParticipant.profile?.lastName || '',
          },
          role: otherParticipant.role,
        },
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          sender: {
            id: lastMessage.sender.id,
            profile: {
              firstName: lastMessage.sender.profile?.firstName || '',
              lastName: lastMessage.sender.profile?.lastName || '',
            },
          },
          createdAt: formatDateLocal(lastMessage.createdAt),
        } : undefined,
        unreadCount,
        lastMessageAt: formatDateLocal(conversation.lastMessageAt || conversation.createdAt),
        isActive: conversation.isActive,
      });
    }

    return conversationSummaries;
  }

  async getConversationMessages(
    userId: string,
    conversationId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ConversationDetailDto> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['participants', 'participants.profile'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    // Verificar que el usuario es participante de la conversación
    const isParticipant = conversation.participants.some(p => p.id === userId);
    if (!isParticipant) {
      throw new ForbiddenException('No tienes acceso a esta conversación');
    }

    // Obtener el otro participante
    const otherParticipant = conversation.participants.find(p => p.id !== userId);
    if (!otherParticipant) {
      throw new NotFoundException('Participante no encontrado');
    }

    // Obtener mensajes de la conversación
    const messages = await this.messageRepository.find({
      where: [
        { senderId: userId, recipientId: otherParticipant.id },
        { senderId: otherParticipant.id, recipientId: userId },
      ],
      relations: ['sender', 'sender.profile', 'recipient', 'recipient.profile'],
      order: { createdAt: 'ASC' },
      take: limit,
      skip: offset,
    });

    const messagesDtos: ConversationMessageDto[] = messages.map(message => ({
      id: message.id,
      content: message.content,
      contentType: message.contentType as 'text' | 'html' | 'markdown',
      sender: {
        id: message.sender.id,
        profile: {
          firstName: message.sender.profile?.firstName || '',
          lastName: message.sender.profile?.lastName || '',
        },
      },
      recipient: message.recipient ? {
        id: message.recipient.id,
        profile: {
          firstName: message.recipient.profile?.firstName || '',
          lastName: message.recipient.profile?.lastName || '',
        },
      } : undefined,
      isRead: message.isRead,
      readAt: formatDateLocal(message.readAt),
      createdAt: formatDateLocal(message.createdAt),
      parentMessageId: message.parentMessageId,
      isEdited: message.isEdited || false,
      editedAt: message.editedAt ? formatDateLocal(message.editedAt) : undefined,
    }));

    return {
      id: conversation.id,
      title: conversation.title,
      participant: {
        id: otherParticipant.id,
        profile: {
          firstName: otherParticipant.profile?.firstName || '',
          lastName: otherParticipant.profile?.lastName || '',
        },
      },
      messages: messagesDtos,
      lastMessageAt: formatDateLocal(conversation.lastMessageAt || conversation.createdAt),
      isActive: conversation.isActive,
    };
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    createMessageDto: CreateConversationMessageDto,
  ): Promise<Message> {
    const { content, contentType = 'html', parentMessageId } = createMessageDto;

    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['participants'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    // Verificar que el usuario es participante
    const isParticipant = conversation.participants.some(p => p.id === userId);
    if (!isParticipant) {
      throw new ForbiddenException('No tienes acceso a esta conversación');
    }

    const sender = await this.userRepository.findOne({ where: { id: userId } });
    if (!sender) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Obtener el destinatario (el otro participante)
    const recipient = conversation.participants.find(p => p.id !== userId);
    if (!recipient) {
      throw new NotFoundException('Destinatario no encontrado');
    }

    // Crear el mensaje
    const message = this.messageRepository.create({
      subject: 'Re: Conversación',
      content,
      contentType,
      type: MessageType.DIRECT,
      status: MessageStatus.SENT,
      sender,
      senderId: userId,
      recipient,
      recipientId: recipient.id,
      parentMessageId,
      isRead: false,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Actualizar timestamp de la conversación
    conversation.lastMessageAt = new Date();
    await this.conversationRepository.save(conversation);

    return savedMessage;
  }

  async markMessageAsRead(
    userId: string,
    conversationId: string,
    messageId: string,
  ): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'recipient'],
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    // Solo el destinatario puede marcar el mensaje como leído
    if (message.recipientId !== userId) {
      throw new ForbiddenException('Solo el destinatario puede marcar el mensaje como leído');
    }

    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      await this.messageRepository.save(message);
    }
  }

  async getConversationDetails(userId: string, conversationId: string): Promise<ConversationDetailDto> {
    return this.getConversationMessages(userId, conversationId);
  }

  private async validateFamilyCanContactUser(familyUserId: string, targetUserId: string): Promise<void> {
    // Obtener la lista de contactos permitidos para esta familia
    const allowedRecipients = await this.getAvailableRecipientsForFamily(familyUserId);

    // Verificar si el usuario objetivo está en la lista de contactos permitidos
    const isAllowed = allowedRecipients.some(recipient => recipient.id === targetUserId);

    if (!isAllowed) {
      throw new ForbiddenException(
        'No tienes permiso para contactar con este usuario. Las familias solo pueden contactar con tutores de sus hijos, profesores de sus asignaturas y administradores.'
      );
    }
  }

  // Restricción de contacto para estudiantes. Reutiliza la MISMA lista canónica
  // que alimenta el desplegable de destinatarios del estudiante
  // (getAvailableRecipientsForStudent): profesores que le imparten clase en sus
  // grupos, tutores y administradores. Así la validación coincide siempre con la UI.
  private async validateStudentCanContactUser(studentUserId: string, targetUserId: string): Promise<void> {
    const allowedRecipients = await this.communicationsService.getAvailableRecipients(studentUserId);

    const isAllowed = allowedRecipients.some(recipient => recipient.id === targetUserId);

    if (!isAllowed) {
      throw new ForbiddenException(
        'No tienes permiso para contactar con este usuario. Solo puedes escribir a los profesores con los que tienes clase, tus tutores y a administración.'
      );
    }
  }

  // Método auxiliar para obtener contactos permitidos para familias
  private async getAvailableRecipientsForFamily(familyUserId: string): Promise<any[]> {
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

      if (familyStudents.length === 0) {
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
          }
        }));
      }

      const studentIds = familyStudents.map(fs => fs.student_id);

      // 2. Obtener TUTORES de los hijos (de grupos de tutoría)
      const tutors = await this.userRepository.query(`
        SELECT DISTINCT
          tu.id as tutor_id,
          tu.email as tutor_email,
          tup."firstName" as tutor_firstname,
          tup."lastName" as tutor_lastname
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

      // 3. Obtener PROFESORES que dan clases a los hijos (asignaciones de materias)
      const subjectTeachers = await this.userRepository.query(`
        SELECT DISTINCT
          tu.id as teacher_id,
          tu.email as teacher_email,
          tup."firstName" as teacher_firstname,
          tup."lastName" as teacher_lastname
        FROM subject_assignments sa
        LEFT JOIN students s ON sa."groupId" IN (
          SELECT cg.id FROM class_groups cg
          LEFT JOIN class_group_students cgs ON cg.id = cgs."classGroupId"
          WHERE cgs."studentId" = s.id AND cgs."isActive" = true
        )
        LEFT JOIN teachers t ON sa."teacherId" = t.id
        LEFT JOIN users tu ON t."userId" = tu.id
        LEFT JOIN user_profiles tup ON tu.id = tup."userId"
        WHERE s.id = ANY($1::uuid[])
          AND sa."isActive" = true
          AND tu."isActive" = true
      `, [studentIds]);

      // 4. Obtener ADMINISTRADORES (siempre permitidos)
      const admins = await this.userRepository.query(`
        SELECT u.id, u.email, u.role, up."firstName", up."lastName"
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up."userId"
        WHERE u."isActive" = true AND u.role = 'admin'
        ORDER BY up."firstName"
      `);

      // Agregar todos los contactos permitidos
      [...tutors, ...subjectTeachers, ...admins].forEach(contact => {
        const id = contact.tutor_id || contact.teacher_id || contact.id;
        if (!recipients.find(r => r.id === id)) {
          recipients.push({ id });
        }
      });

      return recipients;

    } catch (error) {
      console.error('Error validating family contact permissions:', error);
      return [];
    }
  }

  async deleteConversation(userId: string, otherUserId: string): Promise<void> {
    // Verificar que el usuario actual existe
    const currentUser = await this.userRepository.findOne({ where: { id: userId } });
    if (!currentUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar que el otro usuario existe (el otherUserId es en realidad el ID del otro usuario)
    const otherUser = await this.userRepository.findOne({ where: { id: otherUserId } });
    if (!otherUser) {
      throw new NotFoundException('Usuario destinatario no encontrado');
    }

    // Verificar que hay mensajes entre estos usuarios
    const messageCount = await this.messageRepository.count({
      where: [
        { senderId: userId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: userId },
      ],
    });

    if (messageCount === 0) {
      throw new NotFoundException('No existe conversación entre estos usuarios');
    }

    // Eliminar todos los mensajes entre estos dos usuarios (en ambas direcciones)
    await this.messageRepository.delete({
      senderId: userId,
      recipientId: otherUserId,
    });

    await this.messageRepository.delete({
      senderId: otherUserId,
      recipientId: userId,
    });

    // Buscar si existe una conversación explícita y eliminarla
    const existingConversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoin('conversation.participants', 'participant')
      .where('conversation.type = :type', { type: ConversationType.DIRECT })
      .andWhere('participant.id IN (:...userIds)', { userIds: [userId, otherUserId] })
      .groupBy('conversation.id')
      .having('COUNT(participant.id) = 2')
      .getOne();

    if (existingConversation) {
      await this.conversationRepository.remove(existingConversation);
    }
  }

  // ==================== BORRADORES EN CONVERSACIONES ====================

  /**
   * Encontrar o crear conversación por participantId
   * El frontend usa participantId (el ID del otro usuario) como identificador
   */
  private async findOrCreateConversationByParticipant(
    userId: string,
    participantIdOrConversationId: string,
  ): Promise<{ conversation: Conversation | null; recipient: User }> {
    // Primero intentar encontrar la conversación por ID directo
    let conversation = await this.conversationRepository.findOne({
      where: { id: participantIdOrConversationId },
      relations: ['participants'],
    });

    if (conversation) {
      const recipient = conversation.participants.find(p => p.id !== userId);
      if (!recipient) {
        throw new NotFoundException('Destinatario no encontrado en la conversación');
      }
      return { conversation, recipient };
    }

    // Si no se encuentra, asumir que es un participantId (ID del otro usuario)
    // y buscar/crear la conversación entre estos dos usuarios
    const recipient = await this.userRepository.findOne({
      where: { id: participantIdOrConversationId },
    });

    if (!recipient) {
      throw new NotFoundException('Participante no encontrado');
    }

    // Buscar conversación existente entre estos usuarios
    conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoin('conversation.participants', 'participant')
      .where('conversation.type = :type', { type: ConversationType.DIRECT })
      .andWhere('participant.id IN (:...userIds)', { userIds: [userId, participantIdOrConversationId] })
      .groupBy('conversation.id')
      .having('COUNT(DISTINCT participant.id) = 2')
      .getOne();

    if (conversation) {
      // Cargar participantes
      conversation = await this.conversationRepository.findOne({
        where: { id: conversation.id },
        relations: ['participants'],
      });
    }

    return { conversation, recipient };
  }

  /**
   * Guardar o actualizar un borrador en una conversación activa
   * Acepta tanto conversationId como participantId (ID del otro usuario)
   */
  async saveConversationDraft(
    userId: string,
    conversationIdOrParticipantId: string,
    content: string,
    contentType: string = 'html',
  ): Promise<Message> {
    const { conversation, recipient } = await this.findOrCreateConversationByParticipant(
      userId,
      conversationIdOrParticipantId,
    );

    // Verificar que el usuario es participante si la conversación existe
    if (conversation) {
      const isParticipant = conversation.participants.some(p => p.id === userId);
      if (!isParticipant) {
        throw new ForbiddenException('No tienes acceso a esta conversación');
      }
    }

    const sender = await this.userRepository.findOne({ where: { id: userId } });
    if (!sender) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Identificador para buscar/guardar el borrador
    // Si hay conversación, usar su ID; si no, usar recipientId
    const draftIdentifier = conversation?.id || conversationIdOrParticipantId;

    // Buscar si ya existe un borrador para esta conversación/participante
    let draft = await this.messageRepository.findOne({
      where: {
        senderId: userId,
        recipientId: recipient.id,
        isDraft: true,
        isDeleted: false,
      },
    });

    if (draft) {
      // Actualizar el borrador existente
      draft.content = content;
      draft.contentType = contentType;
      if (conversation) {
        draft.conversationId = conversation.id;
      }
      return this.messageRepository.save(draft);
    }

    // Crear nuevo borrador vinculado a la conversación/participante
    draft = this.messageRepository.create({
      subject: 'Borrador',
      content,
      contentType,
      type: MessageType.DIRECT,
      status: MessageStatus.DRAFT,
      sender,
      senderId: userId,
      recipient,
      recipientId: recipient.id,
      isDraft: true,
      isRead: false,
      conversationId: conversation?.id || null,
    });

    return this.messageRepository.save(draft);
  }

  /**
   * Obtener borrador de una conversación específica
   * Acepta tanto conversationId como participantId (ID del otro usuario)
   */
  async getConversationDraft(userId: string, conversationIdOrParticipantId: string): Promise<Message | null> {
    const { conversation, recipient } = await this.findOrCreateConversationByParticipant(
      userId,
      conversationIdOrParticipantId,
    );

    // Verificar que el usuario es participante si la conversación existe
    if (conversation) {
      const isParticipant = conversation.participants.some(p => p.id === userId);
      if (!isParticipant) {
        throw new ForbiddenException('No tienes acceso a esta conversación');
      }
    }

    // Buscar borrador por recipientId (funciona tanto si hay conversación como si no)
    return this.messageRepository.findOne({
      where: {
        senderId: userId,
        recipientId: recipient.id,
        isDraft: true,
        isDeleted: false,
      },
      relations: ['sender', 'sender.profile', 'recipient', 'recipient.profile'],
    });
  }

  /**
   * Enviar un borrador de conversación (convertirlo en mensaje enviado)
   * Acepta tanto conversationId como participantId (ID del otro usuario)
   */
  async sendConversationDraft(userId: string, conversationIdOrParticipantId: string): Promise<Message> {
    const draft = await this.getConversationDraft(userId, conversationIdOrParticipantId);

    if (!draft) {
      throw new NotFoundException('No hay borrador para esta conversación');
    }

    // Convertir borrador en mensaje enviado
    draft.isDraft = false;
    draft.status = MessageStatus.SENT;
    draft.conversationId = null; // Ya no es un borrador de conversación

    const savedMessage = await this.messageRepository.save(draft);

    // Intentar actualizar timestamp de la conversación si existe
    const { conversation } = await this.findOrCreateConversationByParticipant(
      userId,
      conversationIdOrParticipantId,
    );
    if (conversation) {
      conversation.lastMessageAt = new Date();
      await this.conversationRepository.save(conversation);
    }

    return savedMessage;
  }

  /**
   * Eliminar borrador de una conversación
   * Acepta tanto conversationId como participantId (ID del otro usuario)
   */
  async deleteConversationDraft(userId: string, conversationIdOrParticipantId: string): Promise<void> {
    const draft = await this.getConversationDraft(userId, conversationIdOrParticipantId);

    if (!draft) {
      throw new NotFoundException('No hay borrador para esta conversación');
    }

    await this.messageRepository.remove(draft);
  }

  // ==================== EDICIÓN DE MENSAJES ====================

  /**
   * Editar el contenido de un mensaje enviado
   * Solo el remitente puede editar el mensaje y dentro de un tiempo límite (24 horas)
   */
  async editMessage(
    userId: string,
    messageId: string,
    newContent: string,
    newSubject?: string,
  ): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId, isDeleted: false },
      relations: ['sender'],
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    // Solo el remitente puede editar el mensaje
    if (message.senderId !== userId) {
      throw new ForbiddenException('Solo puedes editar tus propios mensajes');
    }

    // Verificar que no sea un borrador (los borradores se actualizan de otra manera)
    if (message.isDraft) {
      throw new BadRequestException('No puedes editar un borrador con esta función. Usa la función de guardar borrador.');
    }

    // Verificar límite de tiempo (24 horas desde el envío)
    const hoursLimit = 24;
    // Asegurar que la fecha se interprete correctamente (agregar Z si no tiene zona horaria)
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
    if (newSubject !== undefined) {
      message.subject = newSubject;
    }
    message.isEdited = true;
    message.editedAt = new Date();

    return this.messageRepository.save(message);
  }

  // ==================== ELIMINACIÓN PARA TODOS ====================

  /**
   * Eliminar mensaje para todos los participantes de la conversación
   * Solo el remitente puede eliminar para todos
   */
  async deleteMessageForAll(userId: string, messageId: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId, isDeleted: false },
      relations: ['sender'],
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    // Solo el remitente puede eliminar para todos
    if (message.senderId !== userId) {
      throw new ForbiddenException('Solo el remitente puede eliminar el mensaje para todos');
    }

    // Verificar límite de tiempo (1 hora desde el envío para eliminar para todos)
    const hoursLimit = 1;
    // Asegurar que la fecha se interprete correctamente (agregar Z si no tiene zona horaria)
    const createdAtStr = String(message.createdAt);
    const createdAtDate = createdAtStr.endsWith('Z') || createdAtStr.includes('+')
      ? new Date(createdAtStr)
      : new Date(createdAtStr + 'Z');
    const timeSinceCreation = Date.now() - createdAtDate.getTime();
    const hoursElapsed = timeSinceCreation / (1000 * 60 * 60);

    if (hoursElapsed > hoursLimit) {
      throw new ForbiddenException(`No puedes eliminar mensajes para todos después de ${hoursLimit} hora(s)`);
    }

    // Marcar como eliminado globalmente
    message.isDeleted = true;
    message.isDeletedBySender = true;
    message.isDeletedByRecipient = true;

    await this.messageRepository.save(message);
  }
}