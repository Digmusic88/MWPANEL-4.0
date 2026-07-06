import { EducationalLevel, Student, Teacher, Subject, AcademicYear } from './education'

export enum EvaluationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  REVIEWED = 'reviewed',
  FINALIZED = 'finalized',
}

export enum PeriodType {
  CONTINUOUS = 'continuous',
  TRIMESTER_1 = 'trimester_1',
  TRIMESTER_2 = 'trimester_2',
  TRIMESTER_3 = 'trimester_3',
  FINAL = 'final',
  EXTRAORDINARY = 'extraordinary',
}

export interface Competency {
  id: string
  code: string
  name: string
  description: string
  educationalLevel: EducationalLevel
  areas: Area[]
}

export interface Area {
  id: string
  name: string
  code: string
  description?: string
  educationalLevel: EducationalLevel
  competencies: Competency[]
}

export interface EvaluationPeriod {
  id: string
  name: string
  type: PeriodType
  startDate: Date
  endDate: Date
  academicYear: AcademicYear
  isActive: boolean
}

export interface Evaluation {
  id: string
  student: Student
  subject: Subject
  teacher: Teacher
  period: EvaluationPeriod
  status: EvaluationStatus
  generalObservations?: string
  overallScore?: number
  competencyEvaluations: CompetencyEvaluation[]
  createdAt: Date
  updatedAt: Date
}

export interface CompetencyEvaluation {
  id: string
  evaluation: Evaluation
  competency: Competency
  score: number // 1-10 scale
  observations?: string
}

export interface RadarData {
  competency: string
  code: string
  score: number
  fullMark: number
  observations?: string
}

export interface RadarEvaluation {
  id: string
  student: Student
  period: EvaluationPeriod
  data: {
    competencies: RadarData[]
    overallScore: number
    date: Date
  }
  generatedAt: Date
}

export interface EvaluationSummary {
  studentId: string
  studentName: string
  periodId: string
  periodName: string
  overallScore: number
  competencyScores: {
    competencyId: string
    competencyName: string
    score: number
  }[]
  lastUpdated: Date
}