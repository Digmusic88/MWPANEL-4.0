import { useEffect, useState } from 'react';

/**
 * Devuelve la hora actual y la refresca cada `intervalMs` (default 30s).
 * Solo presentación: no genera tráfico de red.
 */
export function useNow(intervalMs: number = 30000): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
