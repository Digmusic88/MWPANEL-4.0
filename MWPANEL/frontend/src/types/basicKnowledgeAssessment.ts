export type ThreeState = 'NOT_ACHIEVED' | 'IN_PROGRESS' | 'ACHIEVED';

export interface SaberView { basicKnowledgeId: string; code: string; title: string; description: string; }
export interface SaberCriterion { id: string; code: string; description: string; saberes: SaberView[]; }
export interface SaberGroup { specificCompetency: { id: string; code: string; name: string }; criteria: SaberCriterion[]; }
export interface SaberMark { id: string; studentId: string; basicKnowledgeId: string; levelValue: ThreeState; }
export interface DerivedCriterion { studentId: string; evaluationCriterionId: string; levelValue: ThreeState | null; }

export interface SaberGridResponse {
  students: { id: string; name: string }[];
  groups: SaberGroup[];
  saberMarks: SaberMark[];
  derived: DerivedCriterion[];
}

export interface SaberItem { studentId: string; basicKnowledgeId: string; levelValue: ThreeState; }
export interface SaberBulkPayload { subjectAssignmentId: string; evaluationPeriodId: string; items: SaberItem[]; }
