export type ScaleType = 'levels' | 'levels3' | 'numeric';
export type AchievementLevel = 'EMERGING' | 'DEVELOPING' | 'ACHIEVING' | 'EXCEEDING' | 'NOT_ACHIEVED' | 'IN_PROGRESS' | 'ACHIEVED';

export interface ScaleConfig { scaleType: ScaleType; numericMax: number; levelMapping: Record<string, number>; }
export interface GridStudent { id: string; name: string; }
export interface GridCriterion { id: string; code: string; description: string; }
export interface GridGroup { specificCompetency: { id: string; code: string; name: string }; criteria: GridCriterion[]; }
export interface ExistingAssessment {
  id: string; studentId: string; evaluationCriterionId: string;
  scaleType: ScaleType; levelValue: AchievementLevel | null; numericValue: number | null; normalizedScore: number;
  source?: 'manual' | 'derived';
}
export interface GridResponse { students: GridStudent[]; groups: GridGroup[]; scaleConfig: ScaleConfig; assessments: ExistingAssessment[]; }

export interface AssessmentItem { studentId: string; evaluationCriterionId: string; levelValue?: AchievementLevel; numericValue?: number; observations?: string; }
export interface BulkPayload { subjectAssignmentId: string; evaluationPeriodId: string; items: AssessmentItem[]; }

export interface Valuation {
  bySpecific: { id: string; code: string; name: string; score: number }[];
  byKey: { code: string; name: string; score: number }[];
}
