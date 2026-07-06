/**
 * @archivo: useGroupChats.ts
 * @módulo: Hooks
 * @función: Hook para gestión de grupos de chat estilo WhatsApp
 * @creado_por: Sistema de Grupos MW Panel 2.0
 * @fecha: 2025-12-15
 */

import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import {
  communicationsService,
  GroupChatSummary,
  GroupChatDetail,
  GroupChatMessage,
  CreateGroupChatDto,
  UpdateGroupChatDto,
  GroupChatUser,
} from '../services/communications.service';

interface UseGroupChatsReturn {
  // Estado
  groups: GroupChatSummary[];
  currentGroup: GroupChatDetail | null;
  messages: GroupChatMessage[];
  availableUsers: GroupChatUser[];
  loading: boolean;
  loadingMessages: boolean;
  error: string | null;

  // Métodos de grupos
  fetchGroups: () => Promise<void>;
  createGroup: (data: CreateGroupChatDto) => Promise<GroupChatDetail | null>;
  updateGroup: (groupId: string, data: UpdateGroupChatDto) => Promise<GroupChatDetail | null>;
  deleteGroup: (groupId: string) => Promise<boolean>;
  archiveGroup: (groupId: string) => Promise<boolean>;
  leaveGroup: (groupId: string) => Promise<boolean>;

  // Métodos de detalle
  selectGroup: (groupId: string) => Promise<void>;
  clearSelectedGroup: () => void;

  // Métodos de miembros
  fetchAvailableUsers: () => Promise<void>;
  addMembers: (groupId: string, userIds: string[]) => Promise<boolean>;
  removeMember: (groupId: string, userId: string) => Promise<boolean>;
  promoteMember: (groupId: string, memberId: string) => Promise<boolean>;
  demoteMember: (groupId: string, memberId: string) => Promise<boolean>;

  // Métodos de mensajes
  fetchMessages: (groupId: string, limit?: number, offset?: number) => Promise<void>;
  sendMessage: (groupId: string, content: string, files?: File[]) => Promise<GroupChatMessage | null>;
  markAsRead: (groupId: string) => Promise<void>;
  markGroupAsUnread: (groupId: string) => Promise<void>;
  loadMoreMessages: (groupId: string) => Promise<void>;
}

export function useGroupChats(): UseGroupChatsReturn {
  // Estado
  const [groups, setGroups] = useState<GroupChatSummary[]>([]);
  const [currentGroup, setCurrentGroup] = useState<GroupChatDetail | null>(null);
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [availableUsers, setAvailableUsers] = useState<GroupChatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messagesOffset, setMessagesOffset] = useState(0);

  // ==================== MÉTODOS DE GRUPOS ====================

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await communicationsService.getMyGroupChats();
      setGroups(data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al cargar grupos';
      setError(errorMsg);
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createGroup = useCallback(async (data: CreateGroupChatDto): Promise<GroupChatDetail | null> => {
    setLoading(true);
    try {
      const newGroup = await communicationsService.createGroupChat(data);
      message.success('Grupo creado exitosamente');
      await fetchGroups(); // Refrescar lista
      return newGroup;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al crear el grupo';
      message.error(errorMsg);
      console.error('Error creating group:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchGroups]);

  const updateGroup = useCallback(async (groupId: string, data: UpdateGroupChatDto): Promise<GroupChatDetail | null> => {
    try {
      const updatedGroup = await communicationsService.updateGroupChat(groupId, data);
      message.success('Grupo actualizado');
      setCurrentGroup(updatedGroup);
      await fetchGroups(); // Refrescar lista
      return updatedGroup;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al actualizar el grupo';
      message.error(errorMsg);
      console.error('Error updating group:', err);
      return null;
    }
  }, [fetchGroups]);

  const deleteGroup = useCallback(async (groupId: string): Promise<boolean> => {
    try {
      await communicationsService.deleteGroupChat(groupId);
      message.success('Grupo eliminado');
      setCurrentGroup(null);
      setMessages([]);
      await fetchGroups();
      return true;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al eliminar el grupo';
      message.error(errorMsg);
      console.error('Error deleting group:', err);
      return false;
    }
  }, [fetchGroups]);

  const archiveGroup = useCallback(async (groupId: string): Promise<boolean> => {
    try {
      await communicationsService.archiveGroupChat(groupId);
      message.success('Grupo archivado');
      await fetchGroups();
      return true;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al archivar el grupo';
      message.error(errorMsg);
      console.error('Error archiving group:', err);
      return false;
    }
  }, [fetchGroups]);

  const leaveGroup = useCallback(async (groupId: string): Promise<boolean> => {
    try {
      await communicationsService.leaveGroupChat(groupId);
      message.success('Has abandonado el grupo');
      setCurrentGroup(null);
      setMessages([]);
      await fetchGroups();
      return true;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al abandonar el grupo';
      message.error(errorMsg);
      console.error('Error leaving group:', err);
      return false;
    }
  }, [fetchGroups]);

  // ==================== MÉTODOS DE DETALLE ====================

  const selectGroup = useCallback(async (groupId: string) => {
    setLoading(true);
    setError(null);
    try {
      const detail = await communicationsService.getGroupChatDetail(groupId);
      setCurrentGroup(detail);
      // Cargar mensajes
      setMessagesOffset(0);
      const msgs = await communicationsService.getGroupChatMessages(groupId, 500);
      setMessages(msgs);
      // Marcar como leído
      await communicationsService.markGroupChatAsRead(groupId);
      // Refrescar lista para actualizar unreadCount
      fetchGroups();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al cargar el grupo';
      setError(errorMsg);
      console.error('Error selecting group:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchGroups]);

  const clearSelectedGroup = useCallback(() => {
    setCurrentGroup(null);
    setMessages([]);
    setMessagesOffset(0);
  }, []);

  // ==================== MÉTODOS DE MIEMBROS ====================

  const fetchAvailableUsers = useCallback(async () => {
    try {
      const users = await communicationsService.getAvailableUsersForGroup();
      setAvailableUsers(users);
    } catch (err: any) {
      console.error('Error fetching available users:', err);
    }
  }, []);

  const addMembers = useCallback(async (groupId: string, userIds: string[]): Promise<boolean> => {
    try {
      const updatedGroup = await communicationsService.addGroupChatMembers(groupId, userIds);
      message.success('Miembros agregados');
      setCurrentGroup(updatedGroup);
      return true;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al agregar miembros';
      message.error(errorMsg);
      console.error('Error adding members:', err);
      return false;
    }
  }, []);

  const removeMember = useCallback(async (groupId: string, userId: string): Promise<boolean> => {
    try {
      const updatedGroup = await communicationsService.removeGroupChatMember(groupId, userId);
      message.success('Miembro eliminado');
      setCurrentGroup(updatedGroup);
      return true;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al eliminar miembro';
      message.error(errorMsg);
      console.error('Error removing member:', err);
      return false;
    }
  }, []);

  // ==================== MÉTODOS DE MENSAJES ====================

  const fetchMessages = useCallback(async (groupId: string, limit = 500, offset = 0) => {
    setLoadingMessages(true);
    try {
      const msgs = await communicationsService.getGroupChatMessages(groupId, limit, offset);
      setMessages(msgs);
      setMessagesOffset(offset);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const sendMessage = useCallback(async (groupId: string, content: string, files?: File[]): Promise<GroupChatMessage | null> => {
    try {
      let newMessage: GroupChatMessage;

      if (files && files.length > 0) {
        // Enviar con archivos adjuntos
        newMessage = await communicationsService.sendGroupChatMessageWithAttachments(groupId, content, files);
      } else {
        // Enviar solo texto
        newMessage = await communicationsService.sendGroupChatMessage(groupId, content);
      }

      setMessages(prev => [...prev, newMessage]);
      // Actualizar lastMessageAt en la lista de grupos
      fetchGroups();
      return newMessage;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al enviar mensaje';
      message.error(errorMsg);
      console.error('Error sending message:', err);
      return null;
    }
  }, [fetchGroups]);

  const markAsRead = useCallback(async (groupId: string) => {
    try {
      await communicationsService.markGroupChatAsRead(groupId);
    } catch (err: any) {
      console.error('Error marking as read:', err);
    }
  }, []);

  const markGroupAsUnread = useCallback(async (groupId: string) => {
    try {
      await communicationsService.markGroupChatAsUnread(groupId);
      message.success('Grupo marcado como no leído');
      await fetchGroups();
    } catch (err: any) {
      console.error('Error marking group as unread:', err);
      message.error('Error al marcar como no leído');
    }
  }, [fetchGroups]);

  const loadMoreMessages = useCallback(async (groupId: string) => {
    const newOffset = messagesOffset + 500;
    setLoadingMessages(true);
    try {
      const olderMessages = await communicationsService.getGroupChatMessages(groupId, 500, newOffset);
      if (olderMessages.length > 0) {
        setMessages(prev => [...olderMessages, ...prev]);
        setMessagesOffset(newOffset);
      }
    } catch (err: any) {
      console.error('Error loading more messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [messagesOffset]);

  const editMessage = useCallback(async (groupId: string, messageId: string, content: string): Promise<boolean> => {
    try {
      const updatedMessage = await communicationsService.editGroupChatMessage(groupId, messageId, content);
      setMessages(prev => prev.map(msg => msg.id === messageId ? updatedMessage : msg));
      message.success('Mensaje editado correctamente');
      return true;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al editar el mensaje';
      message.error(errorMsg);
      console.error('Error editing message:', err);
      return false;
    }
  }, []);

  const deleteMessage = useCallback(async (groupId: string, messageId: string): Promise<boolean> => {
    try {
      await communicationsService.deleteGroupChatMessage(groupId, messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      message.success('Mensaje eliminado correctamente');
      return true;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al eliminar el mensaje';
      message.error(errorMsg);
      console.error('Error deleting message:', err);
      return false;
    }
  }, []);

  const promoteMember = useCallback(async (groupId: string, memberId: string) => {
    try {
      const updatedGroup = await communicationsService.promoteToAdmin(groupId, memberId);
      setCurrentGroup(updatedGroup);
      message.success('Miembro promovido a administrador.');
      return true;
    } catch (error: any) {
      console.error('Error promoting member:', error);
      message.error(error.response?.data?.message || 'Error al promover miembro.');
      return false;
    }
  }, []);

  const demoteMember = useCallback(async (groupId: string, memberId: string) => {
    try {
      const updatedGroup = await communicationsService.demoteAdmin(groupId, memberId);
      setCurrentGroup(updatedGroup);
      message.success('Administrador revocado.');
      return true;
    } catch (error: any) {
      console.error('Error demoting member:', error);
      message.error(error.response?.data?.message || 'Error al revocar administrador.');
      return false;
    }
  }, []);

  return {
    // Estado
    groups,
    currentGroup,
    messages,
    availableUsers,
    loading,
    loadingMessages,
    error,

    // Métodos de grupos
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    archiveGroup,
    leaveGroup,

    // Métodos de detalle
    selectGroup,
    clearSelectedGroup,

    // Métodos de miembros
    fetchAvailableUsers,
    addMembers,
    removeMember,
    promoteMember,
    demoteMember,

    // Métodos de mensajes
    fetchMessages,
    sendMessage,
    markAsRead,
    markGroupAsUnread,
    loadMoreMessages,
    editMessage,
    deleteMessage,
  };
}

export default useGroupChats;
