/**
 * @archivo: useStaffTags.ts
 * @modulo: Staff (Claustro)
 * @funcion: Hook para gestion de etiquetas del claustro
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { staffTagsApi } from '@/services/staffService';
import type { CreateStaffTagDto } from '@/types/staff';

const QUERY_KEY = 'staff-tags';

export function useStaffTags() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => staffTagsApi.getAll(),
  });
}

export function useStaffTag(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => staffTagsApi.getById(id!),
    enabled: !!id,
  });
}

export function useCreateStaffTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStaffTagDto) => staffTagsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success('Etiqueta creada correctamente');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al crear la etiqueta');
    },
  });
}

export function useUpdateStaffTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateStaffTagDto> }) =>
      staffTagsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success('Etiqueta actualizada correctamente');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al actualizar la etiqueta');
    },
  });
}

export function useDeleteStaffTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => staffTagsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success('Etiqueta eliminada correctamente');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al eliminar la etiqueta');
    },
  });
}
