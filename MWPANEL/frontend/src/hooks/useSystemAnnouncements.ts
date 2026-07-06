import { useQuery } from '@tanstack/react-query';
import api from '../services/apiClient';

export interface SystemAnnouncement {
  id: string;
  title?: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  targetRoles: string[];
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Hook para obtener los anuncios activos del sistema para el usuario actual
 */
export const useSystemAnnouncements = () => {
  return useQuery<SystemAnnouncement[]>({
    queryKey: ['system-announcements', 'active'],
    queryFn: async () => {
      const response = await api.get('/system-announcements/active');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchInterval: 1000 * 60 * 5, // Refetch cada 5 minutos
  });
};

/**
 * Hook para administradores - obtener todos los anuncios
 */
export const useAllSystemAnnouncements = () => {
  return useQuery<SystemAnnouncement[]>({
    queryKey: ['system-announcements', 'admin'],
    queryFn: async () => {
      const response = await api.get('/system-announcements/admin');
      return response.data;
    },
  });
};
