export enum ClassroomType {
  REGULAR = 'regular',
  LABORATORY = 'laboratory',
  COMPUTER = 'computer',
  GYM = 'gym',
  MUSIC = 'music',
  ART = 'art',
  LIBRARY = 'library',
  AUDITORIUM = 'auditorium'
}

export enum DayOfWeek {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
}

export interface Classroom {
  id: string;
  name: string;
  code: string;
  capacity: number;
  type: ClassroomType;
  equipment?: string[];
  building?: string;
  floor?: number;
  description?: string;
  isActive: boolean;
  preferredEducationalLevel?: {
    id: string;
    name: string;
    code: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  order: number;
  isBreak: boolean;
  isActive: boolean;
  educationalLevel: {
    id: string;
    name: string;
    code: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleSession {
  id: string;
  dayOfWeek: DayOfWeek;
  startDate: string;
  endDate: string;
  isActive: boolean;
  notes?: string;
  subjectAssignment: {
    id: string;
    weeklyHours: number;
    teacher: {
      id: string;
      employeeNumber: string;
      user: {
        profile: {
          firstName: string;
          lastName: string;
        };
      };
    };
    subject: {
      id: string;
      name: string;
      code: string;
    };
    classGroup: {
      id: string;
      name: string;
    };
  };
  classroom: Classroom;
  timeSlot: TimeSlot;
  academicYear: {
    id: string;
    name: string;
    isCurrent: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassroomRequest {
  name: string;
  code: string;
  capacity: number;
  type: ClassroomType;
  equipment?: string[];
  building?: string;
  floor?: number;
  description?: string;
  isActive?: boolean;
  preferredEducationalLevelId?: string;
}

export interface CreateTimeSlotRequest {
  name: string;
  startTime: string;
  endTime: string;
  order: number;
  isBreak?: boolean;
  isActive?: boolean;
  educationalLevelId: string;
}

export interface CreateScheduleSessionRequest {
  subjectAssignmentId: string;
  classroomId: string;
  timeSlotId: string;
  dayOfWeek: DayOfWeek;
  academicYearId: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  notes?: string;
}

export const CLASSROOM_TYPE_LABELS: { [key in ClassroomType]: string } = {
  [ClassroomType.REGULAR]: 'Aula Regular',
  [ClassroomType.LABORATORY]: 'Laboratorio',
  [ClassroomType.COMPUTER]: 'Aula de Informática',
  [ClassroomType.GYM]: 'Gimnasio',
  [ClassroomType.MUSIC]: 'Aula de Música',
  [ClassroomType.ART]: 'Aula de Arte',
  [ClassroomType.LIBRARY]: 'Biblioteca',
  [ClassroomType.AUDITORIUM]: 'Auditorio',
};

export const DAY_OF_WEEK_LABELS: { [key in DayOfWeek]: string } = {
  [DayOfWeek.MONDAY]: 'Lunes',
  [DayOfWeek.TUESDAY]: 'Martes',
  [DayOfWeek.WEDNESDAY]: 'Miércoles',
  [DayOfWeek.THURSDAY]: 'Jueves',
  [DayOfWeek.FRIDAY]: 'Viernes',
};