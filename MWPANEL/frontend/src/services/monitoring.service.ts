import apiClient from './apiClient';

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  dbConnections: number;
  cacheHitRate: number;
  activeUsers: number;
  activitiesToday: number;
  messagesSent: number;
}

export interface PerformanceData {
  timeline: Array<{
    time: string;
    responseTime: number;
    requestRate: number;
    errorRate: number;
  }>;
  slowestEndpoints: Array<{
    route: string;
    avgTime: number;
    p95: number;
  }>;
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  status: 'active' | 'resolved';
  actions?: string[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  service: string;
  message: string;
  metadata?: Record<string, any>;
  userId?: string;
  requestId?: string;
  ip?: string;
}

class MonitoringService {
  // Métricas del sistema
  async getSystemMetrics(timeRange: string): Promise<SystemMetrics> {
    const response = await apiClient.get(`/monitoring/metrics/system?timeRange=${timeRange}`);
    return response.data;
  }

  async getPerformanceData(timeRange: string): Promise<PerformanceData> {
    const response = await apiClient.get(`/monitoring/metrics/performance?timeRange=${timeRange}`);
    return response.data;
  }

  async getModuleMetrics(module: string): Promise<any> {
    const response = await apiClient.get(`/monitoring/metrics/${module}`);
    return response.data;
  }

  // Alertas
  async getActiveAlerts(): Promise<Alert[]> {
    const response = await apiClient.get('/monitoring/alerts/active');
    return response.data;
  }

  async getAlertRules(): Promise<any[]> {
    const response = await apiClient.get('/monitoring/alerts/rules');
    return response.data;
  }

  async getAlertHistory(filters: any): Promise<any[]> {
    const response = await apiClient.get('/monitoring/alerts/history', { params: filters });
    return response.data;
  }

  async createAlertRule(data: any): Promise<any> {
    const response = await apiClient.post('/monitoring/alerts/rules', data);
    return response.data;
  }

  async updateAlertRule(id: string, data: any): Promise<any> {
    const response = await apiClient.put(`/monitoring/alerts/rules/${id}`, data);
    return response.data;
  }

  async deleteAlertRule(id: string): Promise<void> {
    await apiClient.delete(`/monitoring/alerts/rules/${id}`);
  }

  async toggleAlertRule(id: string, enabled: boolean): Promise<any> {
    const response = await apiClient.patch(`/monitoring/alerts/rules/${id}/toggle`, { enabled });
    return response.data;
  }

  async resolveAlert(alertId: string): Promise<void> {
    await apiClient.post(`/monitoring/alerts/${alertId}/resolve`);
  }

  async executeAlertAction(alertId: string, action: string): Promise<void> {
    await apiClient.post(`/monitoring/alerts/${alertId}/actions`, { action });
  }

  async getAlertChannels(): Promise<any[]> {
    const response = await apiClient.get('/monitoring/alerts/channels');
    return response.data;
  }

  // Logs
  async getSystemLogs(filters: {
    service?: string;
    level?: string;
    search?: string;
    startDate?: Date | null;
    endDate?: Date | null;
  }): Promise<LogEntry[]> {
    const params: any = {};
    if (filters.service && filters.service !== 'all') params.service = filters.service;
    if (filters.level && filters.level !== 'all') params.level = filters.level;
    if (filters.search) params.search = filters.search;
    if (filters.startDate) params.startDate = filters.startDate.toISOString();
    if (filters.endDate) params.endDate = filters.endDate.toISOString();

    const response = await apiClient.get('/monitoring/logs', { params });
    return response.data;
  }

  async getAvailableServices(): Promise<string[]> {
    const response = await apiClient.get('/monitoring/logs/services');
    return response.data;
  }

  // Herramientas de diagnóstico
  async clearCache(): Promise<void> {
    await apiClient.post('/monitoring/diagnostics/clear-cache');
  }

  async restartService(service: string): Promise<void> {
    await apiClient.post(`/monitoring/diagnostics/restart/${service}`);
  }

  async runDiagnostics(): Promise<any> {
    const response = await apiClient.post('/monitoring/diagnostics/run');
    return response.data;
  }

  // Métricas personalizadas
  async getAvailableMetrics(): Promise<any[]> {
    const response = await apiClient.get('/monitoring/metrics/available');
    return response.data;
  }

  async getMetricsData(params: {
    category: string;
    timeRange: string;
  }): Promise<any> {
    const response = await apiClient.get('/monitoring/metrics/data', { params });
    return response.data;
  }

  async executeCustomQuery(query: string): Promise<any> {
    const response = await apiClient.post('/monitoring/metrics/query', { query });
    return response.data;
  }

  // WebSocket para logs en tiempo real
  connectToLogs(onMessage: (log: LogEntry) => void): () => void {
    // Aquí implementarías la conexión WebSocket
    // Por ahora retornamos una función de cleanup vacía
    return () => {};
  }
}

export const monitoringService = new MonitoringService();