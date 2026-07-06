import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/services/apiClient';
import { criterionAssessmentService } from '../criterionAssessmentService';

vi.mock('@/services/apiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));

describe('criterionAssessmentService', () => {
  beforeEach(() => vi.clearAllMocks());
  it('getGrid devuelve response.data', async () => {
    const grid = { students: [], groups: [], scaleConfig: {}, assessments: [] };
    (apiClient.get as any).mockResolvedValue({ data: grid });
    const res = await criterionAssessmentService.getGrid('a1', 'p1');
    expect(apiClient.get).toHaveBeenCalledWith('/criterion-assessment/grid', { params: { subjectAssignmentId: 'a1', evaluationPeriodId: 'p1' } });
    expect(res).toEqual(grid);
  });
  it('bulkSave hace POST', async () => {
    (apiClient.post as any).mockResolvedValue({ data: { saved: 2 } });
    const payload = { subjectAssignmentId: 'a1', evaluationPeriodId: 'p1', items: [] };
    const res = await criterionAssessmentService.bulkSave(payload as any);
    expect(apiClient.post).toHaveBeenCalledWith('/criterion-assessment/bulk', payload);
    expect(res).toEqual({ saved: 2 });
  });
});
