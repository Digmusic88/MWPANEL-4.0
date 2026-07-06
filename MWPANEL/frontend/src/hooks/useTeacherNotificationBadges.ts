import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';
import { useAuthStore } from '@store/authStore';
import { UserRole } from '@/types/user';

export interface TeacherBadge {
  moduleType: string;
  count: number;
  lastUpdated: string;
  relatedResourceIds: string[];
  metadata: Record<string, any>;
}

export interface TeacherBadgeCount {
  [moduleType: string]: number;
}

/**
 * Hook personalizado para gestionar badges de notificación específicos para profesores
 * 
 * Módulos soportados:
 * - tasks: Entregas de tareas pendientes de revisar
 * - evaluations: Evaluaciones pendientes de completar
 * - rubrics: Rúbricas pendientes de evaluación
 * - activities: Actividades asignadas sin confirmar
 * - meetings: Reuniones programadas
 * - resources: Recursos compartidos pendientes
 * 
 * @returns {object} Estado y funciones para manejar badges de profesor
 */
export const useTeacherNotificationBadges = () => {
  const [badges, setBadges] = useState<TeacherBadgeCount>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const { isAuthenticated, user } = useAuthStore();

  /**
   * Calculate badges from existing working endpoints
   * Using real API endpoints that exist and are accessible to TEACHER role
   */
  const calculateBadgesFromModules = useCallback(async (): Promise<TeacherBadgeCount> => {
    const badgeResults: TeacherBadgeCount = {};

    try {
      // 1. Tasks - Use real pending grading endpoint
      try {
        const pendingResponse = await apiClient.get('/tasks/teacher/pending-grading');
        const pendingSubmissions = pendingResponse.data || [];
        badgeResults.tasks = Array.isArray(pendingSubmissions) ? pendingSubmissions.length : 0;
      } catch (error) {
        console.warn('Could not fetch pending grading tasks:', error);
        badgeResults.tasks = 0;
      }

      // 2. Messages - Use real unread messages endpoint
      try {
        const messagesResponse = await apiClient.get('/communications/messages/unread-count');
        badgeResults.messages = messagesResponse.data?.count || 0;
      } catch (error) {
        console.warn('Could not fetch unread messages:', error);
        badgeResults.messages = 0;
      }

      // 3. Notifications - Use real unread notifications endpoint
      try {
        const notificationsResponse = await apiClient.get('/communications/notifications/unread-count');
        badgeResults.notifications = notificationsResponse.data?.count || 0;
      } catch (error) {
        console.warn('Could not fetch unread notifications:', error);
        badgeResults.notifications = 0;
      }

      // 4. Activities - Use teacher summary endpoint
      try {
        const activitiesResponse = await apiClient.get('/activities/summary');
        const summary = activitiesResponse.data;
        // Extract pending assessments from the summary
        const pendingAssessments = summary?.pendingAssessments || summary?.activitiesToday || 0;
        badgeResults.activities = typeof pendingAssessments === 'number' ? pendingAssessments : 0;
      } catch (error) {
        console.warn('Could not fetch activities summary:', error);
        badgeResults.activities = 0;
      }

      // 5. Task Statistics - For additional task metrics
      try {
        const statsResponse = await apiClient.get('/tasks/teacher/statistics');
        const stats = statsResponse.data;
        // Add overdue tasks to task count if available
        const overdueTasks = stats?.overdueTasks || 0;
        if (overdueTasks > 0) {
          badgeResults.tasks = (badgeResults.tasks || 0) + overdueTasks;
        }
      } catch (error) {
        console.warn('Could not fetch task statistics:', error);
        // This is optional, so no need to set anything
      }

      // 6. Evaluations - Only show real pending evaluations from API
      try {
        // TODO: Implement real evaluations endpoint when available
        // For now, no fake badges - only show real data
        badgeResults.evaluations = 0;
      } catch {
        badgeResults.evaluations = 0;
      }

      // 7. Rubrics - Only show real pending rubrics from API  
      try {
        // TODO: Implement real rubrics endpoint when available
        // For now, no fake badges - only show real data
        badgeResults.rubrics = 0;
      } catch {
        badgeResults.rubrics = 0;
      }

      // 8. Meetings - Show pending meeting bookings count
      try {
        const meetingsResponse = await apiClient.get('/teacher/meetings/bookings/pending/count');
        badgeResults.meetings = meetingsResponse.data?.count || 0;
      } catch (error) {
        console.warn('Could not fetch pending meetings:', error);
        badgeResults.meetings = 0;
      }

      // 9. Resources - Basic calculation for now
      try {
        badgeResults.resources = 0; // Will implement when endpoint is identified
      } catch {
        badgeResults.resources = 0;
      }

    } catch (globalError) {
      console.error('Error calculating badges from modules:', globalError);
    }

    return badgeResults;
  }, []);

  /**
   * Fetch badges using existing working endpoints (no dedicated endpoint needed)
   */
  const fetchBadges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔔 TEACHER BADGES: Calculating from existing endpoints');

      // Calculate badges directly from working module endpoints
      const calculatedBadges = await calculateBadgesFromModules();
      setBadges(calculatedBadges);
      setLastFetch(new Date());

      console.log('✅ TEACHER BADGES: Successfully calculated', calculatedBadges);

    } catch (err: any) {
      console.error('❌ Error fetching teacher badges:', err);
      setError(err.message || 'Error al cargar badges');
      // Set empty badges on error to prevent UI issues
      setBadges({});
    } finally {
      setLoading(false);
    }
  }, [calculateBadgesFromModules]);

  /**
   * Clear badge for specific module (local state only)
   */
  const clearBadge = useCallback(async (moduleType: string, resourceId?: string) => {
    try {
      console.log(`🔔 CLEARING BADGE: ${moduleType}`, resourceId ? `for resource ${resourceId}` : 'all');

      // Update local state immediately
      setBadges(prev => ({
        ...prev,
        [moduleType]: 0,
      }));

      // Refresh badges after a short delay to get updated counts
      setTimeout(() => {
        fetchBadges();
      }, 1000);

    } catch (err: any) {
      console.error(`❌ Error clearing badge for ${moduleType}:`, err);
      setError(`Error al limpiar badge de ${moduleType}`);
    }
  }, [fetchBadges]);

  /**
   * Refresh all badges
   */
  const refreshBadges = useCallback(async () => {
    await fetchBadges();
  }, [fetchBadges]);

  /**
   * Get badge count for specific module
   */
  const getBadgeCount = useCallback((moduleType: string): number => {
    return badges[moduleType] || 0;
  }, [badges]);

  /**
   * Check if any badges have counts > 0
   */
  const hasAnyBadges = useCallback((): boolean => {
    return Object.values(badges).some(count => count > 0);
  }, [badges]);

  /**
   * Get total badge count across all modules
   */
  const getTotalBadgeCount = useCallback((): number => {
    return Object.values(badges).reduce((total, count) => total + count, 0);
  }, [badges]);

  // Auto-refresh badges every 30 seconds - only for authenticated teachers
  useEffect(() => {
    // Only fetch badges if user is authenticated and is a teacher
    if (!isAuthenticated || user?.role !== UserRole.TEACHER) {
      return;
    }

    fetchBadges();

    const interval = setInterval(() => {
      fetchBadges();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchBadges, isAuthenticated, user?.role]);

  return {
    badges,
    loading,
    error,
    lastFetch,
    
    // Actions
    fetchBadges,
    refreshBadges,
    clearBadge,
    
    // Computed values
    getBadgeCount,
    hasAnyBadges,
    getTotalBadgeCount,
    
    // Helper methods
    isStale: () => lastFetch ? (Date.now() - lastFetch.getTime()) > 60000 : true, // 1 minute
  };
};