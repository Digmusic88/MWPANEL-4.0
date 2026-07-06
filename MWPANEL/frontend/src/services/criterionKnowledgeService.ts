import { apiClient } from './apiClient';

export type LinkStatus = 'suggested' | 'confirmed' | 'rejected';

export interface KnowledgeLink {
  linkId: string;
  basicKnowledgeId: string;
  code: string;
  title: string;
  description?: string;
  status: LinkStatus;
  confidence: number | null;
  source: 'ai' | 'manual';
}

export interface KeyComp {
  id: string;
  code: string;
  name: string;
}

export interface CriterionMapRow {
  criterion: { id: string; code: string; description: string };
  knowledge: KnowledgeLink[];
  keyCompetencies: KeyComp[];
}

export interface CriterionKnowledgeView {
  knowledge: { code: string; title: string; block: string; description?: string }[];
  keyCompetencies: { id: string; code: string; name: string }[];
}

export interface ScopeOption {
  scopeType: 'cycle' | 'course';
  scopeId: string;
  label: string;
}

const base = '/criterion-knowledge';

export const criterionKnowledgeService = {
  getMap: (subjectName: string, scopeType: 'cycle' | 'course', scopeId: string) =>
    apiClient.get<CriterionMapRow[]>(`${base}/map`, { params: { subjectName, scopeType, scopeId } }).then((r) => r.data),

  suggest: (subjectName: string, scopeType: 'cycle' | 'course', scopeId: string) =>
    apiClient.post(`${base}/suggest`, { subjectName, scopeType, scopeId }).then((r) => r.data),

  setStatus: (linkId: string, status: LinkStatus) =>
    apiClient.put(`${base}/${linkId}`, { status }).then((r) => r.data),

  linkManual: (evaluationCriterionId: string, basicKnowledgeId: string) =>
    apiClient.post(base, { evaluationCriterionId, basicKnowledgeId }).then((r) => r.data),

  unlink: (linkId: string) => apiClient.delete(`${base}/${linkId}`).then((r) => r.data),

  getForCriterion: (criterionId: string) =>
    apiClient.get<CriterionKnowledgeView>(`${base}/criterion/${criterionId}`).then((r) => r.data),

  getCandidates: (criterionId: string) =>
    apiClient.get<{ id: string; code: string; title: string; block: string }[]>(`${base}/candidates/${criterionId}`).then((r) => r.data),

  getScopes: (subjectName: string) =>
    apiClient.get<ScopeOption[]>(`${base}/scopes`, { params: { subjectName } }).then((r) => r.data),
};
