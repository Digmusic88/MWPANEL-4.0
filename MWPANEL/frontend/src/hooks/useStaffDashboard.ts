/**
 * @archivo: useStaffDashboard.ts
 * @modulo: Staff (Claustro)
 * @funcion: Hook para dashboard y estadisticas del claustro
 */

import { useQuery } from '@tanstack/react-query';
import { staffDashboardApi } from '@/services/staffService';

const QUERY_KEY = 'staff-dashboard';

export function useStaffDashboardStats() {
  return useQuery({
    queryKey: [QUERY_KEY, 'stats'],
    queryFn: () => staffDashboardApi.getStats(),
    staleTime: 30000, // 30 seconds
  });
}

export function useMyStaffStats() {
  return useQuery({
    queryKey: [QUERY_KEY, 'my-stats'],
    queryFn: () => staffDashboardApi.getMyStats(),
    staleTime: 30000,
  });
}

export function useStaffProgress() {
  return useQuery({
    queryKey: [QUERY_KEY, 'progress'],
    queryFn: () => staffDashboardApi.getProgress(),
    staleTime: 30000,
  });
}

export function useStaffUserProgress() {
  return useQuery({
    queryKey: [QUERY_KEY, 'user-progress'],
    queryFn: async () => {
      const data = await staffDashboardApi.getProgress();
      return data.userStats || [];
    },
    staleTime: 30000,
  });
}

export function useStaffUsers() {
  return useQuery({
    queryKey: [QUERY_KEY, 'users'],
    queryFn: () => staffDashboardApi.getStaffUsers(),
    staleTime: 60000, // 1 minute - users don't change often
  });
}
