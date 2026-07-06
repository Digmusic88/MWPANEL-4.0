import { useCallback, useEffect, useState } from 'react';
import apiClient from '@services/apiClient';

export interface LomloeKeyDatum { code: string; name: string; score: number; }
export interface LomloeSpecificDatum { id: string; code: string; name: string; score: number; }

interface Result {
  byKey: LomloeKeyDatum[];
  bySpecific: LomloeSpecificDatum[];
  hasData: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useStudentLomloeCompetencies = (studentId?: string): Result => {
  const [byKey, setByKey] = useState<LomloeKeyDatum[]>([]);
  const [bySpecific, setBySpecific] = useState<LomloeSpecificDatum[]>([]);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/criterion-assessment/valuation/student/${studentId}`);
      const d = res.data || {};
      setByKey(Array.isArray(d.byKey) ? d.byKey : []);
      setBySpecific(Array.isArray(d.bySpecific) ? d.bySpecific : []);
      setHasData(Boolean(d.hasData));
    } catch (e: any) {
      // Fail-soft: sin datos LOMLOE la página cae al radar antiguo.
      setByKey([]); setBySpecific([]); setHasData(false);
      setError(e?.response?.data?.message || 'Error al cargar competencias LOMLOE');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { byKey, bySpecific, hasData, loading, error, refetch: fetchData };
};

export default useStudentLomloeCompetencies;
