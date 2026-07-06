import { User } from './user'

export enum EducationalLevelCode {
  INFANTIL = 'INFANTIL',
  PRIMARIA = 'PRIMARIA',
  SECUNDARIA = 'SECUNDARIA',
}

export interface EducationalLevel {
  id: string
  name: string
  code: EducationalLevelCode
  description?: string
  cycles: Cycle[]
}

export interface Cycle {
  id: string
  name: string
  order: number
  educationalLevel: EducationalLevel
  courses: Course[]
}

export interface Course {
  id: string
  name: string
  order: number
  academicYear?: string
  cycle: Cycle
  subjects: Subject[]
}

export interface Subject {
  id: string
  name: string
  code: string
  weeklyHours: number
  description?: string
  course: Course
}

export interface AcademicYear {
  id: string
  name: string
  startDate: Date
  endDate: Date
  isCurrent: boolean
}

export interface ClassGroup {
  id: string
  name: string
  section?: string
  academicYear: AcademicYear
  course: Course
  tutor: Teacher
  students: Student[]
}

export interface Student {
  id: string
  enrollmentNumber: string
  birthDate: Date
  photoUrl?: string
  user: User
  educationalLevel: EducationalLevel
  course: Course
  classGroups: ClassGroup[]
}

export interface Teacher {
  id: string
  employeeNumber: string
  specialties?: string[]
  user: User
  subjects: Subject[]
  tutoredClasses: ClassGroup[]
}