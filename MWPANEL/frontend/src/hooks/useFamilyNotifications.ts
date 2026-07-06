import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import apiClient from '../services/apiClient';
import { useAuthStore } from '../store/authStore';

export interface FamilyAlert {
  id: string;
  alertType: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  isViewed: boolean;
  createdAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
  };
  metadata?: any;
}

export interface AlertSummary {
  totalAlerts: number;
  unviewedAlerts: number;
  criticalAlerts: number;
  alertsByType: Record<string, number>;
  alerts: FamilyAlert[];
}

interface UseFamilyNotificationsOptions {
  pollingInterval?: number; // in milliseconds, default 2 minutes
  autoRefresh?: boolean; // default true
  showSuccessMessages?: boolean; // default false
  showErrorMessages?: boolean; // default true
}

export const useFamilyNotifications = (options: UseFamilyNotificationsOptions = {}) => {
  const {
    pollingInterval = 120000, // 2 minutes
    autoRefresh = true,
    showSuccessMessages = false,
    showErrorMessages = true,
  } = options;

  const { user } = useAuthStore();
  const [alerts, setAlerts] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Check if user is family role
  const isFamily = user?.role === 'family';

  // Fetch alerts from API
  const fetchAlerts = useCallback(async (showLoading = false) => {
    if (!isFamily) {
      return null;
    }

    try {
      if (showLoading) setLoading(true);
      setError(null);

      const response = await apiClient.get('/families/alerts');
      
      if (isMountedRef.current) {
        setAlerts(response.data);
      }
      
      return response.data as AlertSummary;
    } catch (error: any) {
      console.error('Error fetching family alerts:', error);
      
      if (isMountedRef.current) {
        const errorMessage = error.response?.data?.message || 'Error al cargar las notificaciones familiares';
        setError(errorMessage);
        
        // Only show error message if it's not an authentication error and user wants error messages
        if (showErrorMessages && error.response?.status !== 401) {
          message.error(errorMessage);
        }
      }
      
      return null;
    } finally {
      if (isMountedRef.current && showLoading) {
        setLoading(false);
      }
    }
  }, [isFamily, showErrorMessages]);

  // Mark alert as viewed
  const markAsViewed = useCallback(async (alertId: string) => {
    if (!isFamily) return;

    try {
      await apiClient.post(`/families/alerts/${alertId}/view`);
      
      // Update local state immediately for better UX
      setAlerts(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          unviewedAlerts: Math.max(0, prev.unviewedAlerts - 1),
          alerts: prev.alerts.map(alert => 
            alert.id === alertId 
              ? { ...alert, isViewed: true }
              : alert
          ),
        };
      });

      // Refresh alerts to get accurate count
      setTimeout(() => fetchAlerts(false), 100);
      
      if (showSuccessMessages) {
        message.success('Notificación marcada como vista');
      }
    } catch (error: any) {
      console.error('Error marking alert as viewed:', error);
      if (showErrorMessages) {
        message.error('Error al marcar la notificación como vista');
      }
    }
  }, [isFamily, fetchAlerts, showSuccessMessages, showErrorMessages]);

  // Mark all alerts as viewed
  const markAllAsViewed = useCallback(async () => {
    if (!isFamily) return;

    try {
      await apiClient.post('/families/alerts/view-all');
      
      // Update local state immediately for better UX
      setAlerts(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          unviewedAlerts: 0,
          alerts: prev.alerts.map(alert => ({ ...alert, isViewed: true })),
        };
      });

      // Refresh alerts to get accurate data
      setTimeout(() => fetchAlerts(false), 100);
      
      if (showSuccessMessages) {
        message.success('Todas las notificaciones marcadas como vistas');
      }
    } catch (error: any) {
      console.error('Error marking all alerts as viewed:', error);
      if (showErrorMessages) {
        message.error('Error al marcar todas las notificaciones');
      }
    }
  }, [isFamily, fetchAlerts, showSuccessMessages, showErrorMessages]);

  // Refresh alerts manually
  const refreshAlerts = useCallback(async () => {
    return await fetchAlerts(true);
  }, [fetchAlerts]);

  // Force refresh alerts (useful for triggering new alert detection)
  const forceRefresh = useCallback(async () => {
    if (!isFamily) return;

    try {
      // First trigger backend alert generation
      await apiClient.post('/families/alerts/refresh');
      
      // Then fetch updated alerts
      return await fetchAlerts(false);
    } catch (error: any) {
      console.error('Error forcing alert refresh:', error);
      if (showErrorMessages) {
        message.error('Error al actualizar las notificaciones');
      }
    }
  }, [isFamily, fetchAlerts, showErrorMessages]);

  // Set up polling
  useEffect(() => {
    if (!isFamily || !autoRefresh) {
      return;
    }

    // Initial fetch
    fetchAlerts(true);

    // Set up polling interval
    pollingRef.current = setInterval(() => {
      fetchAlerts(false);
    }, pollingInterval);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isFamily, autoRefresh, pollingInterval, fetchAlerts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Stop polling when component unmounts or user changes
  useEffect(() => {
    if (!isFamily && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [isFamily]);

  return {
    // Data
    alerts,
    loading,
    error,
    
    // Computed values
    totalAlerts: alerts?.totalAlerts || 0,
    unviewedAlerts: alerts?.unviewedAlerts || 0,
    criticalAlerts: alerts?.criticalAlerts || 0,
    hasUnviewedAlerts: (alerts?.unviewedAlerts || 0) > 0,
    hasCriticalAlerts: (alerts?.criticalAlerts || 0) > 0,
    
    // Actions
    fetchAlerts: () => fetchAlerts(true),
    refreshAlerts,
    forceRefresh,
    markAsViewed,
    markAllAsViewed,
    
    // State
    isFamily,
  };
};