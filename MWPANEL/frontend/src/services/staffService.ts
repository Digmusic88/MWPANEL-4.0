/**
 * @archivo: staffService.ts
 * @modulo: Staff (Claustro)
 * @funcion: Servicio para comunicacion con API de Claustro
 */

import { apiClient } from './apiClient';
import type {
  StaffTask,
  StaffMeeting,
  StaffTag,
  StaffTaskComment,
  CreateStaffTaskDto,
  UpdateStaffTaskDto,
  CreateStaffMeetingDto,
  UpdateStaffMeetingDto,
  CreateStaffTagDto,
  CreateStaffTaskCommentDto,
  CreateAgendaItemDto,
  UpdateAgendaItemDto,
  StaffTaskFilters,
  StaffMeetingFilters,
  StaffArchiveFilters,
  PaginatedResponse,
  StaffTaskStats,
  StaffMeetingStats,
  StaffUserStats,
  StaffDashboardStats,
  StaffMeetingAgenda,
  StaffArchiveStats,
} from '@/types/staff';

const BASE_URL = '/staff';

// Tasks API
export const staffTasksApi = {
  getAll: (filters?: StaffTaskFilters): Promise<PaginatedResponse<StaffTask>> =>
    apiClient.get(`${BASE_URL}/tasks`, { params: filters }).then(r => r.data),

  getMyTasks: (filters?: StaffTaskFilters): Promise<PaginatedResponse<StaffTask>> =>
    apiClient.get(`${BASE_URL}/tasks/my-tasks`, { params: filters }).then(r => r.data),

  getMyCreated: (filters?: StaffTaskFilters): Promise<PaginatedResponse<StaffTask>> =>
    apiClient.get(`${BASE_URL}/tasks/my-created`, { params: filters }).then(r => r.data),

  getById: (id: string): Promise<StaffTask> =>
    apiClient.get(`${BASE_URL}/tasks/${id}`).then(r => r.data),

  create: (data: CreateStaffTaskDto): Promise<StaffTask> =>
    apiClient.post(`${BASE_URL}/tasks`, data).then(r => r.data),

  update: (id: string, data: UpdateStaffTaskDto): Promise<StaffTask> =>
    apiClient.patch(`${BASE_URL}/tasks/${id}`, data).then(r => r.data),

  updateStatus: (id: string, status: string): Promise<StaffTask> =>
    apiClient.patch(`${BASE_URL}/tasks/${id}/status`, { status }).then(r => r.data),

  acceptTask: (id: string): Promise<StaffTask> =>
    apiClient.patch(`${BASE_URL}/tasks/${id}/accept`).then(r => r.data),

  delete: (id: string): Promise<void> =>
    apiClient.delete(`${BASE_URL}/tasks/${id}`).then(r => r.data),

  addComment: (taskId: string, data: CreateStaffTaskCommentDto): Promise<StaffTaskComment> =>
    apiClient.post(`${BASE_URL}/tasks/${taskId}/comments`, data).then(r => r.data),

  getStats: (): Promise<StaffTaskStats> =>
    apiClient.get(`${BASE_URL}/tasks/stats`).then(r => r.data),

  getStatsByUser: (): Promise<StaffUserStats[]> =>
    apiClient.get(`${BASE_URL}/tasks/stats/by-user`).then(r => r.data),

  getMyTaskCounts: (): Promise<{ pendingAcceptance: number; inProgress: number; total: number; overdue: number }> =>
    apiClient.get(`${BASE_URL}/tasks/my-counts`).then(r => r.data),

  // ============================================
  // SISTEMA DE ARCHIVO DE TAREAS COMPLETADAS
  // ============================================

  getArchived: (filters?: StaffArchiveFilters): Promise<PaginatedResponse<StaffTask>> =>
    apiClient.get(`${BASE_URL}/tasks/archived`, { params: filters }).then(r => r.data),

  getArchiveStats: (): Promise<StaffArchiveStats> =>
    apiClient.get(`${BASE_URL}/tasks/archived/stats`).then(r => r.data),

  reactivateTask: (id: string): Promise<StaffTask> =>
    apiClient.patch(`${BASE_URL}/tasks/${id}/reactivate`).then(r => r.data),
};

// Meetings API
export const staffMeetingsApi = {
  getAll: (filters?: StaffMeetingFilters): Promise<PaginatedResponse<StaffMeeting>> =>
    apiClient.get(`${BASE_URL}/meetings`, { params: filters }).then(r => r.data),

  getUpcoming: (limit?: number): Promise<StaffMeeting[]> =>
    apiClient.get(`${BASE_URL}/meetings/upcoming`, { params: { limit } }).then(r => r.data),

  getById: (id: string): Promise<StaffMeeting> =>
    apiClient.get(`${BASE_URL}/meetings/${id}`).then(r => r.data),

  getMeetingTasks: (id: string): Promise<StaffTask[]> =>
    apiClient.get(`${BASE_URL}/meetings/${id}/tasks`).then(r => r.data),

  create: (data: CreateStaffMeetingDto): Promise<StaffMeeting> =>
    apiClient.post(`${BASE_URL}/meetings`, data).then(r => r.data),

  update: (id: string, data: UpdateStaffMeetingDto): Promise<StaffMeeting> =>
    apiClient.patch(`${BASE_URL}/meetings/${id}`, data).then(r => r.data),

  updateNotes: (id: string, notes: string): Promise<StaffMeeting> =>
    apiClient.patch(`${BASE_URL}/meetings/${id}/notes`, { notes }).then(r => r.data),

  addAgendaItem: (meetingId: string, data: CreateAgendaItemDto): Promise<StaffMeetingAgenda> =>
    apiClient.post(`${BASE_URL}/meetings/${meetingId}/agenda`, data).then(r => r.data),

  updateAgendaItem: (meetingId: string, agendaId: string, data: UpdateAgendaItemDto): Promise<StaffMeetingAgenda> =>
    apiClient.patch(`${BASE_URL}/meetings/${meetingId}/agenda/${agendaId}`, data).then(r => r.data),

  deleteAgendaItem: (meetingId: string, agendaId: string): Promise<void> =>
    apiClient.delete(`${BASE_URL}/meetings/${meetingId}/agenda/${agendaId}`).then(r => r.data),

  reorderAgendaItems: (meetingId: string, orderedIds: string[]): Promise<StaffMeeting> =>
    apiClient.patch(`${BASE_URL}/meetings/${meetingId}/agenda/reorder`, { orderedIds }).then(r => r.data),

  delete: (id: string): Promise<void> =>
    apiClient.delete(`${BASE_URL}/meetings/${id}`).then(r => r.data),

  getStats: (): Promise<StaffMeetingStats> =>
    apiClient.get(`${BASE_URL}/meetings/stats`).then(r => r.data),
};

// Tags API
export const staffTagsApi = {
  getAll: (): Promise<StaffTag[]> =>
    apiClient.get(`${BASE_URL}/tags`).then(r => r.data),

  getById: (id: string): Promise<StaffTag> =>
    apiClient.get(`${BASE_URL}/tags/${id}`).then(r => r.data),

  create: (data: CreateStaffTagDto): Promise<StaffTag> =>
    apiClient.post(`${BASE_URL}/tags`, data).then(r => r.data),

  update: (id: string, data: Partial<CreateStaffTagDto>): Promise<StaffTag> =>
    apiClient.patch(`${BASE_URL}/tags/${id}`, data).then(r => r.data),

  delete: (id: string): Promise<void> =>
    apiClient.delete(`${BASE_URL}/tags/${id}`).then(r => r.data),
};

// Dashboard API
export const staffDashboardApi = {
  getStats: (): Promise<StaffDashboardStats> =>
    apiClient.get(`${BASE_URL}/dashboard/stats`).then(r => r.data),

  getMyStats: (): Promise<{ tasks: StaffTaskStats; upcomingMeetings: StaffMeeting[] }> =>
    apiClient.get(`${BASE_URL}/dashboard/my-stats`).then(r => r.data),

  getProgress: (): Promise<{ globalStats: StaffTaskStats; userStats: StaffUserStats[] }> =>
    apiClient.get(`${BASE_URL}/dashboard/progress`).then(r => r.data),

  getStaffUsers: (): Promise<{ id: string; email: string; role: string; profile?: { firstName?: string; lastName?: string } }[]> =>
    apiClient.get(`${BASE_URL}/dashboard/users`).then(r => r.data),
};

export const staffService = {
  tasks: staffTasksApi,
  meetings: staffMeetingsApi,
  tags: staffTagsApi,
  dashboard: staffDashboardApi,
};

export default staffService;
