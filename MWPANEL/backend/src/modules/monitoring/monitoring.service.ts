import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Counter,
  Gauge,
  Histogram,
  register,
  collectDefaultMetrics,
} from 'prom-client';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class MonitoringService implements OnModuleInit {
  // HTTP Metrics
  private httpRequestDuration: Histogram<string>;
  private httpRequestsTotal: Counter<string>;
  private httpRequestsErrors: Counter<string>;

  // Database Metrics
  private dbQueryDuration: Histogram<string>;
  private dbConnectionsActive: Gauge<string>;
  private dbQueryErrors: Counter<string>;

  // Cache Metrics
  private cacheHits: Counter<string>;
  private cacheMisses: Counter<string>;
  private cacheEvictions: Counter<string>;

  // Business Metrics
  private activeUsersGauge: Gauge<string>;
  private studentsEnrolledGauge: Gauge<string>;
  private activitiesCreatedCounter: Counter<string>;
  private evaluationsCompletedCounter: Counter<string>;
  private messagesExchangedCounter: Counter<string>;

  // System Metrics
  private memoryUsageGauge: Gauge<string>;
  private cpuUsageGauge: Gauge<string>;
  
  // Flag to prevent double initialization
  private static defaultMetricsInitialized = false;

  constructor(
    private configService: ConfigService,
    @InjectDataSource() private dataSource: DataSource,
  ) {
    this.initializeMetrics();
  }

  async onModuleInit() {
    // TEMPORARY: Disable all metrics initialization to avoid conflicts
    console.log('⚠️ MonitoringService: Metrics initialization disabled temporarily');
    
    // Don't initialize default metrics to avoid conflicts
    // if (!MonitoringService.defaultMetricsInitialized) {
    //   try {
    //     collectDefaultMetrics({ register });
    //     MonitoringService.defaultMetricsInitialized = true;
    //     console.log('✅ Default Prometheus metrics initialized');
    //   } catch (error) {
    //     console.warn('⚠️ Default metrics registration failed:', error.message);
    //   }
    // } else {
    //   console.log('ℹ️ Default metrics already initialized, skipping...');
    // }

    // Don't start collecting custom metrics temporarily
    // this.startMetricsCollection();
  }

  private initializeMetrics() {
    // HTTP Metrics
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestsErrors = new Counter({
      name: 'http_requests_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
    });

    // Database Metrics
    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
    });

    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      labelNames: ['state'],
    });

    this.dbQueryErrors = new Counter({
      name: 'db_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['query_type', 'error_type'],
    });

    // Cache Metrics
    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type', 'key_pattern'],
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type', 'key_pattern'],
    });

    this.cacheEvictions = new Counter({
      name: 'cache_evictions_total',
      help: 'Total number of cache evictions',
      labelNames: ['cache_type', 'reason'],
    });

    // Business Metrics
    this.activeUsersGauge = new Gauge({
      name: 'active_users_total',
      help: 'Total number of active users',
      labelNames: ['role'],
    });

    this.studentsEnrolledGauge = new Gauge({
      name: 'students_enrolled_total',
      help: 'Total number of enrolled students',
      labelNames: ['educational_level', 'course'],
    });

    this.activitiesCreatedCounter = new Counter({
      name: 'activities_created_total',
      help: 'Total number of activities created',
      labelNames: ['type', 'subject'],
    });

    this.evaluationsCompletedCounter = new Counter({
      name: 'evaluations_completed_total',
      help: 'Total number of evaluations completed',
      labelNames: ['evaluation_type', 'competency'],
    });

    this.messagesExchangedCounter = new Counter({
      name: 'messages_exchanged_total',
      help: 'Total number of messages exchanged',
      labelNames: ['sender_role', 'receiver_role'],
    });

    // System Metrics
    this.memoryUsageGauge = new Gauge({
      name: 'nodejs_memory_usage_bytes',
      help: 'Node.js memory usage',
      labelNames: ['type'],
    });

    this.cpuUsageGauge = new Gauge({
      name: 'nodejs_cpu_usage_percentage',
      help: 'Node.js CPU usage percentage',
    });
  }

  private startMetricsCollection() {
    // Update system metrics every 10 seconds
    setInterval(() => {
      this.updateSystemMetrics();
    }, 10000);

    // Update business metrics every minute
    setInterval(() => {
      this.updateBusinessMetrics();
    }, 60000);

    // Update database metrics every 30 seconds
    setInterval(() => {
      this.updateDatabaseMetrics();
    }, 30000);
  }

  private updateSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    this.memoryUsageGauge.set({ type: 'heapTotal' }, memoryUsage.heapTotal);
    this.memoryUsageGauge.set({ type: 'heapUsed' }, memoryUsage.heapUsed);
    this.memoryUsageGauge.set({ type: 'external' }, memoryUsage.external);
    this.memoryUsageGauge.set({ type: 'rss' }, memoryUsage.rss);

    const cpuUsage = process.cpuUsage();
    const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    this.cpuUsageGauge.set(totalUsage);
  }

  private async updateBusinessMetrics() {
    try {
      // Update active users by role
      const usersByRole = await this.dataSource.query(`
        SELECT role, COUNT(*) as count
        FROM users
        WHERE is_active = true
        GROUP BY role
      `);

      usersByRole.forEach((row: any) => {
        this.activeUsersGauge.set({ role: row.role }, parseInt(row.count));
      });

      // Update enrolled students by educational level
      const studentsByLevel = await this.dataSource.query(`
        SELECT e.name as educational_level, COUNT(DISTINCT s.id) as count
        FROM students s
        JOIN educational_levels e ON s.educational_level_id = e.id
        WHERE s.is_active = true
        GROUP BY e.name
      `);

      studentsByLevel.forEach((row: any) => {
        this.studentsEnrolledGauge.set(
          { educational_level: row.educational_level, course: 'all' },
          parseInt(row.count),
        );
      });
    } catch (error) {
      console.error('Error updating business metrics:', error);
    }
  }

  private async updateDatabaseMetrics() {
    try {
      // Get connection pool stats
      const queryRunner = this.dataSource.createQueryRunner();
      const isConnected = queryRunner.isTransactionActive;
      await queryRunner.release();

      // TypeORM doesn't expose pool stats directly, using defaults
      this.dbConnectionsActive.set(
        { state: 'active' },
        10, // Default pool size
      );
      this.dbConnectionsActive.set(
        { state: 'idle' },
        5, // Estimated idle connections
      );
    } catch (error) {
      console.error('Error updating database metrics:', error);
    }
  }

  // Public methods for recording metrics

  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
  ) {
    const labels = { method, route, status_code: statusCode.toString() };
    this.httpRequestDuration.observe(labels, duration);
    this.httpRequestsTotal.inc(labels);

    if (statusCode >= 400) {
      this.httpRequestsErrors.inc({
        method,
        route,
        error_type: statusCode >= 500 ? 'server_error' : 'client_error',
      });
    }
  }

  recordDatabaseQuery(queryType: string, table: string, duration: number) {
    this.dbQueryDuration.observe({ query_type: queryType, table }, duration);
  }

  recordDatabaseError(queryType: string, errorType: string) {
    this.dbQueryErrors.inc({ query_type: queryType, error_type: errorType });
  }

  recordCacheHit(cacheType: string, keyPattern: string) {
    this.cacheHits.inc({ cache_type: cacheType, key_pattern: keyPattern });
  }

  recordCacheMiss(cacheType: string, keyPattern: string) {
    this.cacheMisses.inc({ cache_type: cacheType, key_pattern: keyPattern });
  }

  recordCacheEviction(cacheType: string, reason: string) {
    this.cacheEvictions.inc({ cache_type: cacheType, reason });
  }

  recordActivityCreated(type: string, subject: string) {
    this.activitiesCreatedCounter.inc({ type, subject });
  }

  recordEvaluationCompleted(evaluationType: string, competency: string) {
    this.evaluationsCompletedCounter.inc({
      evaluation_type: evaluationType,
      competency,
    });
  }

  recordMessageExchanged(senderRole: string, receiverRole: string) {
    this.messagesExchangedCounter.inc({
      sender_role: senderRole,
      receiver_role: receiverRole,
    });
  }

  // Custom metrics for specific modules

  async getModuleMetrics(moduleName: string): Promise<any> {
    const metrics: any = {};

    switch (moduleName) {
      case 'auth':
        metrics.loginAttempts = await this.getLoginAttempts();
        metrics.activeSessions = await this.getActiveSessions();
        break;
      case 'students':
        metrics.enrollmentRate = await this.getEnrollmentRate();
        metrics.attendanceRate = await this.getAttendanceRate();
        break;
      case 'activities':
        metrics.completionRate = await this.getActivityCompletionRate();
        metrics.averageScore = await this.getAverageActivityScore();
        break;
        metrics.dailyActiveUsers = await this.getTypeQuestDAU();
        metrics.averageWPM = await this.getAverageWPM();
        break;
    }

    return metrics;
  }

  // Nuevos métodos para el dashboard integrado

  async getSystemMetrics(timeRange: string): Promise<any> {
    const metrics = {
      cpu: await this.getCPUUsage(),
      memory: await this.getMemoryUsage(),
      disk: await this.getDiskUsage(),
      dbConnections: await this.getDatabaseConnections(),
      cacheHitRate: await this.getCacheHitRate(),
      activeUsers: await this.getActiveUsersCount(),
      activitiesToday: await this.getActivitiesToday(),
      messagesSent: await this.getMessagesSentToday(),
    };

    return metrics;
  }

  async getPerformanceMetrics(timeRange: string): Promise<any> {
    const now = new Date();
    const timeRangeMs = this.parseTimeRange(timeRange);
    const startTime = new Date(now.getTime() - timeRangeMs);

    const timeline = await this.getPerformanceTimeline(startTime, now);
    const slowestEndpoints = await this.getSlowestEndpoints(startTime, now);

    return {
      timeline,
      slowestEndpoints,
    };
  }

  async getActiveAlerts(): Promise<any[]> {
    // Simular alertas activas por ahora
    return [
      {
        id: '1',
        severity: 'warning',
        title: 'Alto uso de CPU',
        description: 'El uso de CPU ha superado el 80% durante los últimos 5 minutos',
        timestamp: new Date().toISOString(),
        status: 'active',
        actions: ['Reiniciar servicio', 'Escalar recursos'],
      },
      {
        id: '2',
        severity: 'info',
        title: 'Backup completado',
        description: 'El backup diario se ha completado exitosamente',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        status: 'resolved',
      },
    ];
  }

  async getAlertRules(): Promise<any[]> {
    // Reglas de alertas predefinidas
    return [
      {
        id: '1',
        name: 'Alto uso de CPU',
        description: 'Alerta cuando el CPU supera el umbral',
        metric: 'cpu_usage',
        condition: '>',
        threshold: 80,
        duration: '5m',
        severity: 'warning',
        enabled: true,
        actions: ['email', 'webhook'],
        lastTriggered: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: '2',
        name: 'Tasa de error alta',
        description: 'Alerta cuando la tasa de error supera el 5%',
        metric: 'error_rate',
        condition: '>',
        threshold: 5,
        duration: '5m',
        severity: 'critical',
        enabled: true,
        actions: ['email', 'restart'],
      },
    ];
  }

  async getAlertHistory(filters: any): Promise<any[]> {
    // Historial de alertas
    return [];
  }

  async createAlertRule(data: any): Promise<any> {
    // Crear nueva regla de alerta
    return { ...data, id: Date.now().toString() };
  }

  async updateAlertRule(id: string, data: any): Promise<any> {
    // Actualizar regla existente
    return { id, ...data };
  }

  async deleteAlertRule(id: string): Promise<void> {
    // Eliminar regla
  }

  async toggleAlertRule(id: string, enabled: boolean): Promise<any> {
    // Activar/desactivar regla
    return { id, enabled };
  }

  async resolveAlert(alertId: string): Promise<void> {
    // Resolver alerta
  }

  async executeAlertAction(alertId: string, action: string): Promise<void> {
    // Ejecutar acción de alerta
  }

  async getAlertChannels(): Promise<any[]> {
    return [
      {
        id: '1',
        name: 'Email principal',
        type: 'email',
        enabled: true,
        config: { to: 'admin@mwpanel.com' },
      },
      {
        id: '2',
        name: 'Webhook Slack',
        type: 'webhook',
        enabled: false,
        config: { url: 'https://hooks.slack.com/...' },
      },
    ];
  }

  async getSystemLogs(filters: any): Promise<any[]> {
    // Simular logs del sistema
    const levels = ['error', 'warn', 'info', 'debug'];
    const services = ['backend', 'frontend', 'postgres', 'redis'];
    const logs = [];

    for (let i = 0; i < 50; i++) {
      logs.push({
        id: i.toString(),
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        service: services[Math.floor(Math.random() * services.length)],
        message: `Log message ${i} - ${Math.random().toString(36).substring(7)}`,
        metadata: {
          userId: Math.random() > 0.5 ? `user-${Math.floor(Math.random() * 100)}` : undefined,
          requestId: `req-${Math.random().toString(36).substring(7)}`,
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
        },
      });
    }

    return logs;
  }

  async getAvailableServices(): Promise<string[]> {
    return ['backend', 'frontend', 'postgres', 'redis', 'nginx'];
  }

  async clearCache(): Promise<void> {
    // Limpiar caché Redis
    // Aquí implementarías la limpieza real del caché
  }

  async restartService(service: string): Promise<void> {
    // Reiniciar servicio
    // Aquí implementarías el reinicio real del servicio
  }

  async runDiagnostics(): Promise<any> {
    return {
      database: { status: 'healthy', latency: 2.5 },
      redis: { status: 'healthy', latency: 0.8 },
      disk: { status: 'healthy', usage: 45 },
      memory: { status: 'warning', usage: 78 },
    };
  }

  async getAvailableMetrics(): Promise<any[]> {
    const metrics = register.getMetricsAsArray();
    return metrics.map((metric) => ({
      id: metric.name,
      name: metric.name,
      help: metric.help,
      type: metric.type,
      unit: metric.name.includes('bytes') ? 'bytes' : 
            metric.name.includes('seconds') ? 'seconds' : 
            metric.name.includes('percentage') ? '%' : '',
    }));
  }

  async getMetricsData(category: string, timeRange: string): Promise<any> {
    // Generar datos de métricas para los gráficos
    const data: any = {};
    const points = 20;
    const now = Date.now();
    const interval = this.parseTimeRange(timeRange) / points;

    // Generar datos de ejemplo para cada métrica
    data['response-time'] = [];
    data['request-rate'] = [];
    data['error-rate'] = [];
    data['cpu-usage'] = [];
    data['memory-usage'] = [];
    data['db-connections'] = [];
    data['active-users'] = [];
    data['activities-created'] = [];
    data['cache-performance'] = [];

    for (let i = 0; i < points; i++) {
      const timestamp = new Date(now - (points - i) * interval).toISOString();
      
      data['response-time'].push({
        timestamp,
        value: 50 + Math.random() * 100,
      });
      
      data['request-rate'].push({
        timestamp,
        value: 100 + Math.random() * 50,
      });
      
      data['error-rate'].push({
        timestamp,
        value: Math.random() * 5,
      });
    }

    return data;
  }

  async executeCustomQuery(query: string): Promise<any> {
    // Ejecutar consulta Prometheus personalizada
    // Por ahora retornamos datos de ejemplo
    return {
      resultType: 'matrix',
      result: [{
        metric: { __name__: query },
        values: [[Date.now() / 1000, Math.random() * 100]],
      }],
    };
  }

  // Métodos auxiliares

  private async getCPUUsage(): Promise<number> {
    const usage = process.cpuUsage();
    return Math.round((usage.user + usage.system) / 1000000);
  }

  private async getMemoryUsage(): Promise<number> {
    const used = process.memoryUsage();
    return Math.round((used.heapUsed / used.heapTotal) * 100);
  }

  private async getDiskUsage(): Promise<number> {
    // Implementar lectura real del disco
    return 45;
  }

  private async getDatabaseConnections(): Promise<number> {
    try {
      const result = await this.dataSource.query(`
        SELECT count(*) as count 
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);
      return parseInt(result[0]?.count || 0);
    } catch {
      return 0;
    }
  }

  private async getCacheHitRate(): Promise<number> {
    // Calcular hit rate real
    return 85;
  }

  private async getActiveUsersCount(): Promise<number> {
    try {
      const result = await this.dataSource.query(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM refresh_tokens
        WHERE expires_at > NOW()
      `);
      return parseInt(result[0]?.count || 0);
    } catch {
      return 0;
    }
  }

  private async getActivitiesToday(): Promise<number> {
    try {
      const result = await this.dataSource.query(`
        SELECT COUNT(*) as count
        FROM activities
        WHERE created_at > CURRENT_DATE
      `);
      return parseInt(result[0]?.count || 0);
    } catch {
      return 0;
    }
  }

  private async getMessagesSentToday(): Promise<number> {
    try {
      const result = await this.dataSource.query(`
        SELECT COUNT(*) as count
        FROM messages
        WHERE created_at > CURRENT_DATE
      `);
      return parseInt(result[0]?.count || 0);
    } catch {
      return 0;
    }
  }

  private parseTimeRange(timeRange: string): number {
    const units: any = {
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const match = timeRange.match(/(\d+)(\w)/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      return value * (units[unit] || units.h);
    }

    return 60 * 60 * 1000; // Default 1 hour
  }

  private async getPerformanceTimeline(startTime: Date, endTime: Date): Promise<any[]> {
    // Generar timeline de rendimiento
    const timeline = [];
    const points = 20;
    const interval = (endTime.getTime() - startTime.getTime()) / points;

    for (let i = 0; i < points; i++) {
      timeline.push({
        time: new Date(startTime.getTime() + i * interval).toISOString(),
        responseTime: 50 + Math.random() * 100,
        requestRate: 100 + Math.random() * 50,
        errorRate: Math.random() * 5,
      });
    }

    return timeline;
  }

  private async getSlowestEndpoints(startTime: Date, endTime: Date): Promise<any[]> {
    // Obtener endpoints más lentos
    return [
      { route: '/api/reports/generate', avgTime: 2500, p95: 3200 },
      { route: '/api/evaluations/bulk', avgTime: 1800, p95: 2400 },
      { route: '/api/activities/search', avgTime: 800, p95: 1200 },
    ];
  }

  private async getLoginAttempts(): Promise<number> {
    const result = await this.dataSource.query(`
      SELECT COUNT(*) as count
      FROM user_login_attempts
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    return parseInt(result[0]?.count || 0);
  }

  private async getActiveSessions(): Promise<number> {
    const result = await this.dataSource.query(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM refresh_tokens
      WHERE expires_at > NOW()
    `);
    return parseInt(result[0]?.count || 0);
  }

  private async getEnrollmentRate(): Promise<number> {
    const result = await this.dataSource.query(`
      SELECT 
        COUNT(CASE WHEN enrollment_date > NOW() - INTERVAL '30 days' THEN 1 END)::float / 
        NULLIF(COUNT(*)::float, 0) * 100 as rate
      FROM students
      WHERE is_active = true
    `);
    return parseFloat(result[0]?.rate || 0);
  }

  private async getAttendanceRate(): Promise<number> {
    const result = await this.dataSource.query(`
      SELECT 
        COUNT(CASE WHEN status = 'present' THEN 1 END)::float / 
        NULLIF(COUNT(*)::float, 0) * 100 as rate
      FROM attendance_records
      WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    `);
    return parseFloat(result[0]?.rate || 0);
  }

  private async getActivityCompletionRate(): Promise<number> {
    const result = await this.dataSource.query(`
      SELECT 
        COUNT(DISTINCT activity_id)::float / 
        NULLIF((SELECT COUNT(*) FROM activities WHERE is_active = true)::float, 0) * 100 as rate
      FROM activity_assessments
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);
    return parseFloat(result[0]?.rate || 0);
  }

  private async getAverageActivityScore(): Promise<number> {
    const result = await this.dataSource.query(`
      SELECT AVG(score) as avg_score
      FROM activity_assessments
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);
    return parseFloat(result[0]?.avg_score || 0);
  }

  private async getTypeQuestDAU(): Promise<number> {
    const result = await this.dataSource.query(`
      SELECT COUNT(DISTINCT user_id) as count
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    return parseInt(result[0]?.count || 0);
  }

  private async getAverageWPM(): Promise<number> {
    const result = await this.dataSource.query(`
      SELECT AVG(wpm) as avg_wpm
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    return parseFloat(result[0]?.avg_wpm || 0);
  }
}