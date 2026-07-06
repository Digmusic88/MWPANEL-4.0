/**
 * @archivo: useStudentNotifications.ts
 * @módulo: Student Hooks (Notificaciones específicas para estudiantes)
 * @función: Hook para gestionar contadores de notificaciones por tipo para estudiantes
 * @crítico: SÍ - Sistema de badges en navegación
 * @dependencias: apiClient, useState, useEffect
 * @relacionado_con: NotificationCenter, DashboardLayout
 */

import { useState, useEffect } from 'react';
import apiClient from '@services/apiClient';

export interface StudentNotificationCounts {
  tasks: number;           // Nuevas tareas asignadas
  grades: number;          // Nuevas calificaciones
  activities: number;      // Nuevas actividades
  calendar: number;        // Nuevos eventos de calendario
  resources: number;       // Nuevos recursos asignados
  total: number;          // Total de notificaciones no leídas
}

export const useStudentNotifications = () => {
  const [counts, setCounts] = useState<StudentNotificationCounts>({
    tasks: 0,
    grades: 0,
    activities: 0,
    calendar: 0,
    resources: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotificationCounts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener el total de notificaciones no leídas
      const totalResponse = await apiClient.get('/communications/notifications/unread-count');
      const totalCount = typeof totalResponse.data === 'number' ? totalResponse.data : 0;

      // Obtener notificaciones por tipo
      const notificationsResponse = await apiClient.get('/communications/notifications', {
        params: {
          status: 'unread',
          limit: 100, // Obtener más para hacer el conteo por tipo
        },
      });

      const notifications = Array.isArray(notificationsResponse.data) ? notificationsResponse.data : [];

      // Contar por tipo específico
      const taskCount = notifications.filter((n: any) => 
        n.type === 'academic' && 
        (n.title?.toLowerCase().includes('tarea') || 
         n.content?.toLowerCase().includes('tarea') ||
         n.relatedResourceType === 'task')
      ).length;

      const gradeCount = notifications.filter((n: any) => 
        n.type === 'evaluation' || 
        n.title?.toLowerCase().includes('calificación') ||
        n.title?.toLowerCase().includes('nota') ||
        n.relatedResourceType === 'grade'
      ).length;

      const activityCount = notifications.filter((n: any) => 
        n.type === 'academic' && 
        (n.title?.toLowerCase().includes('actividad') ||
         n.relatedResourceType === 'activity')
      ).length;

      const calendarCount = notifications.filter((n: any) => 
        n.type === 'academic' && 
        (n.title?.toLowerCase().includes('evento') ||
         n.title?.toLowerCase().includes('calendario') ||
         n.relatedResourceType === 'calendar_event')
      ).length;

      const resourceCount = notifications.filter((n: any) => 
        n.type === 'academic' && 
        (n.title?.toLowerCase().includes('recurso') ||
         n.relatedResourceType === 'educational_resource')
      ).length;

      setCounts({
        tasks: taskCount,
        grades: gradeCount,
        activities: activityCount,
        calendar: calendarCount,
        resources: resourceCount,
        total: totalCount,
      });

    } catch (err: any) {
      console.error('Error fetching student notification counts:', err);
      setError(err.response?.data?.message || 'Error al cargar contadores de notificaciones');
      
      // Fallback a valores vacíos
      setCounts({
        tasks: 0,
        grades: 0,
        activities: 0,
        calendar: 0,
        resources: 0,
        total: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationCounts();

    // Polling cada 5 minutos para reducir carga API
    const interval = setInterval(fetchNotificationCounts, 300000);

    return () => clearInterval(interval);
  }, []);

  return {
    counts,
    loading,
    error,
    refetch: fetchNotificationCounts,
  };
};

export default useStudentNotifications;