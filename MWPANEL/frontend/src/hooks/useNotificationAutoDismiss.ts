import { useCallback } from 'react';
import apiClient from '../services/apiClient';

/**
 * Hook para manejar el auto-dismiss de notificaciones cuando el profesor accede al contenido relevante
 * 
 * Este hook proporciona funciones para automaticamente marcar como leídas o eliminar notificaciones
 * cuando el profesor accede a las páginas o recursos correspondientes.
 */
export const useNotificationAutoDismiss = () => {
  
  /**
   * Dismiss notificaciones específicas por tipo y recurso
   */
  const dismissNotificationsByResource = useCallback(async (
    resourceType: string,
    resourceId?: string,
    notificationType?: string
  ) => {
    try {
      // Try to get notifications with safe error handling
      const params = new URLSearchParams();
      if (resourceId) params.append('resourceId', resourceId);
      if (resourceType) params.append('resourceType', resourceType);
      if (notificationType) params.append('type', notificationType);
      
      const response = await apiClient.get(`/communications/notifications?${params.toString()}`);
      const relatedNotifications = response.data || [];

      // Marcar como leídas todas las notificaciones relacionadas
      for (const notification of relatedNotifications) {
        if (notification.status === 'unread') {
          try {
            await apiClient.patch(`/communications/notifications/${notification.id}`, {
              status: 'read'
            });
          } catch (patchError) {
            console.warn(`Failed to mark notification ${notification.id} as read:`, patchError);
          }
        }
      }

      console.log(`Auto-dismissed ${relatedNotifications.length} notifications for ${resourceType}${resourceId ? ` ID: ${resourceId}` : ''}`);
    } catch (error) {
      console.warn('Error auto-dismissing notifications (non-critical):', error);
      // Don't throw error to prevent UI issues
    }
  }, []);

  /**
   * Dismiss notificaciones por tipo específico (para módulos completos)
   */
  const dismissNotificationsByType = useCallback(async (notificationTypes: string[]) => {
    try {
      for (const type of notificationTypes) {
        const response = await apiClient.get(`/communications/notifications?type=${type}&status=unread`);
        const unreadNotifications = response.data;

        for (const notification of unreadNotifications) {
          await apiClient.patch(`/communications/notifications/${notification.id}`, {
            status: 'read'
          });
        }
      }

      console.log(`Auto-dismissed notifications for types: ${notificationTypes.join(', ')}`);
    } catch (error) {
      console.error('Error auto-dismissing notifications by type:', error);
    }
  }, []);

  /**
   * Auto-dismiss específico para cuando el profesor accede a tareas
   */
  const dismissTaskNotifications = useCallback(async (taskId?: string) => {
    const types = ['task_submission', 'task_correction_ready'];
    if (taskId) {
      await dismissNotificationsByResource('task', taskId);
    } else {
      await dismissNotificationsByType(types);
    }
  }, [dismissNotificationsByResource, dismissNotificationsByType]);

  /**
   * Auto-dismiss específico para cuando el profesor accede a evaluaciones
   */
  const dismissEvaluationNotifications = useCallback(async (evaluationId?: string) => {
    const types = ['evaluation_pending', 'evaluation'];
    if (evaluationId) {
      await dismissNotificationsByResource('evaluation', evaluationId);
    } else {
      await dismissNotificationsByType(types);
    }
  }, [dismissNotificationsByResource, dismissNotificationsByType]);

  /**
   * Auto-dismiss específico para cuando el profesor accede a rúbricas
   */
  const dismissRubricNotifications = useCallback(async (rubricId?: string) => {
    const types = ['rubric_assessment_pending'];
    if (rubricId) {
      await dismissNotificationsByResource('rubric', rubricId);
    } else {
      await dismissNotificationsByType(types);
    }
  }, [dismissNotificationsByResource, dismissNotificationsByType]);

  /**
   * Auto-dismiss específico para cuando el profesor accede a actividades
   */
  const dismissActivityNotifications = useCallback(async (activityId?: string) => {
    const types = ['activity_assignment_pending', 'activity_overdue'];
    if (activityId) {
      await dismissNotificationsByResource('activity', activityId);
    } else {
      await dismissNotificationsByType(types);
    }
  }, [dismissNotificationsByResource, dismissNotificationsByType]);

  /**
   * Auto-dismiss específico para cuando el profesor accede a reuniones
   */
  const dismissMeetingNotifications = useCallback(async (meetingId?: string) => {
    const types = ['meeting_scheduled'];
    if (meetingId) {
      await dismissNotificationsByResource('meeting', meetingId);
    } else {
      await dismissNotificationsByType(types);
    }
  }, [dismissNotificationsByResource, dismissNotificationsByType]);

  /**
   * Auto-dismiss específico para cuando el profesor accede a recursos educativos
   */
  const dismissResourceNotifications = useCallback(async (resourceId?: string) => {
    const types = ['system'];
    if (resourceId) {
      await dismissNotificationsByResource('educational_resource', resourceId);
    } else {
      await dismissNotificationsByType(types);
    }
  }, [dismissNotificationsByResource, dismissNotificationsByType]);

  /**
   * Auto-dismiss específico para mensajes de familias
   */
  const dismissFamilyMessageNotifications = useCallback(async (messageId?: string) => {
    const types = ['family_message', 'message'];
    if (messageId) {
      await dismissNotificationsByResource('message', messageId);
    } else {
      await dismissNotificationsByType(types);
    }
  }, [dismissNotificationsByResource, dismissNotificationsByType]);

  /**
   * Auto-dismiss al acceder a cualquier módulo basado en la URL
   */
  const dismissNotificationsByModule = useCallback(async (modulePath: string) => {
    const moduleNotificationMap: Record<string, () => Promise<void>> = {
      '/teacher/tasks': () => dismissTaskNotifications(),
      '/teacher/tasks-dashboard': () => dismissTaskNotifications(),
      '/teacher/evaluations': () => dismissEvaluationNotifications(),
      '/teacher/rubrics': () => dismissRubricNotifications(),
      '/teacher/activities': () => dismissActivityNotifications(),
      '/teacher/coordination': () => dismissMeetingNotifications(),
      '/teacher/educational-resources': () => dismissResourceNotifications(),
      '/teacher/messages': () => dismissFamilyMessageNotifications(),
    };

    const dismissFunction = moduleNotificationMap[modulePath];
    if (dismissFunction) {
      await dismissFunction();
    }
  }, [
    dismissTaskNotifications,
    dismissEvaluationNotifications,
    dismissRubricNotifications,
    dismissActivityNotifications,
    dismissMeetingNotifications,
    dismissResourceNotifications,
    dismissFamilyMessageNotifications,
  ]);

  return {
    // Funciones específicas por tipo
    dismissTaskNotifications,
    dismissEvaluationNotifications,
    dismissRubricNotifications,
    dismissActivityNotifications,
    dismissMeetingNotifications,
    dismissResourceNotifications,
    dismissFamilyMessageNotifications,
    
    // Funciones generales
    dismissNotificationsByResource,
    dismissNotificationsByType,
    dismissNotificationsByModule,
  };
};