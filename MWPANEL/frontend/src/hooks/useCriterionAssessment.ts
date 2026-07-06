import { useState, useCallback } from 'react';
import { criterionAssessmentService } from '@/services/criterionAssessmentService';
import { GridResponse, BulkPayload } from '@/types/criterionAssessment';

export function useCriterionAssessment() {
  const [grid, setGrid] = useState<GridResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGrid = useCallback(async (saId: string, periodId: string) => {
    setLoading(true); setError(null);
    try { setGrid(await criterionAssessmentService.getGrid(saId, periodId)); }
    catch (e: any) { setError(e?.message || 'Error al cargar la rejilla'); }
    finally { setLoading(false); }
  }, []);

  const save = useCallback(async (payload: BulkPayload) => {
    setSaving(true); setError(null);
    try { return await criterionAssessmentService.bulkSave(payload); }
    catch (e: any) { setError(e?.message || 'Error al guardar'); return null; }
    finally { setSaving(false); }
  }, []);

  return { grid, loading, saving, error, loadGrid, save };
}
