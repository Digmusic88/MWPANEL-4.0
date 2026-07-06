import { Controller, Get, Query, Post, Body, Param, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../modules/users/entities/user.entity';
import { SystemMonitorService } from './system-monitor.service';
import { AlertMonitorService } from './alert-monitor.service';

@ApiTags('monitoring')
@Controller('monitoring')
@Roles(UserRole.ADMIN)
export class MonitoringSimpleController {
  constructor(
    private readonly systemMonitorService: SystemMonitorService,
    private readonly alertMonitorService: AlertMonitorService,
  ) {}
  // Métricas del sistema
  @Get('metrics/system')
  @ApiOperation({ summary: 'Obtener métricas del sistema' })
  async getSystemMetrics(@Query('timeRange') timeRange: string = '1h') {
    // Obtener métricas reales del sistema
    return await this.systemMonitorService.getSystemMetrics();
  }

  // Métricas de rendimiento
  @Get('metrics/performance')
  async getPerformanceMetrics(@Query('timeRange') timeRange: string = '1h') {
    // Obtener métricas de rendimiento con datos históricos reales
    return await this.systemMonitorService.getPerformanceMetrics(timeRange);
  }

  // Alertas activas
  @Get('alerts/active')
  async getActiveAlerts() {
    // Obtener alertas activas reales del sistema
    return await this.alertMonitorService.getActiveAlerts();
  }

  // Historial de alertas
  @Get('alerts/history')
  async getAlertHistory(@Query() filters: any) {
    // Obtener historial real de alertas del sistema
    return await this.alertMonitorService.getAlertHistory(filters);
  }

  // Reglas de alertas
  @Get('alerts/rules')
  async getAlertRules() {
    // Obtener reglas de alerta configuradas
    return await this.alertMonitorService.getAlertRules();
  }

  // Canales de alerta
  @Get('alerts/channels')
  async getAlertChannels() {
    // Obtener canales de notificación configurados
    return await this.alertMonitorService.getAlertChannels();
  }

  // Logs del sistema
  @Get('logs/system')
  async getSystemLogs(@Query() filters: any) {
    // Obtener logs reales del sistema con datos de la base de datos
    return await this.systemMonitorService.getSystemLogs(filters);
  }

  // Servicios disponibles
  @Get('logs/services')
  async getAvailableServices() {
    return ['backend', 'postgres', 'redis', 'nginx', 'frontend'];
  }

  // Diagnóstico
  @Post('diagnostics/run')
  async runDiagnostics(@Body() body: { tests: string[] }) {
    // Ejecutar diagnósticos reales del sistema
    return await this.systemMonitorService.runDiagnostics(body.tests || ['database', 'cache', 'api', 'storage']);
  }

  // Reiniciar servicio (simulado)
  @Post('services/restart/:serviceName')
  @HttpCode(200)
  async restartService(@Param('serviceName') serviceName: string) {
    // En producción real, aquí ejecutarías comandos Docker
    return {
      service: serviceName,
      status: 'restarted',
      message: `Servicio ${serviceName} reiniciado correctamente`,
      timestamp: new Date().toISOString(),
    };
  }

  // Métricas personalizadas
  @Get('metrics/custom/:metricName')
  async getCustomMetric(@Param('metricName') metricName: string) {
    // Obtener métricas personalizadas reales
    return await this.systemMonitorService.getCustomMetric(metricName);
  }

  // Exportar métricas
  @Get('metrics/export')
  async exportMetrics(@Query('format') format: string = 'json') {
    const data = {
      exportedAt: new Date().toISOString(),
      metrics: {
        system: await this.getSystemMetrics('1h'),
        performance: await this.getPerformanceMetrics('1h'),
      },
    };

    // En producción real, generarías CSV o otros formatos
    return data;
  }

  // Crear regla de alerta
  @Post('alerts/rules')
  async createAlertRule(@Body() rule: any) {
    // Crear nueva regla de alerta
    return await this.alertMonitorService.createAlertRule(rule);
  }

  // Actualizar regla de alerta
  @Post('alerts/rules/:id')
  async updateAlertRule(@Param('id') id: string, @Body() rule: any) {
    // Actualizar regla existente
    return await this.alertMonitorService.updateAlertRule(id, rule);
  }

  // Resolver alerta
  @Post('alerts/resolve/:id')
  async resolveAlert(@Param('id') id: string, @Body() body: any) {
    // Resolver alerta manual
    return await this.alertMonitorService.resolveAlert(id, body);
  }
}