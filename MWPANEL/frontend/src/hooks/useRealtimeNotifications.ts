import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';

const WS_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? '';

interface BadgeUpdatePayload {
  messages?: number;
  notifications?: number;
}

interface NewMessagePayload {
  messageId: string;
  senderId: string;
  senderName: string;
  subject: string;
  preview: string;
  type: 'direct' | 'group' | 'announcement';
  unreadCount: number;
}

interface NewNotificationPayload {
  notificationId: string;
  title: string;
  content: string;
  type: string;
  actionUrl?: string;
  unreadCount: number;
}

/**
 * useRealtimeNotifications
 *
 * Conecta al WebSocket /ws y mantiene los badges de mensajes y
 * notificaciones actualizados en tiempo real sin necesidad de polling.
 *
 * Eventos escuchados:
 *   - new_message          → incrementa badge de mensajes con el valor del servidor
 *   - notification_created → incrementa badge de notificaciones
 *   - badge_update         → sincroniza ambos badges (usado al marcar como leído)
 *
 * Se desconecta automáticamente al cerrar sesión o desmontar.
 */
export function useRealtimeNotifications() {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((s) => s.token);
  const setMessagesBadge = useNotificationStore((s) => s.setMessagesBadge);
  const setNotificationsBadge = useNotificationStore((s) => s.setNotificationsBadge);
  const fetchAllBadges = useNotificationStore((s) => s.fetchAllBadges);

  useEffect(() => {
    if (!token) {
      // Sin sesión: desconectar si había socket activo
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Evitar doble conexión si ya hay un socket activo con el mismo token
    if (socketRef.current?.connected) return;

    const socket = io(`${WS_URL}/ws`, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.debug('[WS] Conectado al servidor de notificaciones');
      // Al reconectar, sincronizar contadores con la BD por si hubo mensajes
      // mientras estaba offline
      fetchAllBadges();
    });

    socket.on('disconnect', (reason) => {
      console.debug(`[WS] Desconectado: ${reason}`);
    });

    socket.on('connect_error', (err) => {
      console.warn(`[WS] Error de conexión: ${err.message}`);
    });

    // Nuevo mensaje directo o grupal recibido
    socket.on('new_message', (payload: NewMessagePayload) => {
      // El servidor ya calculó el contador correcto; lo usamos directamente
      setMessagesBadge(payload.unreadCount);
    });

    // Nueva notificación del sistema
    socket.on('notification_created', (payload: NewNotificationPayload) => {
      setNotificationsBadge(payload.unreadCount);
    });

    // Actualización explícita de badges (tras marcar como leído en otro dispositivo)
    socket.on('badge_update', (payload: BadgeUpdatePayload) => {
      if (payload.messages !== undefined) setMessagesBadge(payload.messages);
      if (payload.notifications !== undefined) setNotificationsBadge(payload.notifications);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // Solo reconectar si el token cambia (login/logout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
}
