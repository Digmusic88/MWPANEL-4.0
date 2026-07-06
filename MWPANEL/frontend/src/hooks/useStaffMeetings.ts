/**
 * @archivo: useStaffMeetings.ts
 * @modulo: Staff (Claustro)
 * @funcion: Hook para gestion de reuniones del claustro
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { staffMeetingsApi } from '@/services/staffService';
import type {
  StaffMeeting,
  CreateStaffMeetingDto,
  UpdateStaffMeetingDto,
  StaffMeetingFilters,
  CreateAgendaItemDto,
  UpdateAgendaItemDto,
} from '@/types/staff';

const QUERY_KEY = 'staff-meetings';

export function useStaffMeetings(filters?: StaffMeetingFilters) {
  return useQuery({
    queryKey: [QUERY_KEY, 'list', filters],
    queryFn: () => staffMeetingsApi.getAll(filters),
  });
}

export function useUpcomingStaffMeetings(limit?: number) {
  return useQuery({
    queryKey: [QUERY_KEY, 'upcoming', limit],
    queryFn: () => staffMeetingsApi.getUpcoming(limit),
  });
}

export function useStaffMeeting(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => staffMeetingsApi.getById(id!),
    enabled: !!id,
  });
}

export function useMeetingTasks(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'tasks', id],
    queryFn: () => staffMeetingsApi.getMeetingTasks(id!),
    enabled: !!id,
  });
}

export function useStaffMeetingStats() {
  return useQuery({
    queryKey: [QUERY_KEY, 'stats'],
    queryFn: () => staffMeetingsApi.getStats(),
  });
}

export function useCreateStaffMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStaffMeetingDto) => staffMeetingsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success('Reunion creada correctamente');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al crear la reunion');
    },
  });
}

export function useUpdateStaffMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStaffMeetingDto }) =>
      staffMeetingsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
      message.success('Reunion actualizada correctamente');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al actualizar la reunion');
    },
  });
}

export function useUpdateStaffMeetingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      staffMeetingsApi.update(id, { status } as UpdateStaffMeetingDto),
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

export function useUpdateMeetingNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      staffMeetingsApi.updateNotes(id, notes),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
      message.success('Actas actualizadas');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al actualizar las actas');
    },
  });
}

export function useAddAgendaItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ meetingId, data }: { meetingId: string; data: CreateAgendaItemDto }) =>
      staffMeetingsApi.addAgendaItem(meetingId, data),
    onSuccess: (_, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', meetingId] });
      message.success('Punto del dia agregado');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al agregar punto del dia');
    },
  });
}

export function useUpdateAgendaItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      meetingId,
      agendaId,
      data,
    }: {
      meetingId: string;
      agendaId: string;
      data: UpdateAgendaItemDto;
    }) => staffMeetingsApi.updateAgendaItem(meetingId, agendaId, data),
    onSuccess: (_, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', meetingId] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al actualizar punto del dia');
    },
  });
}

export function useReorderAgendaItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ meetingId, orderedIds }: { meetingId: string; orderedIds: string[] }) =>
      staffMeetingsApi.reorderAgendaItems(meetingId, orderedIds),
    onSuccess: (_, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', meetingId] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al reordenar los puntos del día');
    },
  });
}

export function useDeleteAgendaItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      meetingId,
      agendaId,
    }: {
      meetingId: string;
      agendaId: string;
    }) => staffMeetingsApi.deleteAgendaItem(meetingId, agendaId),
    onSuccess: (_, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', meetingId] });
      message.success('Punto del dia eliminado');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al eliminar punto del dia');
    },
  });
}

export function useDeleteStaffMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => staffMeetingsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success('Reunion eliminada correctamente');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al eliminar la reunion');
    },
  });
}

// Alias for backwards compatibility
export const useUpdateStaffMeetingNotes = useUpdateMeetingNotes;
