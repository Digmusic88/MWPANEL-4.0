/**
 * @archivo: useStaffTasks.ts
 * @modulo: Staff (Claustro)
 * @funcion: Hook para gestion de tareas del claustro
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { staffTasksApi } from '@/services/staffService';
import type {
  StaffTask,
  CreateStaffTaskDto,
  UpdateStaffTaskDto,
  StaffTaskFilters,
  StaffArchiveFilters,
  CreateStaffTaskCommentDto,
} from '@/types/staff';

const QUERY_KEY = 'staff-tasks';

export function useStaffTasks(filters?: StaffTaskFilters) {
  return useQuery({
    queryKey: [QUERY_KEY, 'list', filters],
    queryFn: () => staffTasksApi.getAll(filters),
  });
}

export function useMyStaffTasks(filters?: StaffTaskFilters) {
  return useQuery({
    queryKey: [QUERY_KEY, 'my-tasks', filters],
    queryFn: () => staffTasksApi.getMyTasks(filters),
  });
}

export function useMyCreatedStaffTasks(filters?: StaffTaskFilters) {
  return useQuery({
    queryKey: [QUERY_KEY, 'my-created', filters],
    queryFn: () => staffTasksApi.getMyCreated(filters),
  });
}

export function useStaffTask(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => staffTasksApi.getById(id!),
    enabled: !!id,
  });
}

export function useStaffTaskStats() {
  return useQuery({
    queryKey: [QUERY_KEY, 'stats'],
    queryFn: () => staffTasksApi.getStats(),
  });
}

export function useStaffTaskStatsByUser() {
  return useQuery({
    queryKey: [QUERY_KEY, 'stats-by-user'],
    queryFn: () => staffTasksApi.getStatsByUser(),
  });
}

export function useCreateStaffTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStaffTaskDto) => staffTasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success('Tarea creada correctamente');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al crear la tarea');
    },
  });
}

export function useUpdateStaffTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStaffTaskDto }) =>
      staffTasksApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
      message.success('Tarea actualizada correctamente');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al actualizar la tarea');
    },
  });
}

export function useUpdateStaffTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      staffTasksApi.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
      message.success('Estado actualizado correctamente');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al actualizar el estado');
    },
  });
}

export function useAcceptStaffTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => staffTasksApi.acceptTask(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
      message.success('Tarea aceptada correctamente');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al aceptar la tarea');
    },
  });
}

export function useDeleteStaffTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => staffTasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success('Tarea eliminada correctamente');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al eliminar la tarea');
    },
  });
}

export function useAddStaffTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: CreateStaffTaskCommentDto }) =>
      staffTasksApi.addComment(taskId, data),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', taskId] });
      message.success('Comentario agregado');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al agregar comentario');
    },
  });
}

// ============================================
// SISTEMA DE ARCHIVO DE TAREAS COMPLETADAS
// ============================================

export function useArchivedStaffTasks(filters?: StaffArchiveFilters) {
  return useQuery({
    queryKey: [QUERY_KEY, 'archived', filters],
    queryFn: () => staffTasksApi.getArchived(filters),
  });
}

export function useArchiveStats() {
  return useQuery({
    queryKey: [QUERY_KEY, 'archive-stats'],
    queryFn: () => staffTasksApi.getArchiveStats(),
  });
}

export function useReactivateStaffTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => staffTasksApi.reactivateTask(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'archived'] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'archive-stats'] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
      message.success('Tarea reactivada correctamente');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al reactivar la tarea');
    },
  });
}
