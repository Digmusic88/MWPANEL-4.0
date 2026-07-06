import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
// import { AuditService } from '../audit/services/audit.service'; // DISABLED - Audit system removed
import { CacheService } from '../../common/services/cache.service';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    requests: number;
    errors: number;
    responseTime: number;
  };
  database: {
    connections: number;
    queries: number;
    slowQueries: number;
    size: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    memory: string;
  };
  application: {
    uptime: number;
    version: string;
    environment: string;
    activeUsers: number;
    totalUsers: number;
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: 'up' | 'down';
    cache: 'up' | 'down';
    api: 'up' | 'down';
  };
  metrics: SystemMetrics;
  alerts: PerformanceAlert[];
  uptime: number;
  lastCheck: Date;
}

@Injectable()
export class AdvancedMonitoringService implements OnModuleInit {
  private readonly logger = new Logger(AdvancedMonitoringService.name);
  private metrics: SystemMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private startTime: Date;
  private performanceData = {
    requests: 0,
    errors: 0,
    responseTimes: [] as number[],
  };

  // Thresholds for alerts
  private readonly thresholds = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    disk: { warning: 85, critical: 95 },
    responseTime: { warning: 1000, critical: 3000 },
    errorRate: { warning: 5, critical: 10 },
    cacheHitRate: { warning: 70, critical: 50 },
  };

  constructor(
    private configService: ConfigService,
    // private auditService: AuditService, // DISABLED - Audit system removed
    private cacheService: CacheService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.startTime = new Date();
  }

  async onModuleInit() {
    this.logger.log('Advanced monitoring service initialized');
    // Collect initial metrics
    await this.collectMetrics();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async collectMetricsScheduled() {
    await this.collectMetrics();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupOldMetrics() {
    // Keep only last 24 hours of metrics
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    // Clean up resolved alerts older than 1 hour
    const alertCutoff = new Date(Date.now() - 60 * 60 * 1000);
    this.alerts = this.alerts.filter(a => !a.resolved || a.timestamp > alertCutoff);
  }

  async collectMetrics(): Promise<SystemMetrics> {
    try {
      const [cpuMetrics, memoryMetrics, diskMetrics, dbMetrics, cacheStats, userStats] = await Promise.all([
        this.getCpuMetrics(),
        this.getMemoryMetrics(),
        this.getDiskMetrics(),
        this.getDatabaseMetrics(),
        this.getCacheStats(),
        this.getUserStats(),
      ]);

      const networkMetrics = this.getNetworkMetrics();
      
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        cpu: cpuMetrics,
        memory: memoryMetrics,
        disk: diskMetrics,
        network: networkMetrics,
        database: dbMetrics,
        cache: {
          hits: cacheStats.hits,
          misses: cacheStats.misses,
          hitRate: cacheStats.hitRate,
          memory: cacheStats.memoryUsage,
        },
        application: {
          uptime: Date.now() - this.startTime.getTime(),
          version: process.env.npm_package_version || '2.0.0',
          environment: this.configService.get('NODE_ENV', 'development'),
          activeUsers: userStats.active,
          totalUsers: userStats.total,
        },
      };

      // Store metrics
      this.metrics.push(metrics);
      
      // Check for alerts
      await this.checkAlerts(metrics);
      
      return metrics;
    } catch (error) {
      this.logger.error('Failed to collect metrics:', error);
      throw error;
    }
  }

  private async getCpuMetrics() {
    const cpus = os.cpus();
    const loadAverage = os.loadavg();
    
    // Calculate CPU usage (simplified)
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      const times = cpu.times;
      totalIdle += times.idle;
      totalTick += times.idle + times.user + times.nice + times.sys + times.irq;
    });
    
    const usage = 100 - Math.round((totalIdle / totalTick) * 100);
    
    return {
      usage,
      loadAverage,
      cores: cpus.length,
    };
  }

  private getMemoryMetrics() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usage = Math.round((used / total) * 100);
    
    return {
      total,
      used,
      free,
      usage,
    };
  }

  private async getDiskMetrics() {
    try {
      const stats = await fs.stat('/');
      // This is a simplified disk usage calculation
      // In a real implementation, you'd use statvfs or similar
      return {
        total: 100 * 1024 * 1024 * 1024, // 100GB placeholder
        used: 50 * 1024 * 1024 * 1024,   // 50GB placeholder
        free: 50 * 1024 * 1024 * 1024,   // 50GB placeholder
        usage: 50, // 50% placeholder
      };
    } catch (error) {
      return {
        total: 0,
        used: 0,
        free: 0,
        usage: 0,
      };
    }
  }

  private getNetworkMetrics() {
    const avgResponseTime = this.performanceData.responseTimes.length > 0
      ? this.performanceData.responseTimes.reduce((a, b) => a + b, 0) / this.performanceData.responseTimes.length
      : 0;

    return {
      requests: this.performanceData.requests,
      errors: this.performanceData.errors,
      responseTime: Math.round(avgResponseTime),
    };
  }

  private async getDatabaseMetrics() {
    try {
      // Get total user count as a simple metric
      const totalUsers = await this.userRepository.count();
      
      return {
        connections: 10, // Placeholder - would need to query SHOW PROCESSLIST
        queries: 100,    // Placeholder - would need query log analysis
        slowQueries: 2,  // Placeholder - would need slow query log
        size: totalUsers * 1024, // Simplified calculation
      };
    } catch (error) {
      return {
        connections: 0,
        queries: 0,
        slowQueries: 0,
        size: 0,
      };
    }
  }

  private async getUserStats() {
    try {
      const total = await this.userRepository.count();
      // Active users = users who logged in within last 24 hours
      const activeUsers = await this.userRepository.count({
        where: {
          // This would need a lastLoginAt field in the User entity
          // For now, we'll return a placeholder
        }
      });

      return {
        total,
        active: Math.min(activeUsers || Math.floor(total * 0.3), total), // Placeholder: 30% active
      };
    } catch (error) {
      return { total: 0, active: 0 };
    }
  }

  private async getCacheStats() {
    try {
      // Use the existing cache service to get basic stats
      const stats = await this.cacheService.getStats();
      
      return {
        hits: stats.hits || 0,
        misses: stats.misses || 0,
        hitRate: stats.hitRate || 0,
        memoryUsage: '0B', // Placeholder - would need Redis INFO command
      };
    } catch (error) {
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        memoryUsage: '0B',
      };
    }
  }

  private async checkAlerts(metrics: SystemMetrics) {
    const alerts: PerformanceAlert[] = [];

    // CPU alerts
    if (metrics.cpu.usage >= this.thresholds.cpu.critical) {
      alerts.push(this.createAlert('critical', 'cpu', metrics.cpu.usage, this.thresholds.cpu.critical, 'CPU usage is critically high'));
    } else if (metrics.cpu.usage >= this.thresholds.cpu.warning) {
      alerts.push(this.createAlert('warning', 'cpu', metrics.cpu.usage, this.thresholds.cpu.warning, 'CPU usage is high'));
    }

    // Memory alerts
    if (metrics.memory.usage >= this.thresholds.memory.critical) {
      alerts.push(this.createAlert('critical', 'memory', metrics.memory.usage, this.thresholds.memory.critical, 'Memory usage is critically high'));
    } else if (metrics.memory.usage >= this.thresholds.memory.warning) {
      alerts.push(this.createAlert('warning', 'memory', metrics.memory.usage, this.thresholds.memory.warning, 'Memory usage is high'));
    }

    // Disk alerts
    if (metrics.disk.usage >= this.thresholds.disk.critical) {
      alerts.push(this.createAlert('critical', 'disk', metrics.disk.usage, this.thresholds.disk.critical, 'Disk usage is critically high'));
    } else if (metrics.disk.usage >= this.thresholds.disk.warning) {
      alerts.push(this.createAlert('warning', 'disk', metrics.disk.usage, this.thresholds.disk.warning, 'Disk usage is high'));
    }

    // Response time alerts
    if (metrics.network.responseTime >= this.thresholds.responseTime.critical) {
      alerts.push(this.createAlert('critical', 'responseTime', metrics.network.responseTime, this.thresholds.responseTime.critical, 'API response time is critically slow'));
    } else if (metrics.network.responseTime >= this.thresholds.responseTime.warning) {
      alerts.push(this.createAlert('warning', 'responseTime', metrics.network.responseTime, this.thresholds.responseTime.warning, 'API response time is slow'));
    }

    // Cache hit rate alerts
    if (metrics.cache.hitRate <= this.thresholds.cacheHitRate.critical) {
      alerts.push(this.createAlert('critical', 'cacheHitRate', metrics.cache.hitRate, this.thresholds.cacheHitRate.critical, 'Cache hit rate is critically low'));
    } else if (metrics.cache.hitRate <= this.thresholds.cacheHitRate.warning) {
      alerts.push(this.createAlert('warning', 'cacheHitRate', metrics.cache.hitRate, this.thresholds.cacheHitRate.warning, 'Cache hit rate is low'));
    }

    // Add new alerts
    alerts.forEach(alert => {
      // Check if similar alert already exists
      const existingAlert = this.alerts.find(a => 
        a.metric === alert.metric && 
        a.type === alert.type && 
        !a.resolved
      );
      
      if (!existingAlert) {
        this.alerts.push(alert);
        this.logger.warn(`Performance alert: ${alert.message}`);
      }
    });
  }

  private createAlert(
    type: 'warning' | 'critical',
    metric: string,
    value: number,
    threshold: number,
    message: string
  ): PerformanceAlert {
    return {
      id: `${metric}-${type}-${Date.now()}`,
      type,
      metric,
      value,
      threshold,
      message,
      timestamp: new Date(),
      resolved: false,
    };
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const currentMetrics = await this.collectMetrics();
    
    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const criticalAlerts = this.alerts.filter(a => a.type === 'critical' && !a.resolved);
    const warningAlerts = this.alerts.filter(a => a.type === 'warning' && !a.resolved);
    
    if (criticalAlerts.length > 0) {
      status = 'unhealthy';
    } else if (warningAlerts.length > 0) {
      status = 'degraded';
    }

    // Check cache health
    let cacheStatus: 'up' | 'down' = 'up';
    try {
      await this.cacheService.get('health-check');
      cacheStatus = 'up';
    } catch (error) {
      cacheStatus = 'down';
    }

    return {
      status,
      services: {
        database: 'up', // Would check actual DB connection
        cache: cacheStatus,
        api: 'up', // Would check API endpoints
      },
      metrics: currentMetrics,
      alerts: this.alerts.filter(a => !a.resolved),
      uptime: Date.now() - this.startTime.getTime(),
      lastCheck: new Date(),
    };
  }

  async getMetricsHistory(hours: number = 24): Promise<SystemMetrics[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  // Methods to track performance data from middleware/interceptors
  recordRequest(responseTime: number) {
    this.performanceData.requests++;
    this.performanceData.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times
    if (this.performanceData.responseTimes.length > 1000) {
      this.performanceData.responseTimes = this.performanceData.responseTimes.slice(-1000);
    }
  }

  recordError() {
    this.performanceData.errors++;
  }

  async getDashboardMetrics(): Promise<{
    overview: {
      status: string;
      uptime: number;
      totalUsers: number;
      activeUsers: number;
      requests: number;
      errors: number;
    };
    performance: {
      cpuUsage: number;
      memoryUsage: number;
      diskUsage: number;
      cacheHitRate: number;
      avgResponseTime: number;
    };
    alerts: PerformanceAlert[];
    trends: {
      cpuTrend: number[];
      memoryTrend: number[];
      requestsTrend: number[];
    };
  }> {
    const healthStatus = await this.getHealthStatus();
    const recentMetrics = this.metrics.slice(-12); // Last 12 data points

    return {
      overview: {
        status: healthStatus.status,
        uptime: healthStatus.uptime,
        totalUsers: healthStatus.metrics.application.totalUsers,
        activeUsers: healthStatus.metrics.application.activeUsers,
        requests: this.performanceData.requests,
        errors: this.performanceData.errors,
      },
      performance: {
        cpuUsage: healthStatus.metrics.cpu.usage,
        memoryUsage: healthStatus.metrics.memory.usage,
        diskUsage: healthStatus.metrics.disk.usage,
        cacheHitRate: healthStatus.metrics.cache.hitRate,
        avgResponseTime: healthStatus.metrics.network.responseTime,
      },
      alerts: healthStatus.alerts,
      trends: {
        cpuTrend: recentMetrics.map(m => m.cpu.usage),
        memoryTrend: recentMetrics.map(m => m.memory.usage),
        requestsTrend: recentMetrics.map(m => m.network.requests),
      },
    };
  }
}