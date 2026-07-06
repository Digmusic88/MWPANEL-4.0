import { Injectable } from '@nestjs/common';
import { SystemMonitorService } from './system-monitor.service';

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  value: number;
  threshold: number;
  metadata?: any;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: '>' | '<' | '>=' | '<=' | '==';
  threshold: number;
  duration: string;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  actions: string[];
  lastTriggered?: string;
}

@Injectable()
export class AlertMonitorService {
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private alertRules: Map<string, AlertRule> = new Map();

  constructor(
    private readonly systemMonitorService: SystemMonitorService,
  ) {
    // Inicializar reglas de alerta predefinidas
    this.initializeDefaultRules();
    // Iniciar monitoreo continuo
    this.startMonitoring();
  }

  private initializeDefaultRules() {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-cpu',
        name: 'Uso de CPU Alto',
        description: 'Alerta cuando el uso de CPU supera el umbral',
        metric: 'cpu',
        condition: '>',
        threshold: 80,
        duration: '5m',
        severity: 'warning',
        enabled: true,
        actions: ['log', 'email'],
      },
      {
        id: 'high-memory',
        name: 'Uso de Memoria Alto',
        description: 'Alerta cuando el uso de memoria es crítico',
        metric: 'memory',
        condition: '>',
        threshold: 85,
        duration: '10m',
        severity: 'critical',
        enabled: true,
        actions: ['log', 'email', 'restart'],
      },
      {
        id: 'low-disk',
        name: 'Espacio en Disco Bajo',
        description: 'Alerta cuando queda poco espacio en disco',
        metric: 'disk',
        condition: '>',
        threshold: 90,
        duration: '15m',
        severity: 'critical',
        enabled: true,
        actions: ['log', 'email'],
      },
      {
        id: 'high-db-connections',
        name: 'Conexiones DB Altas',
        description: 'Alerta cuando hay muchas conexiones a la base de datos',
        metric: 'dbConnections',
        condition: '>',
        threshold: 45,
        duration: '5m',
        severity: 'warning',
        enabled: true,
        actions: ['log'],
      },
      {
        id: 'low-cache-hit',
        name: 'Cache Hit Rate Bajo',
        description: 'Alerta cuando la tasa de aciertos del cache es baja',
        metric: 'cacheHitRate',
        condition: '<',
        threshold: 70,
        duration: '10m',
        severity: 'warning',
        enabled: true,
        actions: ['log'],
      },
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  private async startMonitoring() {
    // Monitorear cada 30 segundos
    setInterval(async () => {
      await this.checkAlerts();
    }, 30000);
  }

  private async checkAlerts() {
    try {
      const metrics = await this.systemMonitorService.getSystemMetrics();
      
      for (const [ruleId, rule] of this.alertRules.entries()) {
        if (!rule.enabled) continue;
        
        const currentValue = metrics[rule.metric];
        if (currentValue === undefined) continue;
        
        const shouldTrigger = this.evaluateCondition(currentValue, rule.condition, rule.threshold);
        
        if (shouldTrigger) {
          // Crear o actualizar alerta
          const alert: Alert = {
            id: `alert-${ruleId}-${Date.now()}`,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: `${rule.name}: ${currentValue} ${rule.condition} ${rule.threshold}`,
            timestamp: new Date().toISOString(),
            value: currentValue,
            threshold: rule.threshold,
            metadata: {
              metric: rule.metric,
              systemMetrics: metrics,
            },
          };
          
          // Solo agregar si no existe una alerta similar activa
          const existingAlert = Array.from(this.activeAlerts.values()).find(a => a.ruleId === ruleId);
          if (!existingAlert) {
            this.activeAlerts.set(alert.id, alert);
            this.alertHistory.push(alert);
            
            // Actualizar última vez que se disparó
            rule.lastTriggered = alert.timestamp;
            
            // Limitar historial a 1000 alertas
            if (this.alertHistory.length > 1000) {
              this.alertHistory = this.alertHistory.slice(-1000);
            }
          }
        } else {
          // Resolver alerta si la condición ya no se cumple
          const activeAlert = Array.from(this.activeAlerts.entries()).find(([_, a]) => a.ruleId === ruleId);
          if (activeAlert) {
            const [alertId, alert] = activeAlert;
            this.activeAlerts.delete(alertId);
            
            // Agregar al historial como resuelta
            const resolvedAlert = {
              ...alert,
              resolvedAt: new Date().toISOString(),
              resolvedBy: 'Sistema automático',
              resolution: 'Condición ya no se cumple',
            };
            
            // Actualizar en historial
            const historyIndex = this.alertHistory.findIndex(a => a.id === alertId);
            if (historyIndex !== -1) {
              this.alertHistory[historyIndex] = resolvedAlert;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  }

  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      default: return false;
    }
  }

  // Obtener alertas activas
  async getActiveAlerts(): Promise<Alert[]> {
    // Verificar alertas antes de devolver
    await this.checkAlerts();
    return Array.from(this.activeAlerts.values());
  }

  // Obtener historial de alertas
  async getAlertHistory(filters: any): Promise<any[]> {
    let history = [...this.alertHistory].reverse(); // Más recientes primero
    
    // Aplicar filtros
    if (filters.severity && filters.severity !== 'all') {
      history = history.filter(alert => alert.severity === filters.severity);
    }
    
    if (filters.resolved !== undefined) {
      if (filters.resolved) {
        history = history.filter(alert => 'resolvedAt' in alert);
      } else {
        history = history.filter(alert => !('resolvedAt' in alert));
      }
    }
    
    if (filters.ruleId) {
      history = history.filter(alert => alert.ruleId === filters.ruleId);
    }
    
    // Limitar resultados
    const limit = filters.limit || 100;
    return history.slice(0, limit);
  }

  // Obtener reglas de alerta
  async getAlertRules(): Promise<AlertRule[]> {
    return Array.from(this.alertRules.values());
  }

  // Crear nueva regla de alerta
  async createAlertRule(rule: Partial<AlertRule>): Promise<AlertRule> {
    const newRule: AlertRule = {
      id: `rule-${Date.now()}`,
      name: rule.name || 'Nueva Regla',
      description: rule.description || '',
      metric: rule.metric || 'cpu',
      condition: rule.condition || '>',
      threshold: rule.threshold || 80,
      duration: rule.duration || '5m',
      severity: rule.severity || 'warning',
      enabled: rule.enabled !== false,
      actions: rule.actions || ['log'],
      lastTriggered: undefined,
    };
    
    this.alertRules.set(newRule.id, newRule);
    return newRule;
  }

  // Actualizar regla de alerta
  async updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<AlertRule> {
    const rule = this.alertRules.get(id);
    if (!rule) {
      throw new Error('Regla no encontrada');
    }
    
    const updatedRule = {
      ...rule,
      ...updates,
      id, // Mantener el ID original
    };
    
    this.alertRules.set(id, updatedRule);
    return updatedRule;
  }

  // Eliminar regla de alerta
  async deleteAlertRule(id: string): Promise<void> {
    this.alertRules.delete(id);
    
    // También eliminar alertas activas de esta regla
    const alertsToRemove = Array.from(this.activeAlerts.entries())
      .filter(([_, alert]) => alert.ruleId === id)
      .map(([alertId]) => alertId);
    
    alertsToRemove.forEach(alertId => {
      this.activeAlerts.delete(alertId);
    });
  }

  // Resolver alerta manualmente
  async resolveAlert(id: string, resolution: { userId?: string; resolution?: string }): Promise<any> {
    const alert = this.activeAlerts.get(id);
    if (!alert) {
      // Buscar en historial
      const historicalAlert = this.alertHistory.find(a => a.id === id);
      if (historicalAlert && !('resolvedAt' in historicalAlert)) {
        return {
          ...historicalAlert,
          resolvedAt: new Date().toISOString(),
          resolvedBy: resolution.userId || 'admin',
          resolution: resolution.resolution || 'Resuelto manualmente',
        };
      }
      throw new Error('Alerta no encontrada');
    }
    
    // Eliminar de alertas activas
    this.activeAlerts.delete(id);
    
    // Actualizar en historial
    const resolvedAlert = {
      ...alert,
      resolvedAt: new Date().toISOString(),
      resolvedBy: resolution.userId || 'admin',
      resolution: resolution.resolution || 'Resuelto manualmente',
    };
    
    const historyIndex = this.alertHistory.findIndex(a => a.id === id);
    if (historyIndex !== -1) {
      this.alertHistory[historyIndex] = resolvedAlert;
    }
    
    return resolvedAlert;
  }

  // Obtener canales de notificación
  async getAlertChannels(): Promise<any[]> {
    // En producción, esto consultaría la configuración real
    return [
      {
        id: '1',
        name: 'Email Principal',
        type: 'email',
        enabled: true,
        config: {
          to: 'admin@mundoworld.school',
        },
      },
      {
        id: '2',
        name: 'Email Equipo Técnico',
        type: 'email',
        enabled: true,
        config: {
          to: 'tech@mundoworld.school',
        },
      },
      {
        id: '3',
        name: 'Log del Sistema',
        type: 'log',
        enabled: true,
        config: {
          level: 'error',
        },
      },
    ];
  }
}