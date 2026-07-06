import { apiClient } from './apiClient';

export interface NightlyRestartConfig {
  enabled: boolean;
  scheduleTime: string; // Formato: "HH:mm" (ej: "03:00")
  daysOfWeek: number[]; // 0-6 (0=Domingo, 1=Lunes, etc.)
  performBackup: boolean;
  validateServices: boolean;
  maxRestartAttempts: number;
  healthCheckTimeout: number;
  excludedDays: string[]; // Fechas específicas a excluir (YYYY-MM-DD)
}

export interface RestartResult {
  success: boolean;
  timestamp: string;
  preRestartChecks: {
    systemHealth: boolean;
    diskSpace: boolean;
    memoryUsage: boolean;
    backupCompleted?: boolean;
  };
  restartExecution: {
    shutdownSuccessful: boolean;
    startupSuccessful: boolean;
    servicesOnline: boolean;
  };
  postRestartValidation: {
    databaseConnected: boolean;
    redisConnected: boolean;
    apiResponding: boolean;
    frontendServing: boolean;
  };
  duration: number;
  logs: string[];
  errors: string[];
}

export interface SystemStatusResponse {
  isRestartInProgress: boolean;
  lastRestart: RestartResult | null;
  nextScheduledRestart: string | null;
  systemHealth: {
    healthy: boolean;
    issues: string[];
  };
  config: NightlyRestartConfig;
}

export interface RestartHistoryResponse {
  history: RestartResult[];
  summary: {
    totalRestarts: number;
    successfulRestarts: number;
    failedRestarts: number;
    averageDuration: number;
    lastSuccessful: string | null;
    lastFailed: string | null;
  };
}

export interface SystemChecksResponse {
  systemHealth: {
    healthy: boolean;
    issues: string[];
  };
  diskSpace: {
    available: number;
    total: number;
    percentage: number;
  };
  memoryUsage: {
    percentage: number;
    used: number;
    total: number;
  };
  services: {
    database: boolean;
    redis: boolean;
    api: boolean;
    frontend: boolean;
  };
  recommendations: string[];
}

class NightlyRestartService {
  async getRestartConfig(): Promise<NightlyRestartConfig> {
    const response = await apiClient.get('/settings/nightly-restart/config');
    return response.data;
  }

  async updateRestartConfig(config: Partial<NightlyRestartConfig>): Promise<{
    success: boolean;
    message: string;
    config: NightlyRestartConfig;
  }> {
    const response = await apiClient.put('/settings/nightly-restart/config', config);
    return response.data;
  }

  async getSystemStatus(): Promise<SystemStatusResponse> {
    const response = await apiClient.get('/settings/nightly-restart/status');
    return response.data;
  }

  async triggerManualRestart(reason?: string): Promise<RestartResult> {
    const response = await apiClient.post('/settings/nightly-restart/trigger', { reason });
    return response.data;
  }

  async getRestartHistory(limit: number = 10): Promise<RestartHistoryResponse> {
    const response = await apiClient.get(`/settings/nightly-restart/history?limit=${limit}`);
    return response.data;
  }

  async testSystemChecks(): Promise<SystemChecksResponse> {
    const response = await apiClient.get('/settings/nightly-restart/test-checks');
    return response.data;
  }

  async disableRestartForDate(date: string): Promise<{
    success: boolean;
    message: string;
    excludedDate: string;
  }> {
    const response = await apiClient.post('/settings/nightly-restart/disable-for-date', { date });
    return response.data;
  }

  // Helper methods for frontend usage

  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds} segundos`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 
        ? `${minutes} min ${remainingSeconds} seg`
        : `${minutes} minutos`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return minutes > 0 
        ? `${hours}h ${minutes}m`
        : `${hours} horas`;
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getDayName(dayIndex: number): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayIndex] || 'Desconocido';
  }

  getDaysOfWeekString(daysOfWeek: number[]): string {
    if (daysOfWeek.length === 7) return 'Todos los días';
    if (daysOfWeek.length === 0) return 'Nunca';
    
    const dayNames = daysOfWeek.map(day => this.getDayName(day));
    
    // Casos especiales comunes
    const weekdays = [1, 2, 3, 4, 5]; // Lunes a Viernes
    const weekends = [0, 6]; // Sábado y Domingo
    
    if (this.arraysEqual(daysOfWeek.sort(), weekdays)) {
      return 'Días laborables (L-V)';
    }
    
    if (this.arraysEqual(daysOfWeek.sort(), weekends)) {
      return 'Fines de semana';
    }
    
    return dayNames.join(', ');
  }

  private arraysEqual(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  getRestartStatusColor(result: RestartResult | null): string {
    if (!result) return '#d9d9d9';
    return result.success ? '#52c41a' : '#ff4d4f';
  }

  getRestartStatusText(result: RestartResult | null): string {
    if (!result) return 'Sin datos';
    return result.success ? 'Exitoso' : 'Fallido';
  }

  getSystemHealthColor(healthy: boolean): string {
    return healthy ? '#52c41a' : '#ff4d4f';
  }

  getSystemHealthText(healthy: boolean): string {
    return healthy ? 'Saludable' : 'Con problemas';
  }

  getDiskUsageColor(percentage: number): string {
    if (percentage > 90) return '#ff4d4f';
    if (percentage > 80) return '#fa8c16';
    if (percentage > 70) return '#faad14';
    return '#52c41a';
  }

  getMemoryUsageColor(percentage: number): string {
    if (percentage > 95) return '#ff4d4f';
    if (percentage > 85) return '#fa8c16';
    if (percentage > 75) return '#faad14';
    return '#52c41a';
  }

  getNextRestartText(nextScheduledRestart: string | null, config: NightlyRestartConfig): string {
    if (!config.enabled) return 'Deshabilitado';
    if (!nextScheduledRestart) return 'No programado';
    
    const nextDate = new Date(nextScheduledRestart);
    const now = new Date();
    const diffMs = nextDate.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffHours <= 0) return 'Próximo';
    if (diffHours <= 24) return `En ${diffHours} horas`;
    
    const diffDays = Math.ceil(diffHours / 24);
    return `En ${diffDays} días`;
  }

  analyzeRestartTrend(history: RestartResult[]): {
    trend: 'improving' | 'stable' | 'declining';
    successRate: number;
    averageDuration: number;
    lastWeekSuccess: number;
  } {
    if (history.length === 0) {
      return {
        trend: 'stable',
        successRate: 0,
        averageDuration: 0,
        lastWeekSuccess: 0
      };
    }

    const successRate = (history.filter(r => r.success).length / history.length) * 100;
    const averageDuration = history.reduce((sum, r) => sum + r.duration, 0) / history.length;
    
    // Analizar últimos 7 reinicios vs anteriores para determinar tendencia
    const lastWeek = history.slice(-7);
    const previousWeek = history.slice(-14, -7);
    
    const lastWeekSuccess = lastWeek.length > 0 
      ? (lastWeek.filter(r => r.success).length / lastWeek.length) * 100 
      : 0;
    
    const previousWeekSuccess = previousWeek.length > 0 
      ? (previousWeek.filter(r => r.success).length / previousWeek.length) * 100 
      : lastWeekSuccess;

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    
    if (lastWeekSuccess > previousWeekSuccess + 10) {
      trend = 'improving';
    } else if (lastWeekSuccess < previousWeekSuccess - 10) {
      trend = 'declining';
    }

    return {
      trend,
      successRate,
      averageDuration,
      lastWeekSuccess
    };
  }

  validateRestartConfig(config: Partial<NightlyRestartConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar formato de hora
    if (config.scheduleTime) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(config.scheduleTime)) {
        errors.push('Formato de hora inválido. Use HH:mm (ej: 03:00)');
      }
    }

    // Validar días de la semana
    if (config.daysOfWeek) {
      const validDays = config.daysOfWeek.every(day => day >= 0 && day <= 6);
      if (!validDays) {
        errors.push('Días de la semana inválidos. Use 0-6 (0=Domingo)');
      }
      if (config.daysOfWeek.length === 0) {
        errors.push('Debe seleccionar al menos un día de la semana');
      }
    }

    // Validar intentos máximos
    if (config.maxRestartAttempts !== undefined) {
      if (config.maxRestartAttempts < 1 || config.maxRestartAttempts > 10) {
        errors.push('Intentos máximos debe estar entre 1 y 10');
      }
    }

    // Validar timeout
    if (config.healthCheckTimeout !== undefined) {
      if (config.healthCheckTimeout < 5000 || config.healthCheckTimeout > 300000) {
        errors.push('Timeout debe estar entre 5 y 300 segundos');
      }
    }

    // Validar fechas excluidas
    if (config.excludedDays) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const validDates = config.excludedDays.every(date => dateRegex.test(date));
      if (!validDates) {
        errors.push('Formato de fechas excluidas inválido. Use YYYY-MM-DD');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  generateRecommendations(systemStatus: SystemStatusResponse): string[] {
    const recommendations: string[] = [];
    const { systemHealth, config } = systemStatus;

    // Recomendaciones de configuración
    if (!config.enabled) {
      recommendations.push('💡 Considerar habilitar reinicio nocturno para mantener el sistema optimizado');
    }

    if (!config.performBackup && config.enabled) {
      recommendations.push('🔄 Se recomienda habilitar backup automático antes del reinicio');
    }

    if (config.scheduleTime === '03:00' && config.enabled) {
      recommendations.push('✅ Horario óptimo seleccionado (3:00 AM)');
    }

    // Recomendaciones de salud del sistema
    if (!systemHealth.healthy) {
      recommendations.push('🔴 Resolver problemas de salud del sistema antes del próximo reinicio');
    }

    // Recomendaciones de historial
    if (systemStatus.lastRestart?.success === false) {
      recommendations.push('❌ Investigar causa del último reinicio fallido');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Configuración de reinicio nocturno optimizada');
    }

    return recommendations;
  }
}

export const nightlyRestartService = new NightlyRestartService();