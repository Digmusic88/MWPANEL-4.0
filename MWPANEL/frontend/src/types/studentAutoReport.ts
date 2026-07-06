/**
 * Types for the automatic student report feature (Fase B — informe automático del alumno).
 * These types mirror the backend's student-report-generator module types.
 * Authority: mw-panel/backend/src/modules/student-report-generator/types/student-report.types.ts
 *
 * NOTE — deviations from the initial brief (brief adjusted to match backend truth):
 *   - AutoReportSectionKey: backend uses 'qualitative' (not 'qualitativeReports')
 *   - CompetenciesData: uses `items` (not `competencies`)
 *   - CompetencyRow: named CompetencyScore in backend; field names preserved
 *   - SocioEmotionalData: backend has richer shape (byAspect/byType/byProgress/notes)
 *   - AttendanceData: uses `attendanceRate`, `absentDays`, `lateDays` (not presentRate/absences/justified)
 *   - DuaData: uses `strengths[]`, `barriers[]`, and `accommodations` with {name,type,status}
 *   - QualitativeData: report items use `contextTag`/`content` (not context/text)
 *   - StudentAutoReportNarrative: `strengths`, `improvementAreas`, `recommendations` are string[] (not string)
 *   - StudentAutoReportMetrics: nested optional objects (academic, competencies, socioEmotional, attendance)
 */

// Matches backend's ReportSection type
export type AutoReportSectionKey =
  | 'academic'
  | 'competencies'
  | 'socioEmotional'
  | 'attendance'
  | 'dua'
  | 'qualitative';

export interface AutoReportStudent {
  id: string;
  firstName: string;
  lastName: string;
  enrollmentNumber: string;
  classGroup: string | null;
  educationalLevel: string | null;
}

export interface AcademicSubjectRow {
  subjectId: string;
  name: string;
  code: string;
  average: number | null;
  taskAverage?: number | null;
  activityAverage?: number | null;
  examAverage?: number | null;
  gradedItems: number;
}

export interface SectionWithData {
  hasData: boolean;
}

export interface AcademicData extends SectionWithData {
  overallAverage: number | null;
  subjects: AcademicSubjectRow[];
}

// Matches backend's CompetencyScore
export interface CompetencyRow {
  code: string;
  name: string;
  score: number | null;
}

// Matches backend's CompetenciesData — uses `items`, NOT `competencies`
export interface CompetenciesData extends SectionWithData {
  items: CompetencyRow[];
}

// Matches backend's richer SocioEmotionalData shape
export interface SocioEmotionalData extends SectionWithData {
  totalObservations: number;
  byAspect: Record<string, number>;
  byType: Record<string, number>;
  byProgress: Record<string, number>;
  requiresFollowUp: number;
  notes: Array<{ date: string; context: string; type: string; text: string }>;
}

// Matches backend's AttendanceData — uses attendanceRate / absentDays / lateDays
export interface AttendanceData extends SectionWithData {
  attendanceRate: number | null;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  justifiedAbsences: number;
}

// Matches backend's DuaData — uses strengths[], barriers[], accommodations with {name,type,status}
export interface DuaData extends SectionWithData {
  strengths: string[];
  barriers: string[];
  accommodations: Array<{ name: string; type: string; status: string }>;
}

// Matches backend's QualitativeData — report items use contextTag / content
export interface QualitativeData extends SectionWithData {
  reports: Array<{
    contextTag: string;
    content: string;
    priority: number;
    author: string;
    date: string;
  }>;
}

// SP-C LOMLOE progress shape (mirrors ExpedienteViewer's LomloeSubjectRow / TrimStates,
// GET /academic-records/lomloe-progress/:studentId). Kept as string|null per backend contract
// (rather than the narrower ThreeState union) to avoid coupling to ExpedienteViewer's local type.
export interface LomloeProgressTrimStates {
  T1: string | null;
  T2: string | null;
  T3: string | null;
}

export interface LomloeProgressSaber {
  basicKnowledgeId: string;
  code: string;
  name: string;
  states: LomloeProgressTrimStates;
}

export interface LomloeProgressCriterion {
  criterionId: string;
  code: string;
  name: string;
  specificCompetencyCode?: string;
  states: LomloeProgressTrimStates;
  saberes: LomloeProgressSaber[];
}

export interface LomloeProgressSubject {
  subjectName: string;
  subjectAssignmentId: string;
  criteria: LomloeProgressCriterion[];
}

export interface LomloeProgressData {
  subjects: LomloeProgressSubject[];
}

export interface StudentAutoReportData {
  student: AutoReportStudent;
  filters: {
    academicYearId: string;
    subjectIds?: string[];
    sections?: AutoReportSectionKey[];
  };
  academic?: AcademicData;
  competencies?: CompetenciesData;
  socioEmotional?: SocioEmotionalData;
  attendance?: AttendanceData;
  dua?: DuaData;
  qualitative?: QualitativeData;
  lomloeProgress?: LomloeProgressData;
}

export type OverallVerdict =
  | 'consolidado'
  | 'en_progreso'
  | 'necesita_apoyo'
  | 'sin_datos';

// Matches backend's StudentReportMetrics — nested optional metric objects
export interface StudentAutoReportMetrics {
  overallVerdict: OverallVerdict;
  academic?: {
    overallAverage: number | null;
    band: string;
    best?: { name: string; average: number };
    worst?: { name: string; average: number };
  };
  competencies?: {
    averageScore: number | null;
    strengths: string[];
    weaknesses: string[];
  };
  socioEmotional?: {
    dominantAspects: string[];
    positiveRatio: number | null;
    predominantProgress: string | null;
  };
  attendance?: {
    rate: number | null;
    alert: boolean;
  };
}

// Matches backend's StudentReportNarrative — strengths/improvementAreas/recommendations are string[]
export interface StudentAutoReportNarrative {
  aiGenerated: boolean;
  academicAssessment: string;
  socioEmotionalAssessment: string;
  strengths: string[];
  improvementAreas: string[];
  recommendations: string[];
  // Present only when the request was made with `detailed: true` (SP-D)
  detailedAcademic?: string;
  lomloeAssessment?: string;
}

export interface StudentAutoReportResult {
  student: AutoReportStudent;
  filters: {
    academicYearId: string;
    subjectIds?: string[];
    sections?: AutoReportSectionKey[];
  };
  data: StudentAutoReportData;
  metrics: StudentAutoReportMetrics;
  narrative: StudentAutoReportNarrative;
  generatedAt: string;
}

export interface AutoReportOptionSubject {
  id: string;
  name: string;
  code: string;
}

export interface AutoReportOptionYear {
  id: string;
  name: string;
}

export interface StudentAutoReportOptions {
  academicYears: AutoReportOptionYear[];
  subjects: AutoReportOptionSubject[];
}

export interface GenerateAutoReportBody {
  studentId: string;
  academicYearId: string;
  subjectIds?: string[];
  sections?: AutoReportSectionKey[];
  detailed?: boolean;
}
