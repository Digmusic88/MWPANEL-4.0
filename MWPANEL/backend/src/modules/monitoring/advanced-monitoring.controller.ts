import { Controller, Get, Post, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { AdvancedMonitoringService, SystemMetrics, HealthStatus, PerformanceAlert } from './advanced-monitoring.service';

@ApiTags('Advanced Monitoring')
@ApiBearerAuth()
@Controller('advanced-monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdvancedMonitoringController {
  constructor(private readonly advancedMonitoringService: AdvancedMonitoringService) {}

  @Get('health')
  @ApiOperation({ summary: 'Get comprehensive system health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  async getHealthStatus(): Promise<HealthStatus> {
    return this.advancedMonitoringService.getHealthStatus();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get current system metrics' })
  @ApiResponse({ status: 200, description: 'Current metrics retrieved successfully' })
  async getCurrentMetrics(): Promise<SystemMetrics> {
    return this.advancedMonitoringService.collectMetrics();
  }

  @Get('metrics/history')
  @ApiOperation({ summary: 'Get historical metrics data' })
  @ApiResponse({ status: 200, description: 'Historical metrics retrieved successfully' })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Hours of history to retrieve (default: 24)' })
  async getMetricsHistory(
    @Query('hours') hours?: number,
  ): Promise<SystemMetrics[]> {
    const parsedHours = hours ? Math.min(Math.max(1, Number(hours)), 168) : 24; // Max 1 week
    
    if (isNaN(parsedHours)) {
      throw new BadRequestException('Hours parameter must be a valid number');
    }

    return this.advancedMonitoringService.getMetricsHistory(parsedHours);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard metrics for admin interface' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics retrieved successfully' })
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
    return this.advancedMonitoringService.getDashboardMetrics();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get active performance alerts' })
  @ApiResponse({ status: 200, description: 'Active alerts retrieved successfully' })
  async getActiveAlerts(): Promise<PerformanceAlert[]> {
    const healthStatus = await this.advancedMonitoringService.getHealthStatus();
    return healthStatus.alerts;
  }

  @Post('alerts/:alertId/resolve')
  @ApiOperation({ summary: 'Resolve a performance alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved successfully' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiParam({ name: 'alertId', type: String, description: 'Alert ID to resolve' })
  async resolveAlert(
    @Param('alertId') alertId: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; message: string }> {
    if (!alertId) {
      throw new BadRequestException('Alert ID is required');
    }

    const success = await this.advancedMonitoringService.resolveAlert(alertId);

    return {
      success,
      message: success ? 'Alert resolved successfully' : 'Alert not found',
    };
  }

  @Get('performance/summary')
  @ApiOperation({ summary: 'Get performance summary for last 24 hours' })
  @ApiResponse({ status: 200, description: 'Performance summary retrieved successfully' })
  async getPerformanceSummary(): Promise<{
    period: string;
    averages: {
      cpuUsage: number;
      memoryUsage: number;
      diskUsage: number;
      responseTime: number;
      cacheHitRate: number;
    };
    peaks: {
      maxCpuUsage: number;
      maxMemoryUsage: number;
      maxResponseTime: number;
      minCacheHitRate: number;
    };
    totals: {
      requests: number;
      errors: number;
      uptime: number;
    };
    alerts: {
      total: number;
      critical: number;
      warnings: number;
      resolved: number;
    };
  }> {
    const metrics = await this.advancedMonitoringService.getMetricsHistory(24);
    const healthStatus = await this.advancedMonitoringService.getHealthStatus();
    
    if (metrics.length === 0) {
      throw new BadRequestException('No metrics data available');
    }

    // Calculate averages
    const averages = {
      cpuUsage: Math.round(metrics.reduce((sum, m) => sum + m.cpu.usage, 0) / metrics.length),
      memoryUsage: Math.round(metrics.reduce((sum, m) => sum + m.memory.usage, 0) / metrics.length),
      diskUsage: Math.round(metrics.reduce((sum, m) => sum + m.disk.usage, 0) / metrics.length),
      responseTime: Math.round(metrics.reduce((sum, m) => sum + m.network.responseTime, 0) / metrics.length),
      cacheHitRate: Math.round((metrics.reduce((sum, m) => sum + m.cache.hitRate, 0) / metrics.length) * 100) / 100,
    };

    // Calculate peaks
    const peaks = {
      maxCpuUsage: Math.max(...metrics.map(m => m.cpu.usage)),
      maxMemoryUsage: Math.max(...metrics.map(m => m.memory.usage)),
      maxResponseTime: Math.max(...metrics.map(m => m.network.responseTime)),
      minCacheHitRate: Math.min(...metrics.map(m => m.cache.hitRate)),
    };

    // Get latest totals
    const latestMetrics = metrics[metrics.length - 1];
    const totals = {
      requests: latestMetrics.network.requests,
      errors: latestMetrics.network.errors,
      uptime: latestMetrics.application.uptime,
    };

    // Alert statistics
    const dashboardMetrics = await this.advancedMonitoringService.getDashboardMetrics();
    const alerts = {
      total: dashboardMetrics.alerts.length,
      critical: dashboardMetrics.alerts.filter(a => a.type === 'critical').length,
      warnings: dashboardMetrics.alerts.filter(a => a.type === 'warning').length,
      resolved: dashboardMetrics.alerts.filter(a => a.resolved).length,
    };

    return {
      period: '24 hours',
      averages,
      peaks,
      totals,
      alerts,
    };
  }

  @Get('system/info')
  @ApiOperation({ summary: 'Get system information and configuration' })
  @ApiResponse({ status: 200, description: 'System information retrieved successfully' })
  async getSystemInfo(): Promise<{
    system: {
      platform: string;
      arch: string;
      nodeVersion: string;
      cpuCores: number;
      totalMemory: string;
      hostname: string;
    };
    application: {
      version: string;
      environment: string;
      uptime: number;
      pid: number;
    };
    thresholds: {
      cpu: { warning: number; critical: number };
      memory: { warning: number; critical: number };
      disk: { warning: number; critical: number };
      responseTime: { warning: number; critical: number };
      cacheHitRate: { warning: number; critical: number };
    };
  }> {
    const os = await import('os');
    const healthStatus = await this.advancedMonitoringService.getHealthStatus();

    return {
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        cpuCores: os.cpus().length,
        totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100} GB`,
        hostname: os.hostname(),
      },
      application: {
        version: healthStatus.metrics.application.version,
        environment: healthStatus.metrics.application.environment,
        uptime: healthStatus.metrics.application.uptime,
        pid: process.pid,
      },
      thresholds: {
        cpu: { warning: 70, critical: 90 },
        memory: { warning: 80, critical: 95 },
        disk: { warning: 85, critical: 95 },
        responseTime: { warning: 1000, critical: 3000 },
        cacheHitRate: { warning: 70, critical: 50 },
      },
    };
  }

  @Post('record/request')
  @ApiOperation({ summary: 'Record request performance data (for internal use)' })
  @ApiResponse({ status: 200, description: 'Request data recorded successfully' })
  async recordRequest(
    @Query('responseTime') responseTime: number,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; message: string }> {
    if (isNaN(responseTime) || responseTime < 0) {
      throw new BadRequestException('Valid response time is required');
    }

    this.advancedMonitoringService.recordRequest(responseTime);

    return {
      success: true,
      message: 'Request performance data recorded',
    };
  }

  @Post('record/error')
  @ApiOperation({ summary: 'Record error occurrence (for internal use)' })
  @ApiResponse({ status: 200, description: 'Error data recorded successfully' })
  async recordError(
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; message: string }> {
    this.advancedMonitoringService.recordError();

    return {
      success: true,
      message: 'Error occurrence recorded',
    };
  }
}