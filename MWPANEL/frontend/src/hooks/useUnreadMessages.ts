import { useEffect } from 'react';
import { useNotificationStore, useMessagesBadge } from '../store/notificationStore';
import { useRealtimeNotifications } from './useRealtimeNotifications';

/**
 * Polling de seguridad: 60 s (antes 300 s).
 * El WebSocket es la fuente primaria; el polling solo actúa de fallback
 * por si la conexión WS cae o el badge queda desincronizado.
 */
const POLLING_INTERVAL_MS = 60_000;

export const useUnreadMessages = () => {
  const unreadCount = useMessagesBadge();
  const loading = useNotificationStore((state) => state.loading.messages);
  const fetchMessagesBadge = useNotificationStore((state) => state.fetchMessagesBadge);
  const setMessagesBadge = useNotificationStore((state) => state.setMessagesBadge);
  const decrementMessagesBadge = useNotificationStore((state) => state.decrementMessagesBadge);

  // Conexión WebSocket para actualizaciones en tiempo real
  useRealtimeNotifications();

  useEffect(() => {
    // Carga inicial
    fetchMessagesBadge();

    // Polling de seguridad (fallback cuando WS no está disponible)
    const interval = setInterval(fetchMessagesBadge, POLLING_INTERVAL_MS);

    // Pausar polling cuando la pestaña está oculta, reactivar al volver
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMessagesBadge();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchMessagesBadge]);

  const refreshUnreadCount = () => fetchMessagesBadge();

  const markAsRead = (count = 1) => decrementMessagesBadge(count);

  const setUnreadCount = (count: number) => setMessagesBadge(count);

  return {
    unreadCount,
    loading,
    refreshUnreadCount,
    markAsRead,
    setUnreadCount,
  };
};
