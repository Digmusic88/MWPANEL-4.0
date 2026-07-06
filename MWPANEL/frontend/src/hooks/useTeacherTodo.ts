/**
 * @archivo: useTeacherTodo.ts
 * @módulo: Hooks (Hook TODO Profesor)
 * @función: Hook personalizado para gestión de tareas TODO del profesor
 * @características:
 *   - Estado centralizado del TODO
 *   - Actualizaciones en tiempo real
 *   - Cache optimizado
 *   - Acciones batch
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import apiClient from '@services/apiClient';
import { useAuth } from './useAuth';

// Interfaces
interface TeacherTodoItem {
  task_id: string;
  title: string;
  taskType: string;
  dueDate: string;
  courseId: string;
  courseName: string;
  subjectName: string;
  pendingSubmissions: number;
  toGradeSubmissions: number;
  gradedSubmissions: number;
  totalSubmissions: number;
  isOverdue: boolean;
  hoursUntilDue: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  alertBadge: 'red' | 'amber' | 'none';
}

interface TeacherTodoSummary {
  totalPending: number;
  urgentCount: number;
  overdueCount: number;
  items: TeacherTodoItem[];
}

interface TodoFilters {
  courseId?: string;
  taskType?: string;
  status?: string;
  priority?: string;
  showUrgentOnly?: boolean;
}

interface QuickStats {
  totalPending: number;
  urgentCount: number;
  overdueCount: number;
}

export const useTeacherTodo = () => {
  const { user } = useAuth();
  const [todoData, setTodoData] = useState<TeacherTodoSummary | null>(null);
  const [quickStats, setQuickStats] = useState<QuickStats>({
    totalPending: 0,
    urgentCount: 0,
    overdueCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);
  const [filters, setFilters] = useState<TodoFilters>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // WebSocket reference for real-time updates
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar datos completos del TODO
  const loadTodoData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== false) {
          params.append(key, value.toString());
        }
      });

      const response = await apiClient.get(`/teachers/todo?${params.toString()}`);
      setTodoData(response.data);
      
      // Actualizar quick stats también
      setQuickStats({
        totalPending: response.data.totalPending,
        urgentCount: response.data.urgentCount,
        overdueCount: response.data.overdueCount,
      });
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading TODO data:', error);
      message.error('Error al cargar las tareas pendientes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  // Cargar solo estadísticas rápidas (para header)
  const loadQuickStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/teachers/todo/quick-stats');
      setQuickStats(response.data);
    } catch (error) {
      console.error('Error loading quick stats:', error);
    }
  }, []);

  // Cargar cursos para filtros
  const loadCourses = useCallback(async () => {
    try {
      const response = await apiClient.get('/teachers/todo/courses');
      setCourses(response.data);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  }, []);

  // Marcar tareas como revisadas
  const markTasksAsReviewed = useCallback(async (taskIds: string[]) => {
    try {
      if (taskIds.length === 0) {
        message.warning('Selecciona al menos una tarea');
        return false;
      }

      const response = await apiClient.patch('/teachers/todo/mark-reviewed', { taskIds });
      
      message.success(`${response.data.updated} tareas marcadas como revisadas`);
      
      // Recargar datos después de la acción
      await loadTodoData(false);
      
      return true;
    } catch (error) {
      console.error('Error marking tasks as reviewed:', error);
      message.error('Error al marcar las tareas como revisadas');
      return false;
    }
  }, [loadTodoData]);

  // Actualizar filtros
  const updateFilters = useCallback((newFilters: Partial<TodoFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  // Limpiar filtros
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Configurar actualizaciones automáticas
  useEffect(() => {
    if (user?.role === 'teacher') {
      // Cargar datos iniciales
      loadTodoData();
      loadCourses();

      // Configurar intervalos de actualización (reducidos para minimizar carga API)
      // Quick stats cada 5 minutos
      const quickStatsInterval = setInterval(loadQuickStats, 300000);
      
      // Datos completos cada 10 minutos
      const fullDataInterval = setInterval(() => {
        loadTodoData(false);
      }, 600000);

      return () => {
        clearInterval(quickStatsInterval);
        clearInterval(fullDataInterval);
      };
    }
  }, [user, loadTodoData, loadQuickStats, loadCourses]);

  // Recargar cuando cambian los filtros
  useEffect(() => {
    if (user?.role === 'teacher' && Object.keys(filters).length > 0) {
      loadTodoData(false);
    }
  }, [filters, loadTodoData, user]);

  // Configurar WebSocket para actualizaciones en tiempo real (opcional)
  useEffect(() => {
    // TODO: Implementar WebSocket gateway en backend para teacher-todo
    // Por ahora deshabilitado ya que no hay gateway backend implementado
    // El sistema funciona correctamente con polling cada 30s/2min
    
    // if (user?.role === 'teacher' && process.env.NODE_ENV === 'production') {
    //   // Solo en producción para evitar problemas de desarrollo
    //   const wsUrl = `${import.meta.env.VITE_WS_URL}/teacher-todo/${user.id}`;
    //   
    //   try {
    //     const ws = new WebSocket(wsUrl);
    //     wsRef.current = ws;

    //     ws.onmessage = (event) => {
    //       const data = JSON.parse(event.data);
    //       
    //       if (data.type === 'TODO_UPDATE') {
    //         // Actualizar datos cuando hay cambios
    //         loadTodoData(false);
    //         message.info('Tareas actualizadas en tiempo real');
    //       }
    //     };

    //     ws.onerror = (error) => {
    //       console.warn('WebSocket error (non-critical):', error);
    //     };

    //     return () => {
    //       if (wsRef.current) {
    //         wsRef.current.close();
    //       }
    //     };
    //   } catch (error) {
    //     console.warn('WebSocket not available (non-critical):', error);
    //   }
    // }
  }, [user, loadTodoData]);

  // Funciones de utilidad
  const getUrgentTasks = useCallback(() => {
    return todoData?.items.filter(item => item.priority === 'urgent') || [];
  }, [todoData]);

  const getOverdueTasks = useCallback(() => {
    return todoData?.items.filter(item => item.isOverdue) || [];
  }, [todoData]);

  const getTotalPendingSubmissions = useCallback(() => {
    return todoData?.items.reduce((sum, item) => 
      sum + item.pendingSubmissions + item.toGradeSubmissions, 0
    ) || 0;
  }, [todoData]);

  const hasUrgentItems = quickStats.urgentCount > 0;
  const hasOverdueItems = quickStats.overdueCount > 0;
  const hasPendingItems = quickStats.totalPending > 0;

  return {
    // Estado
    todoData,
    quickStats,
    loading,
    refreshing,
    courses,
    filters,
    lastUpdate,
    
    // Acciones
    loadTodoData,
    loadQuickStats,
    markTasksAsReviewed,
    updateFilters,
    clearFilters,
    
    // Utilidades
    getUrgentTasks,
    getOverdueTasks,
    getTotalPendingSubmissions,
    
    // Flags
    hasUrgentItems,
    hasOverdueItems,
    hasPendingItems,
  };
};

export default useTeacherTodo;