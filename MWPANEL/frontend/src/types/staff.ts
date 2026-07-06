/**
 * @archivo: staff.ts
 * @modulo: Staff (Claustro)
 * @funcion: Tipos TypeScript para el modulo de Claustro
 */

// Enums
export type StaffTaskStatus = 'pending' | 'in_progress' | 'completed';
export type StaffTaskPriority = 'low' | 'medium' | 'high';
export type StaffMeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type MeetingLiveState = 'scheduled' | 'in_progress' | 'pending_close' | 'completed' | 'cancelled';
export type StaffTaskHistoryAction =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'unassigned'
  | 'accepted'
  | 'priority_changed'
  | 'due_date_changed'
  | 'comment_added'
  | 'attachment_added'
  | 'attachment_removed'
  | 'title_changed'
  | 'description_changed'
  | 'tags_changed'
  | 'meeting_linked'
  | 'meeting_unlinked';

// User reference (simplified)
export interface StaffUserRef {
  id: string;
  email: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
}

// Tag
export interface StaffTag {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

// Task Assignment
export interface StaffTaskAssignment {
  id: string;
  taskId: string;
  assignedToId: string;
  assignedTo: StaffUserRef;
  accepted: boolean;
  acceptedAt?: string;
  createdAt: string;
}

// Task Comment
export interface StaffTaskComment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  author: StaffUserRef;
  createdAt: string;
}

// Task Attachment
export interface StaffTaskAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  taskId: string;
  uploadedById: string;
  uploadedBy: StaffUserRef;
  createdAt: string;
}

// Task History
export interface StaffTaskHistory {
  id: string;
  action: StaffTaskHistoryAction;
  oldValue?: any;
  newValue?: any;
  taskId: string;
  changedById: string;
  changedBy: StaffUserRef;
  createdAt: string;
}

// Meeting Agenda
export interface StaffMeetingAgenda {
  id: string;
  title: string;
  description?: string;
  orderIndex: number;
  durationMinutes?: number;
  isCompleted: boolean;
  notes?: string;
  meetingId: string;
  createdAt: string;
  updatedAt: string;
}

// Meeting
export interface StaffMeeting {
  id: string;
  title: string;
  description?: string;
  scheduledDate: string;
  location?: string;
  status: StaffMeetingStatus;
  notes?: string;
  createdById: string;
  createdBy: StaffUserRef;
  attendees: StaffUserRef[];
  agendaItems: StaffMeetingAgenda[];
  tasks?: StaffTask[];
  createdAt: string;
  updatedAt: string;
  // Campos derivados (calculados en el backend, no persistidos)
  liveState?: MeetingLiveState;
  endsAt?: string;
  durationMinutes?: number;
}

// Task
export interface StaffTask {
  id: string;
  title: string;
  description?: string;
  status: StaffTaskStatus;
  priority?: StaffTaskPriority;
  dueDate?: string;
  createdById: string;
  createdBy: StaffUserRef;
  meetingId?: string;
  meeting?: StaffMeeting;
  assignments: StaffTaskAssignment[];
  tags: StaffTag[];
  comments: StaffTaskComment[];
  attachments: StaffTaskAttachment[];
  history: StaffTaskHistory[];
  completedAt?: string;
  completedById?: string;
  completedBy?: StaffUserRef;
  createdAt: string;
  updatedAt: string;
}

// DTOs
export interface CreateStaffTaskDto {
  title: string;
  description?: string;
  priority?: StaffTaskPriority;
  dueDate?: string;
  meetingId?: string;
  assignedToIds?: string[];
  tagIds?: string[];
}

export interface UpdateStaffTaskDto {
  title?: string;
  description?: string;
  status?: StaffTaskStatus;
  priority?: StaffTaskPriority;
  dueDate?: string;
  meetingId?: string;
  assignedToIds?: string[];
  tagIds?: string[];
}

export interface CreateStaffMeetingDto {
  title: string;
  description?: string;
  scheduledDate: string;
  location?: string;
  attendeeIds?: string[];
  agendaItems?: CreateAgendaItemDto[];
}

export interface CreateAgendaItemDto {
  title: string;
  description?: string;
  orderIndex?: number;
  durationMinutes?: number;
}

export interface UpdateStaffMeetingDto {
  title?: string;
  description?: string;
  scheduledDate?: string;
  location?: string;
  status?: StaffMeetingStatus;
  notes?: string;
  attendeeIds?: string[];
  agendaItems?: UpdateAgendaItemDto[];
}

export interface UpdateAgendaItemDto {
  id?: string;
  title?: string;
  description?: string;
  orderIndex?: number;
  durationMinutes?: number;
  isCompleted?: boolean;
  notes?: string;
}

export interface CreateStaffTagDto {
  name: string;
  color?: string;
}

export interface CreateStaffTaskCommentDto {
  content: string;
}

// Filters
export interface StaffTaskFilters {
  status?: StaffTaskStatus;
  priority?: StaffTaskPriority;
  createdById?: string;
  assignedToId?: string;
  meetingId?: string;
  tagId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
  overdue?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'status' | 'title';
  sortOrder?: 'ASC' | 'DESC';
}

export interface StaffMeetingFilters {
  status?: StaffMeetingStatus;
  archived?: 'active' | 'archived' | 'all';
  pendingClose?: boolean;
  createdById?: string;
  scheduledDateFrom?: string;
  scheduledDateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'scheduledDate' | 'createdAt' | 'title';
  sortOrder?: 'ASC' | 'DESC';
}

// Response types
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface StaffTaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

export interface StaffMeetingStats {
  total: number;
  upcoming: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  inProgress: number;
  pendingClose: number;
}

export interface StaffUserStats {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  accepted: number;
  completionRate: number;
}

export interface StaffDashboardStats {
  tasks: StaffTaskStats;
  meetings: StaffMeetingStats;
  upcomingMeetings: StaffMeeting[];
}

// ============================================
// SISTEMA DE ARCHIVO DE TAREAS COMPLETADAS
// ============================================

export interface StaffArchiveFilters {
  month?: number;
  year?: number;
  tagId?: string;
  completedById?: string;
  createdById?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface StaffArchiveStats {
  total: number;
  thisMonth: number;
  avgCompletionDays: number | null;
  byMonth: {
    year: number;
    month: number;
    count: number;
  }[];
  byCompleter: {
    id: string;
    name: string;
    count: number;
  }[];
}

export interface StaffTaskCounts {
  pendingAcceptance: number;
  inProgress: number;
  total: number;
  overdue: number;
}
