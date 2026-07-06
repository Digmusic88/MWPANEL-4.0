import { apiClient } from './apiClient';
import { SaberGridResponse, SaberBulkPayload } from '@/types/basicKnowledgeAssessment';

class BasicKnowledgeAssessmentService {
  async getGrid(subjectAssignmentId: string, evaluationPeriodId: string): Promise<SaberGridResponse> {
    const r = await apiClient.get('/basic-knowledge-assessment/grid', { params: { subjectAssignmentId, evaluationPeriodId } });
    return r.data;
  }
  async bulkSave(payload: SaberBulkPayload): Promise<{ saved: number; derived: number }> {
    const r = await apiClient.post('/basic-knowledge-assessment/bulk', payload);
    return r.data;
  }
}
export const basicKnowledgeAssessmentService = new BasicKnowledgeAssessmentService();
