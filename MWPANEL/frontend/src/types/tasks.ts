// Tipos para el sistema de Tareas/Deberes

export enum TaskType {
  ASSIGNMENT = 'assignment',
  PROJECT = 'project',
  EXAM = 'exam',
  HOMEWORK = 'homework',
  RESEARCH = 'research',
  PRESENTATION = 'presentation',
  QUIZ = 'quiz',
}

export enum TaskStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum SubmissionStatus {
  NOT_SUBMITTED = 'not_submitted',
  SUBMITTED = 'submitted',
  LATE = 'late',
  GRADED = 'graded',
  RETURNED = 'returned',
  RESUBMITTED = 'resubmitted',
}

export interface TaskAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  type: string;
  description?: string;
  downloadCount: number;
  uploadedAt: string;
}

export interface TaskSubmissionAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  status: string;
  description?: string;
  isMainSubmission: boolean;
  version: number;
  uploadedAt: string;
}

export interface TaskSubmission {
  id: string;
  content?: string;
  status: SubmissionStatus;
  submittedAt?: string;
  firstSubmittedAt?: string;
  gradedAt?: string;
  returnedAt?: string;
  grade?: number;
  finalGrade?: number;
  teacherFeedback?: string;
  privateNotes?: string;
  isLate: boolean;
  isGraded: boolean;
  needsRevision: boolean;
  attemptNumber: number;
  revisionCount: number;
  submissionNotes?: string;
  isExamNotification?: boolean; // Para distinguir notificaciones de examen
  student: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  attachments: TaskSubmissionAttachment[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  taskType: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assignedDate: string;
  dueDate: string;
  publishedAt?: string;
  closedAt?: string;
  maxPoints?: number;
  allowLateSubmission: boolean;
  latePenalty: number;
  notifyFamilies: boolean;
  requiresFile: boolean;
  allowedFileTypes?: string;
  maxFileSize?: number;
  rubric?: string;
  valuationType?: 'emoji' | 'score' | 'rubric';
  rubricId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  teacherId: string;
  subjectAssignmentId: string;
  subjectAssignment: {
    id: string;
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
  teacher: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  submissions: TaskSubmission[];
  attachments: TaskAttachment[];
}

export interface TaskStatistics {
  totalTasks: number;
  publishedTasks: number;
  draftTasks: number;
  closedTasks: number;
  overdueTasks: number;
  totalSubmissions: number;
  gradedSubmissions: number;
  pendingSubmissions: number;
  lateSubmissions: number;
  averageGrade: number;
  submissionRate: number;
}

export interface StudentTaskStatistics {
  totalAssigned: number;
  submitted: number;
  pending: number;
  graded: number;
  lateSubmissions: number;
  averageGrade: number;
  submissionRate: number;
  nextDueDate?: string;
}

export interface CreateTaskForm {
  title: string;
  description?: string;
  instructions?: string;
  taskType: TaskType;
  priority?: TaskPriority;
  assignedDate: string;
  dueDate: string;
  subjectAssignmentId: string;
  maxPoints?: number;
  allowLateSubmission?: boolean;
  latePenalty?: number;
  notifyFamilies?: boolean;
  requiresFile?: boolean;
  allowedFileTypes?: string[];
  maxFileSizeMB?: number;
  rubric?: string;
  valuationType?: 'emoji' | 'score' | 'rubric';
  rubricId?: string;
  targetStudentIds?: string[];
}

export interface TaskQueryParams {
  page?: number;
  limit?: number;
  classGroupId?: string;
  subjectAssignmentId?: string;
  taskType?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string;
  endDate?: string;
  onlyOverdue?: boolean;
  hasPendingSubmissions?: boolean;
  search?: string;
}

export interface GradeTaskForm {
  grade: number;
  teacherFeedback?: string;
  privateNotes?: string;
  needsRevision?: boolean;
}

export interface SubmitTaskForm {
  content?: string;
  submissionNotes?: string;
}

// Constantes útiles
export const TASK_TYPE_LABELS = {
  [TaskType.ASSIGNMENT]: 'Tarea',
  [TaskType.PROJECT]: 'Proyecto',
  [TaskType.EXAM]: 'Test Yourself',
  [TaskType.HOMEWORK]: 'Deberes',
  [TaskType.RESEARCH]: 'Investigación',
  [TaskType.PRESENTATION]: 'Presentación',
  [TaskType.QUIZ]: 'Cuestionario',
};

export const TASK_STATUS_LABELS = {
  [TaskStatus.DRAFT]: 'Borrador',
  [TaskStatus.PUBLISHED]: 'Publicada',
  [TaskStatus.CLOSED]: 'Cerrada',
  [TaskStatus.ARCHIVED]: 'Archivada',
};

export const TASK_PRIORITY_LABELS = {
  [TaskPriority.LOW]: 'Baja',
  [TaskPriority.MEDIUM]: 'Media',
  [TaskPriority.HIGH]: 'Alta',
  [TaskPriority.URGENT]: 'Urgente',
};

export const SUBMISSION_STATUS_LABELS = {
  [SubmissionStatus.NOT_SUBMITTED]: 'No entregada',
  [SubmissionStatus.SUBMITTED]: 'Entregada',
  [SubmissionStatus.LATE]: 'Entregada tarde',
  [SubmissionStatus.GRADED]: 'Calificada',
  [SubmissionStatus.RETURNED]: 'Devuelta',
  [SubmissionStatus.RESUBMITTED]: 'Reenviada',
};

export const TASK_PRIORITY_COLORS = {
  [TaskPriority.LOW]: '#52c41a',
  [TaskPriority.MEDIUM]: '#1890ff',
  [TaskPriority.HIGH]: '#faad14',
  [TaskPriority.URGENT]: '#ff4d4f',
};

export const TASK_STATUS_COLORS = {
  [TaskStatus.DRAFT]: '#d9d9d9',
  [TaskStatus.PUBLISHED]: '#52c41a',
  [TaskStatus.CLOSED]: '#faad14',
  [TaskStatus.ARCHIVED]: '#8c8c8c',
};

export const SUBMISSION_STATUS_COLORS = {
  [SubmissionStatus.NOT_SUBMITTED]: '#ff4d4f',
  [SubmissionStatus.SUBMITTED]: '#1890ff',
  [SubmissionStatus.LATE]: '#faad14',
  [SubmissionStatus.GRADED]: '#52c41a',
  [SubmissionStatus.RETURNED]: '#722ed1',
  [SubmissionStatus.RESUBMITTED]: '#13c2c2',
};

// DTOs para la entrega de tareas
export interface SubmitTaskDto {
  content: string;
  comments?: string;
}