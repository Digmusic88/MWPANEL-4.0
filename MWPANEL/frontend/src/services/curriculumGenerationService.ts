import { apiClient } from './apiClient';

export interface GenCriterion { code: string; description: string; }
export interface GenSpecific { code: string; name: string; description: string; keyCompetencyCodes: string[]; criteria: GenCriterion[]; }
export interface GenKnowledge { code: string; block: string; title: string; description: string; knowledgeType: string; }
export interface GenPayload { specificCompetencies: GenSpecific[]; basicKnowledge: GenKnowledge[]; }
export interface Generation { id: string; subjectName: string; scopeType: 'cycle' | 'course'; scopeId: string; status: string; payload: GenPayload; }

const base = '/curriculum-generation';
export const curriculumGenerationService = {
  generate: (subjectName: string, scopeType: 'cycle' | 'course', scopeId: string) =>
    apiClient.post<Generation>(`${base}/generate`, { subjectName, scopeType, scopeId }).then((r) => r.data),
  getOne: (id: string) => apiClient.get<Generation>(`${base}/${id}`).then((r) => r.data),
  save: (id: string, payload: GenPayload) => apiClient.put<Generation>(`${base}/${id}`, { payload }).then((r) => r.data),
  apply: (id: string) => apiClient.post(`${base}/${id}/apply`).then((r) => r.data),
  discard: (id: string) => apiClient.delete(`${base}/${id}`).then((r) => r.data),
};
