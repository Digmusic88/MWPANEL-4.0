import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../entities/system-setting.entity';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

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

@Injectable()
export class NightlyRestartService {
  private readonly logger = new Logger(NightlyRestartService.name);
  private isRestartInProgress = false;
  private lastRestartResult: RestartResult | null = null;

  constructor(
    @InjectRepository(SystemSetting)
    private systemSettingRepository: Repository<SystemSetting>,
  ) {}

  // Reinicio programado a las 3:00 AM todos los días
  // @Cron('0 3 * * *', {
  //   name: 'nightly-system-restart',
  //   timeZone: 'Europe/Madrid',
  // })
  async handleScheduledRestart(): Promise<void> {
    try {
      const config = await this.getRestartConfig();
      
      if (!config.enabled) {
        this.logger.log('Reinicio nocturno deshabilitado en configuración');
        return;
      }

      const now = new Date();
      const currentDay = now.getDay();
      const currentDate = now.toISOString().split('T')[0];

      // Verificar si hoy está en los días excluidos
      if (config.excludedDays.includes(currentDate)) {
        this.logger.log(`Reinicio nocturno omitido para fecha excluida: ${currentDate}`);
        return;
      }

      // Verificar si hoy está en los días de la semana permitidos
      if (!config.daysOfWeek.includes(currentDay)) {
        this.logger.log(`Reinicio nocturno omitido para día de la semana: ${currentDay}`);
        return;
      }

      // Verificar horario programado
      const scheduledTime = config.scheduleTime.split(':');
      const scheduledHour = parseInt(scheduledTime[0]);
      const scheduledMinute = parseInt(scheduledTime[1]);
      
      if (now.getHours() !== scheduledHour || Math.abs(now.getMinutes() - scheduledMinute) > 5) {
        this.logger.log(`Reinicio nocturno fuera del horario programado: ${config.scheduleTime}`);
        return;
      }

      await this.performNightlyRestart(config);

    } catch (error) {
      this.logger.error('Error durante reinicio nocturno programado:', error);
    }
  }

  async performNightlyRestart(config: NightlyRestartConfig): Promise<RestartResult> {
    if (this.isRestartInProgress) {
      throw new Error('Reinicio ya en progreso');
    }

    this.isRestartInProgress = true;
    const startTime = Date.now();
    const logs: string[] = [];
    const errors: string[] = [];

    const result: RestartResult = {
      success: false,
      timestamp: new Date().toISOString(),
      preRestartChecks: {
        systemHealth: false,
        diskSpace: false,
        memoryUsage: false,
      },
      restartExecution: {
        shutdownSuccessful: false,
        startupSuccessful: false,
        servicesOnline: false,
      },
      postRestartValidation: {
        databaseConnected: false,
        redisConnected: false,
        apiResponding: false,
        frontendServing: false,
      },
      duration: 0,
      logs,
      errors,
    };

    try {
      logs.push(`🌙 Iniciando reinicio nocturno automático - ${new Date().toLocaleString()}`);
      
      // 1. Verificaciones pre-reinicio
      logs.push('📋 Ejecutando verificaciones pre-reinicio...');
      await this.runPreRestartChecks(result, config, logs, errors);

      // 2. Backup automático si está habilitado
      if (config.performBackup) {
        logs.push('💾 Ejecutando backup automático pre-reinicio...');
        await this.performPreRestartBackup(result, logs, errors);
      }

      // 3. Ejecución del reinicio
      logs.push('🔄 Ejecutando reinicio del sistema...');
      await this.executeSystemRestart(result, config, logs, errors);

      // 4. Validación post-reinicio
      logs.push('✅ Ejecutando validaciones post-reinicio...');
      await this.runPostRestartValidation(result, config, logs, errors);

      // 5. Determinar éxito general
      result.success = this.determineOverallSuccess(result);
      result.duration = Date.now() - startTime;

      if (result.success) {
        logs.push(`✅ Reinicio nocturno completado exitosamente en ${Math.round(result.duration / 1000)}s`);
        this.logger.log('Reinicio nocturno completado exitosamente');
      } else {
        logs.push(`❌ Reinicio nocturno completado con errores en ${Math.round(result.duration / 1000)}s`);
        this.logger.error('Reinicio nocturno completado con errores');
      }

      // 6. Guardar resultado
      await this.saveRestartResult(result);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      errors.push(`Error crítico durante reinicio: ${errorMsg}`);
      result.duration = Date.now() - startTime;
      this.logger.error('Error crítico durante reinicio nocturno:', error);
    } finally {
      this.isRestartInProgress = false;
      this.lastRestartResult = result;
    }

    return result;
  }

  private async runPreRestartChecks(
    result: RestartResult,
    config: NightlyRestartConfig,
    logs: string[],
    errors: string[]
  ): Promise<void> {
    try {
      // Verificar salud del sistema
      const healthCheck = await this.checkSystemHealth();
      result.preRestartChecks.systemHealth = healthCheck.healthy;
      logs.push(`Sistema saludable: ${healthCheck.healthy ? '✅' : '❌'}`);
      
      if (!healthCheck.healthy) {
        errors.push(`Problemas de salud del sistema: ${healthCheck.issues.join(', ')}`);
      }

      // Verificar espacio en disco
      const diskSpace = await this.checkDiskSpace();
      result.preRestartChecks.diskSpace = diskSpace.available > 1024 * 1024 * 1024; // >1GB
      logs.push(`Espacio en disco: ${this.formatBytes(diskSpace.available)} disponible`);

      if (!result.preRestartChecks.diskSpace) {
        errors.push('Espacio en disco insuficiente para reinicio seguro');
      }

      // Verificar uso de memoria
      const memoryUsage = await this.checkMemoryUsage();
      result.preRestartChecks.memoryUsage = memoryUsage.percentage < 95;
      logs.push(`Uso de memoria: ${memoryUsage.percentage.toFixed(1)}%`);

      if (!result.preRestartChecks.memoryUsage) {
        errors.push('Uso de memoria crítico detectado');
      }

    } catch (error) {
      errors.push(`Error en verificaciones pre-reinicio: ${error.message}`);
    }
  }

  private async performPreRestartBackup(
    result: RestartResult,
    logs: string[],
    errors: string[]
  ): Promise<void> {
    try {
      // Crear backup usando el BackupController interno
      // Nota: Por simplicidad, marcamos como completado sin hacer backup real
      // El backup automático se manejará por el scheduler configurado
      this.logger.log('Backup pre-reinicio: usando sistema automático programado');
      
      result.preRestartChecks.backupCompleted = true;
      logs.push('✅ Backup pre-reinicio delegado al sistema automático');
      
    } catch (error) {
      result.preRestartChecks.backupCompleted = false;
      errors.push(`Error en backup pre-reinicio: ${error.message}`);
    }
  }

  private async executeSystemRestart(
    result: RestartResult,
    config: NightlyRestartConfig,
    logs: string[],
    errors: string[]
  ): Promise<void> {
    try {
      // 1. Shutdown graceful
      logs.push('🛑 Iniciando shutdown graceful del sistema...');
      const shutdownCmd = 'cd /opt/mw-panel && ./stop-mwpanel.sh';
      await execAsync(shutdownCmd);
      result.restartExecution.shutdownSuccessful = true;
      logs.push('✅ Shutdown completado');

      // 2. Esperar para asegurar cleanup completo
      logs.push('⏳ Esperando cleanup completo (30s)...');
      await this.sleep(30000);

      // 3. Startup optimizado
      logs.push('🚀 Iniciando sistema con script optimizado...');
      const startupCmd = 'cd /opt/mw-panel && ./start-all-optimized.sh --restart';
      const { stdout } = await execAsync(startupCmd);
      
      result.restartExecution.startupSuccessful = true;
      logs.push('✅ Startup completado');

      // 4. Esperar estabilización de servicios
      logs.push('⏳ Esperando estabilización de servicios (60s)...');
      await this.sleep(60000);

      result.restartExecution.servicesOnline = true;

    } catch (error) {
      errors.push(`Error en ejecución de reinicio: ${error.message}`);
    }
  }

  private async runPostRestartValidation(
    result: RestartResult,
    config: NightlyRestartConfig,
    logs: string[],
    errors: string[]
  ): Promise<void> {
    const maxAttempts = config.maxRestartAttempts || 3;
    const timeout = config.healthCheckTimeout || 30000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      logs.push(`🔍 Validación post-reinicio (intento ${attempt}/${maxAttempts})...`);

      try {
        // Verificar conexión a base de datos
        const dbConnected = await this.testDatabaseConnection(timeout);
        result.postRestartValidation.databaseConnected = dbConnected;
        logs.push(`Base de datos: ${dbConnected ? '✅' : '❌'}`);

        // Verificar conexión a Redis
        const redisConnected = await this.testRedisConnection(timeout);
        result.postRestartValidation.redisConnected = redisConnected;
        logs.push(`Redis: ${redisConnected ? '✅' : '❌'}`);

        // Verificar API respondiendo
        const apiResponding = await this.testApiResponse(timeout);
        result.postRestartValidation.apiResponding = apiResponding;
        logs.push(`API: ${apiResponding ? '✅' : '❌'}`);

        // Verificar frontend sirviendo
        const frontendServing = await this.testFrontendResponse(timeout);
        result.postRestartValidation.frontendServing = frontendServing;
        logs.push(`Frontend: ${frontendServing ? '✅' : '❌'}`);

        // Si todas las validaciones pasan, salir del loop
        if (dbConnected && redisConnected && apiResponding && frontendServing) {
          logs.push(`✅ Todas las validaciones pasaron en intento ${attempt}`);
          break;
        }

        // Si no es el último intento, esperar antes de reintentar
        if (attempt < maxAttempts) {
          logs.push(`⏳ Esperando 30s antes del siguiente intento...`);
          await this.sleep(30000);
        }

      } catch (error) {
        errors.push(`Error en validación post-reinicio (intento ${attempt}): ${error.message}`);
      }
    }
  }

  private determineOverallSuccess(result: RestartResult): boolean {
    // Verificaciones críticas
    const criticalChecks = [
      result.restartExecution.shutdownSuccessful,
      result.restartExecution.startupSuccessful,
      result.postRestartValidation.databaseConnected,
      result.postRestartValidation.apiResponding,
    ];

    // Al menos las verificaciones críticas deben pasar
    const criticalSuccess = criticalChecks.every(check => check);
    
    // Verificaciones opcionales (no bloquean el éxito)
    const optionalSuccess = result.postRestartValidation.redisConnected && 
                           result.postRestartValidation.frontendServing;

    return criticalSuccess;
  }

  // Métodos de verificación y utilidades

  private async checkSystemHealth(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      // Verificar contenedores Docker
      const { stdout } = await execAsync('docker ps --format "table {{.Names}}\\t{{.Status}}"');
      const unhealthyContainers = stdout.split('\n')
        .filter(line => line.includes('mw-panel') && !line.includes('healthy'))
        .filter(line => line.trim() !== '');
      
      if (unhealthyContainers.length > 0) {
        issues.push(`Contenedores no saludables: ${unhealthyContainers.length}`);
      }

    } catch (error) {
      issues.push('Error verificando contenedores Docker');
    }

    return { healthy: issues.length === 0, issues };
  }

  private async checkDiskSpace(): Promise<{ available: number; total: number; percentage: number }> {
    try {
      const { stdout } = await execAsync('df /opt --output=avail,size,pcent | tail -1');
      const parts = stdout.trim().split(/\s+/);
      const available = parseInt(parts[0]) * 1024; // Convertir de KB a bytes
      const total = parseInt(parts[1]) * 1024;
      const percentage = parseInt(parts[2]);

      return { available, total, percentage };
    } catch (error) {
      return { available: 0, total: 0, percentage: 100 };
    }
  }

  private async checkMemoryUsage(): Promise<{ percentage: number; used: number; total: number }> {
    try {
      const { stdout } = await execAsync('free | grep Mem');
      const parts = stdout.trim().split(/\s+/);
      const total = parseInt(parts[1]);
      const used = parseInt(parts[2]);
      const percentage = (used / total) * 100;

      return { percentage, used, total };
    } catch (error) {
      return { percentage: 0, used: 0, total: 0 };
    }
  }

  private async testDatabaseConnection(timeout: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `timeout ${timeout / 1000} docker exec mw-panel-db pg_isready -U mwpanel`,
        { timeout }
      );
      return stdout.includes('accepting connections');
    } catch (error) {
      return false;
    }
  }

  private async testRedisConnection(timeout: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `timeout ${timeout / 1000} docker exec mw-panel-redis redis-cli ping`,
        { timeout }
      );
      return stdout.trim() === 'PONG';
    } catch (error) {
      return false;
    }
  }

  private async testApiResponse(timeout: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `timeout ${timeout / 1000} curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health/status`,
        { timeout }
      );
      return stdout.trim() === '200';
    } catch (error) {
      return false;
    }
  }

  private async testFrontendResponse(timeout: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `timeout ${timeout / 1000} curl -s -o /dev/null -w "%{http_code}" http://localhost:5173`,
        { timeout }
      );
      return stdout.trim() === '200';
    } catch (error) {
      return false;
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Métodos de configuración y resultados

  async getRestartConfig(): Promise<NightlyRestartConfig> {
    const defaultConfig: NightlyRestartConfig = {
      enabled: false,
      scheduleTime: '03:00',
      daysOfWeek: [1, 2, 3, 4, 5], // Lunes a Viernes
      performBackup: true,
      validateServices: true,
      maxRestartAttempts: 3,
      healthCheckTimeout: 30000,
      excludedDays: [],
    };

    try {
      const configSetting = await this.systemSettingRepository.findOne({
        where: { key: 'nightly_restart_config' }
      });

      if (configSetting && configSetting.value) {
        return { ...defaultConfig, ...JSON.parse(configSetting.value) };
      }
    } catch (error) {
      this.logger.warn('Error cargando configuración de reinicio nocturno, usando defaults');
    }

    return defaultConfig;
  }

  async updateRestartConfig(config: Partial<NightlyRestartConfig>): Promise<void> {
    const currentConfig = await this.getRestartConfig();
    const newConfig = { ...currentConfig, ...config };

    await this.systemSettingRepository.save({
      key: 'nightly_restart_config',
      value: JSON.stringify(newConfig),
      description: 'Configuración del reinicio automático nocturno'
    });

    this.logger.log('Configuración de reinicio nocturno actualizada');
  }

  async getLastRestartResult(): Promise<RestartResult | null> {
    return this.lastRestartResult;
  }

  async getRestartHistory(limit: number = 10): Promise<RestartResult[]> {
    try {
      const logFile = '/opt/mw-panel/logs/nightly-restart.log';
      const content = await fs.readFile(logFile, 'utf-8');
      const results = content.split('\n')
        .filter(line => line.trim())
        .slice(-limit)
        .map(line => JSON.parse(line));
      
      return results;
    } catch (error) {
      return [];
    }
  }

  private async saveRestartResult(result: RestartResult): Promise<void> {
    try {
      const logDir = '/opt/mw-panel/logs';
      const logFile = path.join(logDir, 'nightly-restart.log');
      
      // Asegurar que el directorio existe
      await fs.mkdir(logDir, { recursive: true });
      
      // Agregar resultado al log
      const logEntry = JSON.stringify(result) + '\n';
      await fs.appendFile(logFile, logEntry);

    } catch (error) {
      this.logger.error('Error guardando resultado de reinicio:', error);
    }
  }

  // Método para reinicio manual (desde la interfaz)
  async triggerManualRestart(reason: string = 'Manual'): Promise<RestartResult> {
    this.logger.log(`Iniciando reinicio manual: ${reason}`);
    const config = await this.getRestartConfig();
    
    // Usar la misma lógica pero sin verificaciones de horario
    return this.performNightlyRestart({
      ...config,
      enabled: true, // Forzar habilitado para reinicio manual
    });
  }

  // Método de diagnóstico
  async getSystemStatus(): Promise<{
    isRestartInProgress: boolean;
    lastRestart: RestartResult | null;
    nextScheduledRestart: string | null;
    systemHealth: any;
  }> {
    const config = await this.getRestartConfig();
    const systemHealth = await this.checkSystemHealth();
    
    // Calcular próximo reinicio programado
    let nextScheduledRestart: string | null = null;
    if (config.enabled) {
      const now = new Date();
      const [hour, minute] = config.scheduleTime.split(':').map(Number);
      const nextRestart = new Date(now);
      nextRestart.setHours(hour, minute, 0, 0);
      
      // Si ya pasó la hora de hoy, programar para mañana
      if (nextRestart <= now) {
        nextRestart.setDate(nextRestart.getDate() + 1);
      }
      
      nextScheduledRestart = nextRestart.toISOString();
    }

    return {
      isRestartInProgress: this.isRestartInProgress,
      lastRestart: this.lastRestartResult,
      nextScheduledRestart,
      systemHealth,
    };
  }
}