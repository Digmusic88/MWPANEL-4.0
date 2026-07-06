import type { LomloeProgress } from '../../academic-records/services/lomloe-progress.service';

export type ReportSection = 'academic' | 'competencies' | 'socioEmotional' | 'attendance' | 'dua' | 'qualitative';

export interface StudentReportFilters {
  academicYearId: string;
  subjectIds?: string[];        // filtra la sección académica; vacío/undefined = todas
  sections?: ReportSection[];   // qué incluir; vacío/undefined = todas
  detailed?: boolean;           // modo detallado (SP-D): subgrades + catálogo LOMLOE + progreso LOMLOE
}

export interface SubjectSubgrade {
  subjectAssignmentId: string; subjectName: string;
  finalGrade: number | null;
  works: Array<{ title: string; type: string | null; score: number | null; percentage: number | null; status?: string }>;
}
export interface LomloeCatalogEntry {
  subjectAssignmentId: string; subjectName: string;
  criteria: Array<{ code: string; description: string }>;   // acotado
}

export interface AcademicSubject {
  subjectId: string; name: string; code: string;
  average: number | null;       // 0-100
  taskAverage?: number | null; activityAverage?: number | null; examAverage?: number | null;
  gradedItems: number;
}
export interface AcademicData { hasData: boolean; overallAverage: number | null; subjects: AcademicSubject[]; }

export interface CompetencyScore { code: string; name: string; score: number | null; } // 1-5
export interface CompetenciesData { hasData: boolean; items: CompetencyScore[]; scale?: '1-5' | '0-100'; }

export interface SocioEmotionalData {
  hasData: boolean;
  totalObservations: number;
  byAspect: Record<string, number>;     // social, emotional, autonomous, ...
  byType: Record<string, number>;       // ACHIEVEMENT, BEHAVIOR, ...
  byProgress: Record<string, number>;   // EMERGING..EXCEEDING
  requiresFollowUp: number;
  notes: Array<{ date: string; context: string; type: string; text: string }>;
}

export interface AttendanceData { hasData: boolean; attendanceRate: number | null; presentDays: number; absentDays: number; lateDays: number; justifiedAbsences: number; }
export interface DuaData { hasData: boolean; strengths: string[]; barriers: string[]; accommodations: Array<{ name: string; type: string; status: string }>; }
export interface QualitativeData { hasData: boolean; reports: Array<{ contextTag: string; content: string; priority: number; author: string; date: string }>; }

export interface StudentReportData {
  student: { id: string; firstName: string; lastName: string; enrollmentNumber: string; classGroup: string | null; educationalLevel: string | null };
  filters: StudentReportFilters;
  academic?: AcademicData;
  competencies?: CompetenciesData;
  socioEmotional?: SocioEmotionalData;
  attendance?: AttendanceData;
  dua?: DuaData;
  qualitative?: QualitativeData;
  subgrades?: SubjectSubgrade[];
  lomloeCatalog?: LomloeCatalogEntry[];
  lomloeProgress?: LomloeProgress;
}

export interface StudentReportMetrics {
  academic?: { overallAverage: number | null; band: string; best?: { name: string; average: number }; worst?: { name: string; average: number } };
  competencies?: { averageScore: number | null; strengths: string[]; weaknesses: string[] };
  socioEmotional?: { dominantAspects: string[]; positiveRatio: number | null; predominantProgress: string | null };
  attendance?: { rate: number | null; alert: boolean };
  overallVerdict: 'consolidado' | 'en_progreso' | 'necesita_apoyo' | 'sin_datos';
}

export interface StudentReportNarrative {
  aiGenerated: boolean;
  academicAssessment: string;
  socioEmotionalAssessment: string;
  strengths: string[];
  improvementAreas: string[];
  recommendations: string[];
  detailedAcademic?: string;
  lomloeAssessment?: string;
}

export interface StudentReportResult {
  student: StudentReportData['student'];
  filters: StudentReportFilters;
  data: StudentReportData;
  metrics: StudentReportMetrics;
  narrative: StudentReportNarrative;
  generatedAt: string;
}
