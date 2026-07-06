import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Patch,
  Param, 
  Query, 
  Body,
  UseGuards 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('monitoring')
@Controller('monitoring')
@UseGuards(RolesGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  // Health endpoint (público)
  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check endpoint for monitoring' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  // Métricas del sistema
  @Get('metrics/system')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get system metrics' })
  async getSystemMetrics(@Query('timeRange') timeRange: string) {
    return this.monitoringService.getSystemMetrics(timeRange);
  }

  @Get('metrics/performance')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get performance metrics' })
  async getPerformanceMetrics(@Query('timeRange') timeRange: string) {
    return this.monitoringService.getPerformanceMetrics(timeRange);
  }

  @Get('metrics/:module')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get metrics for a specific module' })
  async getModuleMetrics(@Param('module') module: string) {
    return this.monitoringService.getModuleMetrics(module);
  }

  @Get('metrics/available')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get available metrics' })
  async getAvailableMetrics() {
    return this.monitoringService.getAvailableMetrics();
  }

  @Get('metrics/data')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get metrics data' })
  async getMetricsData(
    @Query('category') category: string,
    @Query('timeRange') timeRange: string,
  ) {
    return this.monitoringService.getMetricsData(category, timeRange);
  }

  @Post('metrics/query')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Execute custom Prometheus query' })
  async executeCustomQuery(@Body('query') query: string) {
    return this.monitoringService.executeCustomQuery(query);
  }

  // Alertas
  @Get('alerts/active')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get active alerts' })
  async getActiveAlerts() {
    return this.monitoringService.getActiveAlerts();
  }

  @Get('alerts/rules')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get alert rules' })
  async getAlertRules() {
    return this.monitoringService.getAlertRules();
  }

  @Get('alerts/history')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get alert history' })
  async getAlertHistory(
    @Query('severity') severity?: string,
    @Query('status') status?: string,
  ) {
    return this.monitoringService.getAlertHistory({ severity, status });
  }

  @Post('alerts/rules')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create alert rule' })
  async createAlertRule(@Body() data: any) {
    return this.monitoringService.createAlertRule(data);
  }

  @Put('alerts/rules/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update alert rule' })
  async updateAlertRule(@Param('id') id: string, @Body() data: any) {
    return this.monitoringService.updateAlertRule(id, data);
  }

  @Delete('alerts/rules/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete alert rule' })
  async deleteAlertRule(@Param('id') id: string) {
    return this.monitoringService.deleteAlertRule(id);
  }

  @Patch('alerts/rules/:id/toggle')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Toggle alert rule' })
  async toggleAlertRule(
    @Param('id') id: string,
    @Body('enabled') enabled: boolean,
  ) {
    return this.monitoringService.toggleAlertRule(id, enabled);
  }

  @Post('alerts/:id/resolve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Resolve alert' })
  async resolveAlert(@Param('id') id: string) {
    return this.monitoringService.resolveAlert(id);
  }

  @Post('alerts/:id/actions')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Execute alert action' })
  async executeAlertAction(
    @Param('id') id: string,
    @Body('action') action: string,
  ) {
    return this.monitoringService.executeAlertAction(id, action);
  }

  @Get('alerts/channels')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get alert notification channels' })
  async getAlertChannels() {
    return this.monitoringService.getAlertChannels();
  }

  // Logs
  @Get('logs')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get system logs' })
  async getSystemLogs(
    @Query('service') service?: string,
    @Query('level') level?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.monitoringService.getSystemLogs({
      service,
      level,
      search,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('logs/services')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get available services for log filtering' })
  async getAvailableServices() {
    return this.monitoringService.getAvailableServices();
  }

  // Herramientas de diagnóstico
  @Post('diagnostics/clear-cache')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Clear system cache' })
  async clearCache() {
    await this.monitoringService.clearCache();
    return { message: 'Cache cleared successfully' };
  }

  @Post('diagnostics/restart/:service')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Restart a service' })
  async restartService(@Param('service') service: string) {
    await this.monitoringService.restartService(service);
    return { message: `Service ${service} restarted successfully` };
  }

  @Post('diagnostics/run')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Run system diagnostics' })
  async runDiagnostics() {
    return this.monitoringService.runDiagnostics();
  }
}