import { useEffect, useRef } from 'react';
import { useRealtimeSocket } from './RealtimeProvider';
import { makeDebouncer } from './debounce';

// Se suscribe a los topics y llama a reload (con debounce) cuando llega un cambio.
export function useLiveQuery(topics: string[], reload: () => void) {
  const socket = useRealtimeSocket();
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const key = topics.join(',');

  useEffect(() => {
    if (!socket) return;
    const debounced = makeDebouncer(() => reloadRef.current(), 300);
    const onChange = (msg: { topic: string }) => { if (topics.includes(msg.topic)) debounced(); };
    socket.emit('subscribe', { topics });
    socket.on('change', onChange);
    const onConnect = () => { socket.emit('subscribe', { topics }); reloadRef.current(); };
    socket.on('connect', onConnect);
    return () => {
      socket.emit('unsubscribe', { topics });
      socket.off('change', onChange);
      socket.off('connect', onConnect);
    };
  }, [socket, key]); // eslint-disable-line react-hooks/exhaustive-deps
}
