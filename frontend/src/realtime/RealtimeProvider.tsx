import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../api';

const Ctx = createContext<Socket | null>(null);
export const useRealtimeSocket = () => useContext(Ctx);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const ref = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return; // sin sesion no conectamos
    const s = io('/rt', {
      path: '/api/secretaria/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token },
    });
    ref.current = s;
    setSocket(s);
    return () => { s.disconnect(); ref.current = null; };
  }, []);

  return <Ctx.Provider value={socket}>{children}</Ctx.Provider>;
}
