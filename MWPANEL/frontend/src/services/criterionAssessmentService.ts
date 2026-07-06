import { apiClient } from './apiClient';
import { GridResponse, BulkPayload, ScaleConfig, Valuation } from '@/types/criterionAssessment';

class CriterionAssessmentService {
  async getGrid(subjectAssignmentId: string, evaluationPeriodId: string): Promise<GridResponse> {
    const r = await apiClient.get('/criterion-assessment/grid', { params: { subjectAssignmentId, evaluationPeriodId } });
    return r.data;
  }
  async bulkSave(payload: BulkPayload): Promise<{ saved: number }> {
    const r = await apiClient.post('/criterion-assessment/bulk', payload);
    return r.data;
  }
  async getScale(subjectAssignmentId: string): Promise<ScaleConfig> {
    const r = await apiClient.get('/criterion-assessment/scale-config', { params: { subjectAssignmentId } });
    return r.data;
  }
  async setScale(subjectAssignmentId: string, cfg: Partial<ScaleConfig>): Promise<void> {
    await apiClient.put('/criterion-assessment/scale-config', cfg, { params: { subjectAssignmentId } });
  }
  async getValuation(studentId: string, subjectAssignmentId: string, evaluationPeriodId: string): Promise<Valuation> {
    const r = await apiClient.get('/criterion-assessment/valuation', { params: { studentId, subjectAssignmentId, evaluationPeriodId } });
    return r.data;
  }
  async getMode(subjectAssignmentId: string, gradePeriod: string): Promise<{ mode: 'parallel' | 'derive' | 'replace' }> {
    const r = await apiClient.get('/criterion-assessment/grade-mode', { params: { subjectAssignmentId, gradePeriod } });
    return r.data;
  }
  async setMode(subjectAssignmentId: string, gradePeriod: string, mode: 'parallel' | 'derive' | 'replace'): Promise<void> {
    await apiClient.put('/criterion-assessment/grade-mode', { mode }, { params: { subjectAssignmentId, gradePeriod } });
  }
}
export const criterionAssessmentService = new CriterionAssessmentService();
