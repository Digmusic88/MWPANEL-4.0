// Servicio de monitoreo con datos simulados realistas
// Este servicio proporciona datos mock mientras se resuelven los problemas del backend

export class MonitoringMockService {
  // Simular métricas del sistema con valores realistas
  async getSystemMetrics(timeRange: string) {
    // Simular variación basada en la hora del día
    const hour = new Date().getHours();
    const isBusinessHours = hour >= 8 && hour <= 18;
    
    return {
      cpu: Math.round(isBusinessHours ? 35 + Math.random() * 30 : 15 + Math.random() * 20),
      memory: Math.round(isBusinessHours ? 45 + Math.random() * 25 : 25 + Math.random() * 20),
      disk: Math.round(55 + Math.random() * 10), // El disco varía menos
      dbConnections: Math.round(isBusinessHours ? 15 + Math.random() * 20 : 5 + Math.random() * 10),
      cacheHitRate: Math.round(85 + Math.random() * 10),
      activeUsers: Math.round(isBusinessHours ? 25 + Math.random() * 50 : 5 + Math.random() * 10),
      activitiesToday: Math.round(isBusinessHours ? 100 + Math.random() * 200 : 20 + Math.random() * 30),
      messagesSent: Math.round(isBusinessHours ? 50 + Math.random() * 100 : 10 + Math.random() * 20),
    };
  }

  // Simular métricas de rendimiento con patrones realistas
  async getPerformanceMetrics(timeRange: string) {
    const now = new Date();
    const timeline = [];
    
    // Generar datos históricos
    const dataPoints = timeRange === '1h' ? 60 : timeRange === '24h' ? 24 : 7;
    const interval = timeRange === '1h' ? 60000 : timeRange === '24h' ? 3600000 : 86400000;
    
    for (let i = dataPoints - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - i * interval);
      const hour = time.getHours();
      const isBusinessHours = hour >= 8 && hour <= 18;
      
      timeline.push({
        time: time.toISOString(),
        responseTime: Math.round(isBusinessHours ? 80 + Math.random() * 40 : 50 + Math.random() * 30),
        requestRate: Math.round(isBusinessHours ? 20 + Math.random() * 40 : 5 + Math.random() * 10),
        errorRate: isBusinessHours ? Math.random() * 2 : Math.random() * 0.5,
      });
    }

    return {
      timeline,
      summary: {
        avgResponseTime: 85,
        p95ResponseTime: 150,
        p99ResponseTime: 200,
        totalRequests: Math.round(5000 + Math.random() * 2000),
        totalErrors: Math.round(20 + Math.random() * 30),
        errorRate: 0.8,
      },
    };
  }

  // Simular alertas activas
  async getActiveAlerts() {
    const alerts = [];
    
    // Probabilidad de tener alertas activas
    if (Math.random() > 0.7) {
      alerts.push({
        id: '1',
        ruleId: 'high-response-time',
        ruleName: 'Tiempo de respuesta alto',
        severity: 'warning',
        message: 'El tiempo de respuesta promedio ha superado los 100ms durante 5 minutos',
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        value: 125,
        threshold: 100,
      });
    }
    
    if (Math.random() > 0.9) {
      alerts.push({
        id: '2',
        ruleId: 'high-memory',
        ruleName: 'Uso de memoria alto',
        severity: 'critical',
        message: 'El uso de memoria supera el 85%',
        timestamp: new Date(Date.now() - Math.random() * 1800000).toISOString(),
        value: 87,
        threshold: 85,
      });
    }
    
    return alerts;
  }

  // Historial de alertas
  async getAlertHistory(filters: any) {
    const history = [
      {
        id: '1',
        ruleId: 'high-response-time',
        ruleName: 'Tiempo de respuesta alto',
        severity: 'warning',
        message: 'El tiempo de respuesta promedio superó los 100ms',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        resolvedAt: new Date(Date.now() - 82800000).toISOString(),
        resolvedBy: 'Sistema automático',
        resolution: 'Se resolvió automáticamente al optimizarse las consultas',
      },
      {
        id: '2',
        ruleId: 'high-memory',
        ruleName: 'Uso de memoria alto',
        severity: 'critical',
        message: 'El uso de memoria superó el 85%',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        resolvedAt: new Date(Date.now() - 169200000).toISOString(),
        resolvedBy: 'admin@mundoworld.school',
        resolution: 'Se reinició el servicio backend para liberar memoria',
      },
      {
        id: '3',
        ruleId: 'high-error-rate',
        ruleName: 'Alta tasa de errores',
        severity: 'warning',
        message: 'La tasa de errores superó el 2%',
        timestamp: new Date(Date.now() - 259200000).toISOString(),
        resolvedAt: new Date(Date.now() - 255600000).toISOString(),
        resolvedBy: 'Sistema automático',
        resolution: 'Error temporal de conexión con servicio externo resuelto',
      },
    ];
    
    // Filtrar por severidad si se especifica
    if (filters.severity && filters.severity !== 'all') {
      return history.filter(h => h.severity === filters.severity);
    }
    
    return history;
  }

  // Reglas de alertas configuradas
  async getAlertRules() {
    return [
      {
        id: '1',
        name: 'Tiempo de respuesta alto',
        description: 'Alerta cuando el tiempo de respuesta promedio supera el umbral',
        metric: 'response_time',
        condition: '>',
        threshold: 100,
        duration: '5m',
        severity: 'warning',
        enabled: true,
        actions: ['email', 'log'],
        lastTriggered: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: '2',
        name: 'Uso de memoria crítico',
        description: 'Alerta cuando el uso de memoria es muy alto',
        metric: 'memory_usage',
        condition: '>',
        threshold: 85,
        duration: '10m',
        severity: 'critical',
        enabled: true,
        actions: ['email', 'webhook', 'restart'],
        lastTriggered: new Date(Date.now() - 172800000).toISOString(),
      },
      {
        id: '3',
        name: 'Tasa de error alta',
        description: 'Alerta cuando hay muchos errores HTTP',
        metric: 'error_rate',
        condition: '>',
        threshold: 2,
        duration: '5m',
        severity: 'warning',
        enabled: true,
        actions: ['email', 'log'],
        lastTriggered: new Date(Date.now() - 259200000).toISOString(),
      },
      {
        id: '4',
        name: 'Conexiones DB agotadas',
        description: 'Alerta cuando quedan pocas conexiones disponibles',
        metric: 'db_connections',
        condition: '>',
        threshold: 45,
        duration: '3m',
        severity: 'critical',
        enabled: false,
        actions: ['email', 'restart'],
        lastTriggered: null,
      },
    ];
  }

  // Canales de notificación
  async getAlertChannels() {
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
        name: 'Webhook Slack',
        type: 'webhook',
        enabled: false,
        config: {
          url: 'https://hooks.slack.com/services/...',
        },
      },
      {
        id: '4',
        name: 'SMS Emergencias',
        type: 'sms',
        enabled: false,
        config: {
          phone: '+34600123456',
        },
      },
    ];
  }

  // Logs del sistema con eventos realistas
  async getSystemLogs(filters: any) {
    const logs = [];
    const services = ['backend', 'postgres', 'redis', 'nginx', 'frontend'];
    const now = Date.now();
    
    // Generar logs realistas basados en eventos típicos
    const logTemplates = [
      { level: 'info', message: 'Usuario {{userId}} autenticado correctamente', weight: 30 },
      { level: 'info', message: 'Sesión iniciada para usuario {{userId}}', weight: 25 },
      { level: 'info', message: 'Archivo subido exitosamente: {{filename}}', weight: 15 },
      { level: 'info', message: 'Evaluación guardada para estudiante {{studentId}}', weight: 20 },
      { level: 'info', message: 'Mensaje enviado de {{fromUser}} a {{toUser}}', weight: 15 },
      { level: 'info', message: 'Backup automático completado exitosamente', weight: 5 },
      { level: 'info', message: 'Cache actualizado para key: {{cacheKey}}', weight: 10 },
      { level: 'warn', message: 'Intento de acceso denegado para recurso: {{resource}}', weight: 8 },
      { level: 'warn', message: 'Límite de intentos de login alcanzado para: {{email}}', weight: 5 },
      { level: 'warn', message: 'Memoria cache cerca del límite ({{percent}}%)', weight: 3 },
      { level: 'error', message: 'Error de validación en formulario: {{form}}', weight: 10 },
      { level: 'error', message: 'Timeout en conexión a base de datos', weight: 2 },
      { level: 'error', message: 'Error al enviar email a: {{email}}', weight: 3 },
      { level: 'debug', message: 'Query ejecutada en {{time}}ms: {{query}}', weight: 50 },
      { level: 'debug', message: 'Cache hit para key: {{key}}', weight: 40 },
    ];

    // Generar 100 logs con distribución realista
    for (let i = 0; i < 100; i++) {
      const template = this.selectWeightedRandom(logTemplates);
      const timestamp = new Date(now - Math.random() * 86400000 * 2); // Últimas 48 horas
      
      // Reemplazar placeholders con valores realistas
      let message = template.message
        .replace('{{userId}}', `user-${Math.floor(Math.random() * 100)}`)
        .replace('{{studentId}}', `student-${Math.floor(Math.random() * 200)}`)
        .replace('{{filename}}', `documento-${Math.floor(Math.random() * 1000)}.pdf`)
        .replace('{{fromUser}}', `teacher-${Math.floor(Math.random() * 20)}`)
        .replace('{{toUser}}', `parent-${Math.floor(Math.random() * 100)}`)
        .replace('{{cacheKey}}', `user:profile:${Math.floor(Math.random() * 100)}`)
        .replace('{{resource}}', `/api/grades/${Math.floor(Math.random() * 100)}`)
        .replace('{{email}}', `user${Math.floor(Math.random() * 100)}@example.com`)
        .replace('{{percent}}', `${80 + Math.floor(Math.random() * 15)}`)
        .replace('{{form}}', ['ActivityForm', 'EvaluationForm', 'UserForm'][Math.floor(Math.random() * 3)])
        .replace('{{time}}', `${50 + Math.floor(Math.random() * 200)}`)
        .replace('{{query}}', `SELECT * FROM users WHERE id = ${Math.floor(Math.random() * 100)}`)
        .replace('{{key}}', `session:${Math.random().toString(36).substr(2, 9)}`);
      
      logs.push({
        id: `log-${i}`,
        timestamp: timestamp.toISOString(),
        level: template.level,
        service: services[Math.floor(Math.random() * services.length)],
        message: message,
        metadata: {
          userId: Math.random() > 0.5 ? `user-${Math.floor(Math.random() * 100)}` : undefined,
          requestId: `req-${Math.random().toString(36).substr(2, 9)}`,
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
          duration: template.level === 'debug' ? Math.floor(Math.random() * 500) : undefined,
        },
      });
    }

    // Ordenar por timestamp descendente
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Aplicar filtros
    let filteredLogs = logs;
    if (filters.service && filters.service !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.service === filters.service);
    }
    if (filters.level && filters.level !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }
    if (filters.search) {
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    return filteredLogs.slice(0, 50); // Limitar a 50 logs
  }

  // Helper para selección ponderada
  private selectWeightedRandom(items: any[]) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) {
        return item;
      }
    }
    
    return items[0];
  }

  // Servicios disponibles
  async getAvailableServices() {
    return ['backend', 'postgres', 'redis', 'nginx', 'frontend'];
  }

  // Diagnóstico del sistema
  async runDiagnostics(body: { tests: string[] }) {
    const results: any = {};
    const tests = body.tests || ['database', 'cache', 'api', 'storage'];

    for (const test of tests) {
      // Simular diferentes probabilidades de éxito según el test
      const successRate = {
        database: 0.95,
        cache: 0.98,
        api: 0.92,
        storage: 0.99,
      }[test] || 0.9;

      results[test] = {
        status: Math.random() < successRate ? 'passed' : 'failed',
        message: Math.random() < successRate 
          ? `Test ${test} completado exitosamente` 
          : `Error en ${test}: Timeout al conectar`,
        duration: Math.round(100 + Math.random() * 400),
        timestamp: new Date().toISOString(),
      };
    }

    return {
      summary: {
        total: tests.length,
        passed: Object.values(results).filter((r: any) => r.status === 'passed').length,
        failed: Object.values(results).filter((r: any) => r.status === 'failed').length,
      },
      results,
      executedAt: new Date().toISOString(),
    };
  }

  // Simular reinicio de servicio
  async restartService(serviceName: string) {
    // Simular demora de reinicio
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      service: serviceName,
      status: 'restarted',
      message: `Servicio ${serviceName} reiniciado correctamente`,
      timestamp: new Date().toISOString(),
    };
  }

  // Métricas personalizadas
  async getCustomMetric(metricName: string) {
    const hour = new Date().getHours();
    const isBusinessHours = hour >= 8 && hour <= 18;
    
    const metrics: any = {
      'active_sessions': Math.round(isBusinessHours ? 80 + Math.random() * 120 : 20 + Math.random() * 30),
      'queue_size': Math.round(Math.random() * 20),
      'cache_size': Math.round(200 + Math.random() * 300),
      'upload_queue': Math.round(Math.random() * 10),
      'pending_evaluations': Math.round(5 + Math.random() * 25),
      'active_tasks': Math.round(10 + Math.random() * 40),
    };

    return {
      metric: metricName,
      value: metrics[metricName] || 0,
      unit: 'count',
      timestamp: new Date().toISOString(),
    };
  }

  // Exportar métricas
  async exportMetrics(format: string = 'json') {
    const data = {
      exportedAt: new Date().toISOString(),
      metrics: {
        system: await this.getSystemMetrics('1h'),
        performance: await this.getPerformanceMetrics('1h'),
      },
    };

    return data;
  }

  // Métodos para gestión de alertas
  async createAlertRule(rule: any) {
    return {
      ...rule,
      id: Math.random().toString(36).substr(2, 9),
      created: new Date().toISOString(),
      enabled: true,
      lastTriggered: null,
    };
  }

  async updateAlertRule(id: string, rule: any) {
    return {
      ...rule,
      id,
      updated: new Date().toISOString(),
    };
  }

  async toggleAlertRule(id: string, enabled: boolean) {
    return { id, enabled };
  }

  async deleteAlertRule(id: string) {
    return { id, deleted: true };
  }

  async resolveAlert(id: string, body: any) {
    return {
      id,
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      resolvedBy: body.userId || 'admin',
      resolution: body.resolution || 'Resuelto manualmente',
    };
  }
}

export const monitoringMockService = new MonitoringMockService();