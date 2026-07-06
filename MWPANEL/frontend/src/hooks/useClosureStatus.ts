import { useCallback, useEffect, useState } from 'react';
import { getClosureStatus, ClosureStatus } from '../services/closureApi';

export function useClosureStatus() {
  const [status, setStatus] = useState<ClosureStatus>({ enabled: false, allowedSections: [], message: '' });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getClosureStatus();
      setStatus(data);
    } catch {
      // En error, no bloquear la UI: tratar como cierre inactivo.
      setStatus({ enabled: false, allowedSections: [], message: '' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...status, loading, refresh };
}
