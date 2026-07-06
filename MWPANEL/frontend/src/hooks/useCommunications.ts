import { useState, useCallback } from 'react';
import { message } from 'antd';
import { communicationsService, MessageGroup, CreateMessageGroupDto } from '../services/communications.service';

export interface BulkMessageData {
  subject: string;
  content: string;
  type?: string;
  priority?: string;
  recipientIds: string[];
}

export interface Recipient {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  classGroup?: string;
  subject?: string;
}

export const useCommunications = () => {
  const [loading, setLoading] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [messageGroups, setMessageGroups] = useState<MessageGroup[]>([]);

  const sendBulkMessage = useCallback(async (messageData: BulkMessageData) => {
    try {
      setLoading(true);
      const result = await communicationsService.sendBulkMessage(messageData);
      message.success(`Mensaje enviado exitosamente a ${messageData.recipientIds.length} destinatarios`);
      return result;
    } catch (error) {
      console.error('Error enviando mensaje bulk:', error);
      message.error('Error al enviar el mensaje');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessageToMyStudents = useCallback(async (messageData: Omit<BulkMessageData, 'recipientIds'>) => {
    try {
      setLoading(true);
      const result = await communicationsService.sendMessageToMyStudents(messageData);
      message.success(result.message);
      return result;
    } catch (error) {
      console.error('Error enviando mensaje a estudiantes:', error);
      message.error('Error al enviar el mensaje a tus estudiantes');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAvailableRecipients = useCallback(async (filters?: {
    roles?: string[];
    classGroups?: string[];
    subjects?: string[];
  }) => {
    try {
      setLoading(true);
      const data = await communicationsService.getAvailableRecipientsForBulk(filters);
      setRecipients(data);
      return data;
    } catch (error) {
      console.error('Error obteniendo destinatarios:', error);
      message.error('Error al cargar usuarios disponibles');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMyStudents = useCallback(async () => {
    try {
      setLoading(true);
      const students = await communicationsService.getMyStudents();
      return students;
    } catch (error) {
      console.error('Error obteniendo mis estudiantes:', error);
      message.error('Error al obtener tus estudiantes');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== GRUPOS DE MENSAJES ====================

  const getMessageGroups = useCallback(async () => {
    try {
      setLoading(true);
      const groups = await communicationsService.getMessageGroups();
      setMessageGroups(groups);
      return groups;
    } catch (error) {
      console.error('Error obteniendo grupos de mensajes:', error);
      message.error('Error al cargar grupos de mensajes');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const createMessageGroup = useCallback(async (groupData: CreateMessageGroupDto) => {
    try {
      setLoading(true);
      const newGroup = await communicationsService.createMessageGroup(groupData);
      message.success(`Grupo "${newGroup.name}" creado exitosamente`);
      // Actualizar lista de grupos
      await getMessageGroups();
      return newGroup;
    } catch (error) {
      console.error('Error creando grupo de mensajes:', error);
      message.error('Error al crear el grupo');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getMessageGroups]);

  const updateMessageGroup = useCallback(async (id: string, updates: Partial<CreateMessageGroupDto>) => {
    try {
      setLoading(true);
      const updatedGroup = await communicationsService.updateMessageGroup(id, updates);
      message.success(`Grupo "${updatedGroup.name}" actualizado exitosamente`);
      // Actualizar lista de grupos
      await getMessageGroups();
      return updatedGroup;
    } catch (error) {
      console.error('Error actualizando grupo de mensajes:', error);
      message.error('Error al actualizar el grupo');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getMessageGroups]);

  const deleteMessageGroup = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await communicationsService.deleteMessageGroup(id);
      message.success('Grupo eliminado exitosamente');
      // Actualizar lista de grupos
      await getMessageGroups();
    } catch (error) {
      console.error('Error eliminando grupo de mensajes:', error);
      message.error('Error al eliminar el grupo');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getMessageGroups]);

  const sendMessageToGroup = useCallback(async (groupId: string, messageData: BulkMessageData) => {
    try {
      setLoading(true);
      // Enviar mensaje usando messageGroupId
      const result = await communicationsService.createMessage({
        ...messageData,
        messageGroupId: groupId
      });
      message.success('Mensaje enviado al grupo exitosamente');
      return result;
    } catch (error) {
      console.error('Error enviando mensaje al grupo:', error);
      message.error('Error al enviar el mensaje al grupo');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    recipients,
    messageGroups,
    sendBulkMessage,
    sendMessageToMyStudents,
    getAvailableRecipients,
    getMyStudents,
    // Message groups methods
    getMessageGroups,
    createMessageGroup,
    updateMessageGroup,
    deleteMessageGroup,
    sendMessageToGroup
  };
};

export default useCommunications;