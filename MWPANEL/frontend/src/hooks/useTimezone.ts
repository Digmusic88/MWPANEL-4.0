import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import apiClient from '../services/apiClient';
import {
  getTimezoneConfig,
  invalidateTimezoneCache,
  reloadTimezoneConfig,
  formatDateToMadrid,
  formatDateOnlyToMadrid,
  formatTimeOnlyToMadrid,
  formatRelativeTime
} from '../utils/dateUtils';

interface TimezoneConfig {
  timezone: string;
  displayFormat: string;
  autoDST: boolean;
}

export const useTimezone = () => {
  const [config, setConfig] = useState<TimezoneConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar configuración inicial
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const timezoneConfig = await getTimezoneConfig();
      setConfig(timezoneConfig);
    } catch (err: any) {
      const errorMessage = 'Error al cargar configuración de timezone';
      console.error(errorMessage, err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Actualizar configuración
  const updateConfig = useCallback(async (newConfig: Partial<TimezoneConfig>) => {
    try {
      setLoading(true);
      setError(null);

      // Guardar en backend
      const response = await apiClient.post('/settings/timezone/config', newConfig);

      // Invalidar caches
      await apiClient.post('/settings/timezone/invalidate-cache').catch(console.warn);
      invalidateTimezoneCache();

      // Recargar configuración
      const updatedConfig = await reloadTimezoneConfig();
      setConfig(updatedConfig);

      message.success('Configuración de timezone actualizada correctamente');
      message.info('Se recomienda recargar la página para ver todos los cambios aplicados', 5);

      return updatedConfig;
    } catch (err: any) {
      const errorMessage = 'Error al actualizar configuración de timezone';
      console.error(errorMessage, err);
      setError(errorMessage);
      message.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Recargar configuración forzada
  const reloadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const timezoneConfig = await reloadTimezoneConfig();
      setConfig(timezoneConfig);
      message.success('Configuración de timezone recargada');
    } catch (err: any) {
      const errorMessage = 'Error al recargar configuración de timezone';
      console.error(errorMessage, err);
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Formatters usando la configuración actual
  const formatDate = useCallback((date: Date | string) => {
    return formatDateToMadrid(date);
  }, [config]);

  const formatDateOnly = useCallback((date: Date | string) => {
    return formatDateOnlyToMadrid(date);
  }, [config]);

  const formatTimeOnly = useCallback((date: Date | string) => {
    return formatTimeOnlyToMadrid(date);
  }, [config]);

  const formatRelative = useCallback((date: Date | string) => {
    return formatRelativeTime(date);
  }, [config]);

  // Obtener información de timezone actual
  const getCurrentTime = useCallback(async () => {
    try {
      const response = await apiClient.get('/settings/timezone/current-time');
      return response.data.data;
    } catch (err) {
      console.warn('Error obteniendo hora actual:', err);
      return {
        currentTime: new Date().toISOString(),
        timezone: config?.timezone || 'Europe/Madrid',
        formatted: formatDate(new Date()),
      };
    }
  }, [config, formatDate]);

  // Cargar configuración al montar el hook
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    // Estado
    config,
    loading,
    error,

    // Acciones
    loadConfig,
    updateConfig,
    reloadConfig,
    getCurrentTime,

    // Formatters
    formatDate,
    formatDateOnly,
    formatTimeOnly,
    formatRelative,
  };
};