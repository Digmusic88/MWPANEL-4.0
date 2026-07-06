import apiClient from './apiClient';

export type ThreeState = 'NOT_ACHIEVED' | 'IN_PROGRESS' | 'ACHIEVED';
export interface WorkSaber { id: string; code?: string; name: string; criterionId?: string }
export interface WorkCell { subjectAssignmentId: string | null; evaluationPeriodId: string | null; saberes: WorkSaber[]; marks: Record<string, ThreeState> }

export const workSaberService = {
  async getCell(workId: string, workType: string, studentId: string): Promise<WorkCell> {
    const r = await apiClient.get('/work-basic-knowledge-assessment/cell', { params: { workId, workType, studentId } });
    return r.data;
  },
  async bulk(workId: string, workType: string, studentId: string, marks: { basicKnowledgeId: string; levelValue: ThreeState }[]): Promise<{ saved: number; derived: number }> {
    const r = await apiClient.post('/work-basic-knowledge-assessment/bulk', { workId, workType, studentId, marks });
    return r.data;
  },
};
