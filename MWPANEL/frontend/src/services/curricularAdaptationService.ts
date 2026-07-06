import apiClient from '@services/apiClient';

export type CurricularAdaptationType = 'ACCESS' | 'NON_SIGNIFICANT' | 'SIGNIFICANT';

export interface CurricularAdaptation {
  id: string;
  studentId: string;
  subjectId: string;
  academicYearId: string;
  type: CurricularAdaptationType;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  subject?: { id: string; name: string };
  academicYear?: { id: string; name: string };
}

export interface UpsertCurricularAdaptationBody {
  studentId: string;
  subjectId: string;
  academicYearId: string;
  type: CurricularAdaptationType;
  notes?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdateCurricularAdaptationBody {
  type?: CurricularAdaptationType;
  notes?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export const curricularAdaptationService = {
  listForStudent: (studentId: string, academicYearId?: string): Promise<CurricularAdaptation[]> =>
    apiClient
      .get(`/dua/curricular-adaptations/student/${studentId}${academicYearId ? `?academicYearId=${academicYearId}` : ''}`)
      .then((r) => r.data),
  upsert: (body: UpsertCurricularAdaptationBody): Promise<CurricularAdaptation> =>
    apiClient.post('/dua/curricular-adaptations', body).then((r) => r.data),
  update: (id: string, body: UpdateCurricularAdaptationBody): Promise<CurricularAdaptation> =>
    apiClient.patch(`/dua/curricular-adaptations/${id}`, body).then((r) => r.data),
  remove: (id: string): Promise<void> => apiClient.delete(`/dua/curricular-adaptations/${id}`).then((r) => r.data),
};

export default curricularAdaptationService;
