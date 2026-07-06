import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';

interface UnreadGroup {
  groupId: string;
  groupTitle: string;
  unreadCount: number;
}

interface UnreadGroupMessagesState {
  count: number;
  groups: UnreadGroup[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook para obtener el conteo de mensajes no leídos en grupos de chat
 * Incluye polling automático y refresh manual
 */
export const useUnreadGroupMessages = (pollInterval: number = 60000) => {
  const [state, setState] = useState<UnreadGroupMessagesState>({
    count: 0,
    groups: [],
    loading: true,
    error: null,
  });

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await apiClient.get('/communications/groups/unread-count');
      setState({
        count: response.data?.count || 0,
        groups: response.data?.groups || [],
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Error fetching group unread count:', error);
      // No mostrar error si es 401 (no autorizado) - el usuario simplemente no tiene sesión
      if (error.response?.status !== 401) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Error al obtener mensajes no leídos de grupos',
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
        }));
      }
    }
  }, []);

  useEffect(() => {
    // Fetch inicial
    fetchUnreadCount();

    // Polling periódico
    const interval = setInterval(fetchUnreadCount, pollInterval);

    return () => clearInterval(interval);
  }, [fetchUnreadCount, pollInterval]);

  const refreshUnreadCount = useCallback(() => {
    setState(prev => ({ ...prev, loading: true }));
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const markGroupAsRead = useCallback(async (groupId: string) => {
    try {
      await apiClient.post(`/communications/groups/${groupId}/read`);
      // Actualizar el estado local inmediatamente
      setState(prev => {
        const groupToUpdate = prev.groups.find(g => g.groupId === groupId);
        const countToSubtract = groupToUpdate?.unreadCount || 0;
        return {
          ...prev,
          count: Math.max(0, prev.count - countToSubtract),
          groups: prev.groups.filter(g => g.groupId !== groupId),
        };
      });
    } catch (error) {
      console.error('Error marking group as read:', error);
    }
  }, []);

  return {
    unreadCount: state.count,
    unreadGroups: state.groups,
    loading: state.loading,
    error: state.error,
    refreshUnreadCount,
    markGroupAsRead,
  };
};

export default useUnreadGroupMessages;
