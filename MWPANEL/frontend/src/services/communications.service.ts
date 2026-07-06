/**
 * @archivo: communications.service.ts
 * @módulo: Services (Servicio de Comunicaciones)
 * @función: Gestión completa de mensajes y comunicaciones en MW Panel
 * @crítico: SÍ - Sistema de mensajería completo con bulk messaging
 * @dependencias: apiClient, tipos Message/User, endpoints communications/*
 */

import { apiClient } from './apiClient';

export interface Message {
  id: string;
  subject: string;
  content: string;
  contentType: string;
  type: 'direct' | 'group' | 'announcement' | 'alert' | 'reminder' | 'general';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'draft' | 'sent' | 'delivered' | 'read';
  isRead: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  sender: User;
  recipient?: User;
  targetGroup?: any;
  relatedStudent?: any;
  parentMessage?: Message;
  replies?: Message[];
  attachments?: any[];
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'family';
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profile?: any;
  classGroup?: string;
  subject?: string;
}

export interface CreateMessageDto {
  subject: string;
  content: string;
  contentType?: string;
  type?: string;
  priority?: string;
  recipientId?: string;
  recipientIds?: string[];
  targetGroupId?: string;
  messageGroupId?: string;
  relatedStudentId?: string;
  parentMessageId?: string;
}

export interface MessageGroup {
  id: string;
  name: string;
  description?: string;
  type: 'admin_broadcast' | 'teacher_class' | 'teacher_subject' | 'custom';
  isActive: boolean;
  isDefault: boolean;
  config?: string;
  createdBy: User;
  createdById: string;
  members: Array<{
    id: string;
    userId: string;
    user: User;
  }>;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageGroupDto {
  name: string;
  description?: string;
  type?: 'admin_broadcast' | 'teacher_class' | 'teacher_subject' | 'custom';
  isActive?: boolean;
  isDefault?: boolean;
  memberIds?: string[];
  config?: string;
}

export interface BulkMessageResponse {
  success: boolean;
  message: string;
  recipientCount: number;
  firstMessageId: string;
}

export interface TeacherStudentsResponse {
  success: boolean;
  message: string;
  recipientCount: number;
  studentsReached: Array<{
    id: string;
    name: string;
    class: string;
  }>;
  firstMessageId: string;
}

class CommunicationsService {
  private readonly baseURL = '/communications';

  // ==================== MENSAJES INDIVIDUALES ====================

  async getMessages(filters?: {
    type?: string;
    priority?: string;
    isRead?: boolean;
  }): Promise<Message[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.isRead !== undefined) params.append('isRead', filters.isRead.toString());

    const response = await apiClient.get(`${this.baseURL}/messages?${params}`);
    return response.data;
  }

  async getMessage(id: string): Promise<Message> {
    const response = await apiClient.get(`${this.baseURL}/messages/${id}`);
    return response.data;
  }

  async createMessage(messageData: CreateMessageDto): Promise<Message> {
    const response = await apiClient.post(`${this.baseURL}/messages`, messageData);
    return response.data;
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message> {
    const response = await apiClient.patch(`${this.baseURL}/messages/${id}`, updates);
    return response.data;
  }

  async deleteMessage(id: string): Promise<void> {
    await apiClient.delete(`${this.baseURL}/messages/${id}`);
  }

  async markMessageAsRead(id: string): Promise<Message> {
    return this.updateMessage(id, { isRead: true });
  }

  async markMessageAsUnread(id: string): Promise<void> {
    await apiClient.post(`${this.baseURL}/messages/${id}/mark-unread`);
  }

  async markAllMessagesAsRead(): Promise<void> {
    await apiClient.post(`${this.baseURL}/messages/mark-all-read`);
  }

  async deleteAllMessages(): Promise<{ message: string; deletedCount: number }> {
    const response = await apiClient.delete(`${this.baseURL}/messages/bulk/delete-all`);
    return response.data;
  }

  async getUnreadMessagesCount(): Promise<{ count: number }> {
    const response = await apiClient.get(`${this.baseURL}/messages/unread-count`);
    return response.data;
  }

  // ==================== MENSAJES EN BULK ====================

  async sendBulkMessage(messageData: CreateMessageDto): Promise<BulkMessageResponse> {
    if (!messageData.recipientIds || messageData.recipientIds.length === 0) {
      throw new Error('Se requiere al menos un destinatario para mensajes bulk');
    }

    const response = await apiClient.post(`${this.baseURL}/messages/bulk`, messageData);
    return response.data;
  }

  async sendGroupMessage(groupId: string, messageData: Omit<CreateMessageDto, 'targetGroupId'>): Promise<Message> {
    const response = await apiClient.post(`${this.baseURL}/messages/group/${groupId}`, messageData);
    return response.data;
  }

  // ==================== FUNCIONES ESPECÍFICAS PARA PROFESORES ====================

  async sendMessageToMyStudents(messageData: Omit<CreateMessageDto, 'recipientIds' | 'targetGroupId'>): Promise<TeacherStudentsResponse> {
    const response = await apiClient.post(`${this.baseURL}/messages/my-students`, messageData);
    return response.data;
  }

  async getMyStudents(): Promise<User[]> {
    const response = await apiClient.get(`${this.baseURL}/my-students`);
    return response.data;
  }

  // ==================== DESTINATARIOS DISPONIBLES ====================

  async getAvailableRecipients(): Promise<User[]> {
    const response = await apiClient.get(`${this.baseURL}/available-recipients`);
    return response.data;
  }

  async getAvailableGroups(): Promise<any[]> {
    const response = await apiClient.get(`${this.baseURL}/available-groups`);
    return response.data;
  }

  async getAvailableRecipientsForBulk(filters?: {
    roles?: string[];
    classGroups?: string[];
    subjects?: string[];
  }): Promise<User[]> {
    const params = new URLSearchParams();

    if (filters?.roles && filters.roles.length > 0) {
      params.append('roles', filters.roles.join(','));
    }

    if (filters?.classGroups && filters.classGroups.length > 0) {
      params.append('classGroups', filters.classGroups.join(','));
    }

    if (filters?.subjects && filters.subjects.length > 0) {
      params.append('subjects', filters.subjects.join(','));
    }

    const response = await apiClient.get(`${this.baseURL}/available-recipients-bulk?${params}`);
    return response.data;
  }

  /**
   * Obtener padres cuyos hijos están en los grupos de clase especificados
   * Deduplica automáticamente si un padre tiene múltiples hijos en los grupos
   */
  async getParentsByClassGroups(classGroupIds: string[]): Promise<User[]> {
    if (!classGroupIds || classGroupIds.length === 0) {
      return [];
    }

    const params = new URLSearchParams();
    params.append('classGroupIds', classGroupIds.join(','));

    const response = await apiClient.get(`${this.baseURL}/parents-by-class-groups?${params}`);
    return response.data;
  }

  // ==================== NOTIFICACIONES ====================

  async getNotifications(filters?: {
    type?: string;
    status?: string;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);

    const response = await apiClient.get(`${this.baseURL}/notifications?${params}`);
    return response.data;
  }

  async createNotification(notificationData: any): Promise<any> {
    const response = await apiClient.post(`${this.baseURL}/notifications`, notificationData);
    return response.data;
  }

  async updateNotification(id: string, updates: any): Promise<any> {
    const response = await apiClient.patch(`${this.baseURL}/notifications/${id}`, updates);
    return response.data;
  }

  async deleteNotification(id: string): Promise<void> {
    await apiClient.delete(`${this.baseURL}/notifications/${id}`);
  }

  async markAllNotificationsAsRead(): Promise<void> {
    await apiClient.post(`${this.baseURL}/notifications/mark-all-read`);
  }

  async deleteAllNotifications(): Promise<{ message: string; deletedCount: number }> {
    const response = await apiClient.delete(`${this.baseURL}/notifications/bulk/delete-all`);
    return response.data;
  }

  async getUnreadNotificationsCount(): Promise<{ count: number }> {
    const response = await apiClient.get(`${this.baseURL}/notifications/unread-count`);
    return response.data;
  }

  async createBulkNotifications(data: { userIds: string[], notification: any }): Promise<any> {
    const response = await apiClient.post(`${this.baseURL}/notifications/bulk`, data);
    return response.data;
  }

  // ==================== ESTADÍSTICAS ====================

  async getUserMessagingStats(): Promise<any> {
    const response = await apiClient.get(`${this.baseURL}/stats`);
    return response.data;
  }

  // ==================== GRUPOS DE MENSAJES ====================

  async getMessageGroups(): Promise<MessageGroup[]> {
    const response = await apiClient.get(`${this.baseURL}/groups`);
    return response.data;
  }

  async getMessageGroup(id: string): Promise<MessageGroup> {
    const response = await apiClient.get(`${this.baseURL}/groups/${id}`);
    return response.data;
  }

  async createMessageGroup(groupData: CreateMessageGroupDto): Promise<MessageGroup> {
    const response = await apiClient.post(`${this.baseURL}/groups`, groupData);
    return response.data;
  }

  async updateMessageGroup(id: string, updates: Partial<CreateMessageGroupDto>): Promise<MessageGroup> {
    const response = await apiClient.patch(`${this.baseURL}/groups/${id}`, updates);
    return response.data;
  }

  async deleteMessageGroup(id: string): Promise<void> {
    await apiClient.delete(`${this.baseURL}/groups/${id}`);
  }

  async addMembersToGroup(groupId: string, userIds: string[]): Promise<void> {
    await apiClient.post(`${this.baseURL}/groups/${groupId}/members`, { userIds });
  }

  async removeMembersFromGroup(groupId: string, userIds: string[]): Promise<void> {
    await apiClient.delete(`${this.baseURL}/groups/${groupId}/members`, { data: { userIds } });
  }

  async syncGroupMembers(groupId: string, userIds: string[]): Promise<void> {
    await apiClient.post(`${this.baseURL}/groups/${groupId}/members/sync`, { userIds });
  }

  async getGroupMembers(groupId: string): Promise<User[]> {
    const response = await apiClient.get(`${this.baseURL}/groups/${groupId}/members`);
    return response.data;
  }

  async createTeacherClassGroup(classGroupId: string): Promise<MessageGroup> {
    const response = await apiClient.post(`${this.baseURL}/groups/teacher-class/${classGroupId}`);
    return response.data;
  }

  async createTeacherSubjectGroup(subjectAssignmentId: string): Promise<MessageGroup> {
    const response = await apiClient.post(`${this.baseURL}/groups/teacher-subject/${subjectAssignmentId}`);
    return response.data;
  }

  // ==================== GRUPOS DE CHAT (WHATSAPP-STYLE) ====================

  /**
   * Crear un nuevo grupo de chat (solo admin/teacher)
   */
  async createGroupChat(data: CreateGroupChatDto): Promise<GroupChatDetail> {
    const response = await apiClient.post(`${this.baseURL}/groups`, data);
    return response.data;
  }

  /**
   * Obtener todos los grupos donde soy participante
   */
  async getMyGroupChats(): Promise<GroupChatSummary[]> {
    const response = await apiClient.get(`${this.baseURL}/groups`);
    return response.data;
  }

  /**
   * Obtener detalle de un grupo específico
   */
  async getGroupChatDetail(groupId: string): Promise<GroupChatDetail> {
    const response = await apiClient.get(`${this.baseURL}/groups/${groupId}`);
    return response.data;
  }

  /**
   * Actualizar nombre/descripción de un grupo
   */
  async updateGroupChat(groupId: string, data: UpdateGroupChatDto): Promise<GroupChatDetail> {
    const response = await apiClient.patch(`${this.baseURL}/groups/${groupId}`, data);
    return response.data;
  }

  /**
   * Agregar miembros a un grupo
   */
  async addGroupChatMembers(groupId: string, userIds: string[]): Promise<GroupChatDetail> {
    const response = await apiClient.post(`${this.baseURL}/groups/${groupId}/members`, { userIds });
    return response.data;
  }

  /**
   * Quitar un miembro de un grupo
   */
  async removeGroupChatMember(groupId: string, userId: string): Promise<GroupChatDetail> {
    const response = await apiClient.delete(`${this.baseURL}/groups/${groupId}/members/${userId}`);
    return response.data;
  }

  /**
   * Promover un miembro a administrador
   */
  async promoteToAdmin(groupId: string, memberId: string): Promise<GroupChatDetail> {
    const response = await apiClient.post(`${this.baseURL}/groups/${groupId}/admins`, { memberId });
    return response.data;
  }

  /**
   * Revocar a un miembro como administrador
   */
  async demoteAdmin(groupId: string, memberId: string): Promise<GroupChatDetail> {
    const response = await apiClient.delete(`${this.baseURL}/groups/${groupId}/admins/${memberId}`);
    return response.data;
  }

  /**
   * Abandonar un grupo
   */
  async leaveGroupChat(groupId: string): Promise<void> {
    await apiClient.post(`${this.baseURL}/groups/${groupId}/leave`);
  }

  /**
   * Enviar mensaje a un grupo
   */
  async sendGroupChatMessage(groupId: string, content: string, contentType: 'text' | 'html' | 'markdown' = 'html'): Promise<GroupChatMessage> {
    const response = await apiClient.post(`${this.baseURL}/groups/${groupId}/messages`, { content, contentType });
    return response.data;
  }

  /**
   * Enviar mensaje a un grupo con archivos adjuntos
   */
  async sendGroupChatMessageWithAttachments(
    groupId: string,
    content: string,
    files: File[],
    contentType: 'text' | 'html' | 'markdown' = 'html'
  ): Promise<GroupChatMessage> {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('contentType', contentType);

    files.forEach((file) => {
      formData.append('attachments', file);
    });

    const response = await apiClient.post(
      `${this.baseURL}/groups/${groupId}/messages/with-attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  /**
   * Obtener mensajes de un grupo
   */
  async getGroupChatMessages(groupId: string, limit = 500, offset = 0): Promise<GroupChatMessage[]> {
    const response = await apiClient.get(`${this.baseURL}/groups/${groupId}/messages?limit=${limit}&offset=${offset}`);
    return response.data;
  }

  /**
   * Marcar mensajes de un grupo como no leídos
   */
  async markGroupChatAsUnread(groupId: string): Promise<void> {
    await apiClient.post(`${this.baseURL}/groups/${groupId}/mark-unread`);
  }

  /**
   * Marcar un mensaje de chat de grupo específico como leído
   */
  async markGroupChatMessageAsRead(messageId: string): Promise<void> {
    await apiClient.post(`${this.baseURL}/messages/${messageId}/read`);
  }

  /**
   * Marcar mensajes de un grupo como leídos
   */
  async markGroupChatAsRead(groupId: string): Promise<void> {
    await apiClient.post(`${this.baseURL}/groups/${groupId}/read`);
  }

  /**
   * Archivar un grupo
   */
  async archiveGroupChat(groupId: string): Promise<void> {
    await apiClient.post(`${this.baseURL}/groups/${groupId}/archive`);
  }

  /**
   * Desarchivar un grupo
   */
  async unarchiveGroupChat(groupId: string): Promise<void> {
    await apiClient.post(`${this.baseURL}/groups/${groupId}/unarchive`);
  }

  /**
   * Eliminar un grupo (solo admin/creador)
   */
  async deleteGroupChat(groupId: string): Promise<void> {
    await apiClient.delete(`${this.baseURL}/groups/${groupId}`);
  }

  /**
   * Editar un mensaje de grupo (solo remitente, máximo 24h)
   */
  async editGroupChatMessage(groupId: string, messageId: string, content: string): Promise<GroupChatMessage> {
    const response = await apiClient.patch(`${this.baseURL}/groups/${groupId}/messages/${messageId}/edit`, { content });
    return response.data;
  }

  /**
   * Eliminar un mensaje de grupo para todos
   */
  async deleteGroupChatMessage(groupId: string, messageId: string): Promise<void> {
    await apiClient.delete(`${this.baseURL}/groups/${groupId}/messages/${messageId}`);
  }

  /**
   * Obtener usuarios disponibles para agregar a grupos
   */
  async getAvailableUsersForGroup(): Promise<GroupChatUser[]> {
    const response = await apiClient.get(`${this.baseURL}/groups/available-users`);
    return response.data;
  }

  // ==================== TESTING Y DEBUG ====================

  async testFamilyFiltering(familyUserId: string): Promise<any> {
    const response = await apiClient.get(`${this.baseURL}/test-family-filtering/${familyUserId}`);
    return response.data;
  }
}

// ==================== INTERFACES PARA GRUPOS DE CHAT (WHATSAPP-STYLE) ====================

export interface GroupChatSummary {
  id: string;
  title: string;
  description?: string;
  avatarUrl?: string;
  type: 'group';
  participantCount: number;
  unreadCount: number;
  lastMessage?: {
    id: string;
    content: string;
    sender: {
      id: string;
      firstName: string;
      lastName: string;
    };
    createdAt: string;
  };
  lastMessageAt?: string;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface GroupChatDetail {
  id: string;
  title: string;
  description?: string;
  avatarUrl?: string;
  type: 'group';
  participants: GroupChatParticipant[];
  participantCount: number;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  createdById?: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface GroupChatParticipant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'family';
  avatarUrl?: string;
  isCreator: boolean;
  isAdmin: boolean;
}

export interface GroupChatMessage {
  id: string;
  content: string;
  contentType: 'text' | 'html' | 'markdown';
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl?: string;
  };
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  isEdited?: boolean;
  editedAt?: string;
  attachments?: Array<{
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url?: string; // Google Drive URL for audio notes
  }>;
  // Solo visible para administradores del grupo
  seenBy?: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    readAt: string;
  }>;
}

export interface CreateGroupChatDto {
  title: string;
  description?: string;
  participantIds: string[];
  initialMessage?: string;
}

export interface UpdateGroupChatDto {
  title?: string;
  description?: string;
  avatarUrl?: string;
}

export interface GroupChatUser {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'family';
  firstName: string;
  lastName: string;
  fullName: string;
}

// Singleton instance
export const communicationsService = new CommunicationsService();
export default communicationsService;