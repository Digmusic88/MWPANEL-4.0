import { useEffect, useState, useCallback } from 'react';
import { useRealtimeSocket } from './RealtimeProvider';

export type Presence = { userId: string; displayName: string; editing: string | null };

export function useRoomPresence(roomKey: string | null) {
  const socket = useRealtimeSocket();
  const [present, setPresent] = useState<Presence[]>([]);

  useEffect(() => {
    if (!socket || !roomKey) return;
    const onPresence = (msg: { roomKey: string; present: Presence[] }) => {
      if (msg.roomKey === roomKey) setPresent(msg.present);
    };
    socket.on('presence', onPresence);
    socket.emit('presence:join', { roomKey });
    const onConnect = () => { socket.emit('presence:join', { roomKey }); };
    socket.on('connect', onConnect);
    return () => {
      socket.emit('presence:leave', { roomKey });
      socket.off('presence', onPresence);
      socket.off('connect', onConnect);
      setPresent([]);
    };
  }, [socket, roomKey]);

  const startEditing = useCallback((targetKey: string) => {
    if (socket && roomKey) socket.emit('edit:start', { roomKey, targetKey });
  }, [socket, roomKey]);
  const stopEditing = useCallback(() => {
    if (socket && roomKey) socket.emit('edit:stop', { roomKey });
  }, [socket, roomKey]);

  return { present, startEditing, stopEditing };
}
