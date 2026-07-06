
import { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { UserRole } from '../types/user';

export const useUnreadNotifications = (user) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    let apiEndpoint = '';
    switch (user.role) {
      case UserRole.TEACHER:
        apiEndpoint = '/teacher-notifications';
        break;
      case UserRole.STUDENT:
        apiEndpoint = '/students/notifications';
        break;
      case UserRole.FAMILY:
        apiEndpoint = '/families/alerts';
        break;
      default:
        return;
    }

    const fetchCount = async () => {
      try {
        const response = await apiClient.get(apiEndpoint);
        const data = response.data;
        let unread = 0;
        if (user.role === UserRole.TEACHER || user.role === UserRole.STUDENT) {
          unread = data.unviewedNotifications || 0;
        } else {
          unread = data.unviewedAlerts || 0;
        }

        // Para familias, también incluir tareas pendientes (vencidas + devueltas) en el conteo
        if (user.role === UserRole.FAMILY) {
          try {
            const taskBadgesResponse = await apiClient.get('/tasks/family/badges');
            const taskData = taskBadgesResponse.data;
            unread += typeof taskData.totalCount === 'number' ? taskData.totalCount : 0;
          } catch {
            // Silently fail - task badges are optional
          }
        }

        setCount(unread);
      } catch (error) {
        console.error(`Error fetching unread notifications for role ${user.role}:`, error);
        // Silently fail, badge just won't show a number.
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60000); // Poll every minute

    return () => clearInterval(interval);
  }, [user]);

  return { unreadCount: count };
};
