/**
 * @archivo: useStaffTaskCounts.ts
 * @modulo: Staff (Claustro)
 * @funcion: Hook para obtener contadores de tareas del usuario actual
 *           Usado para badges en menu lateral y notificaciones
 */

import { useQuery } from '@tanstack/react-query';
import { staffTasksApi } from '@/services/staffService';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types/user';

const QUERY_KEY = 'staff-task-counts';

export interface StaffTaskCounts {
  pendingAcceptance: number;  // Tareas asignadas sin aceptar
  inProgress: number;         // Tareas aceptadas pendientes
  total: number;              // Total de tareas activas
  overdue: number;            // Tareas vencidas
}

export function useStaffTaskCounts() {
  const { user } = useAuthStore();

  // Solo ejecutar para admin y teacher
  const isStaffMember = user?.role === UserRole.ADMIN || user?.role === UserRole.TEACHER;

  const query = useQuery<StaffTaskCounts>({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: () => staffTasksApi.getMyTaskCounts(),
    enabled: isStaffMember && !!user?.id,
    staleTime: 30000, // 30 segundos
    refetchInterval: 60000, // Refrescar cada minuto
    refetchOnWindowFocus: true,
  });

  // Retornar valores seguros (0 si no hay datos)
  const counts: StaffTaskCounts = query.data || {
    pendingAcceptance: 0,
    inProgress: 0,
    total: 0,
    overdue: 0,
  };

  return {
    ...query,
    counts,
    // Helpers para badges
    hasPendingTasks: counts.total > 0,
    hasUrgentTasks: counts.pendingAcceptance > 0 || counts.overdue > 0,
    badgeCount: counts.total,
    urgentBadgeCount: counts.pendingAcceptance + counts.overdue,
  };
}

export default useStaffTaskCounts;
