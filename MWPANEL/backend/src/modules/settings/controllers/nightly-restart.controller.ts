import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { 
  NightlyRestartService, 
  NightlyRestartConfig, 
  RestartResult 
} from '../services/nightly-restart.service';
import { IsOptional, IsBoolean, IsString, IsArray, IsNumber } from 'class-validator';

class UpdateNightlyRestartConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  scheduleTime?: string; // Formato: "HH:mm"

  @IsOptional()
  @IsArray()
  daysOfWeek?: number[]; // 0-6 (0=Domingo)

  @IsOptional()
  @IsBoolean()
  performBackup?: boolean;

  @IsOptional()
  @IsBoolean()
  validateServices?: boolean;

  @IsOptional()
  @IsNumber()
  maxRestartAttempts?: number;

  @IsOptional()
  @IsNumber()
  healthCheckTimeout?: number;

  @IsOptional()
  @IsArray()
  excludedDays?: string[]; // Fechas YYYY-MM-DD
}

class TriggerManualRestartDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

interface SystemStatusResponse {
  isRestartInProgress: boolean;
  lastRestart: RestartResult | null;
  nextScheduledRestart: string | null;
  systemHealth: {
    healthy: boolean;
    issues: string[];
  };
  config: NightlyRestartConfig;
}

interface RestartHistoryResponse {
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

@ApiTags('Nightly Restart Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('settings/nightly-restart')
export class NightlyRestartController {
  constructor(private readonly nightlyRestartService: NightlyRestartService) {}

  @Get('config')
  @ApiOperation({ summary: 'Obtener configuración del reinicio nocturno' })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuración obtenida exitosamente',
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        scheduleTime: { type: 'string', example: '03:00' },
        daysOfWeek: { 
          type: 'array', 
          items: { type: 'number' },
          example: [1, 2, 3, 4, 5]
        },
        performBackup: { type: 'boolean' },
        validateServices: { type: 'boolean' },
        maxRestartAttempts: { type: 'number' },
        healthCheckTimeout: { type: 'number' },
        excludedDays: {
          type: 'array',
          items: { type: 'string' },
          example: ['2025-12-25', '2025-01-01']
        }
      }
    }
  })
  async getRestartConfig(): Promise<NightlyRestartConfig> {
    try {
      return await this.nightlyRestartService.getRestartConfig();
    } catch (error) {
      throw new HttpException(
        'Error al obtener configuración de reinicio nocturno',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('config')
  @ApiOperation({ summary: 'Actualizar configuración del reinicio nocturno' })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuración actualizada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        config: { type: 'object' }
      }
    }
  })
  async updateRestartConfig(
    @Body() updateDto: UpdateNightlyRestartConfigDto
  ): Promise<{ success: boolean; message: string; config: NightlyRestartConfig }> {
    try {
      // Validar formato de hora
      if (updateDto.scheduleTime) {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(updateDto.scheduleTime)) {
          throw new HttpException(
            'Formato de hora inválido. Use HH:mm (ej: 03:00)',
            HttpStatus.BAD_REQUEST
          );
        }
      }

      // Validar días de la semana
      if (updateDto.daysOfWeek) {
        const validDays = updateDto.daysOfWeek.every(day => day >= 0 && day <= 6);
        if (!validDays) {
          throw new HttpException(
            'Días de la semana inválidos. Use 0-6 (0=Domingo)',
            HttpStatus.BAD_REQUEST
          );
        }
      }

      // Validar fechas excluidas
      if (updateDto.excludedDays) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const validDates = updateDto.excludedDays.every(date => dateRegex.test(date));
        if (!validDates) {
          throw new HttpException(
            'Formato de fechas excluidas inválido. Use YYYY-MM-DD',
            HttpStatus.BAD_REQUEST
          );
        }
      }

      await this.nightlyRestartService.updateRestartConfig(updateDto);
      const updatedConfig = await this.nightlyRestartService.getRestartConfig();

      return {
        success: true,
        message: 'Configuración de reinicio nocturno actualizada exitosamente',
        config: updatedConfig
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al actualizar configuración de reinicio nocturno',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Obtener estado actual del sistema de reinicio' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estado obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        isRestartInProgress: { type: 'boolean' },
        lastRestart: { 
          type: 'object',
          nullable: true,
          properties: {
            success: { type: 'boolean' },
            timestamp: { type: 'string' },
            duration: { type: 'number' },
            logs: { type: 'array', items: { type: 'string' } },
            errors: { type: 'array', items: { type: 'string' } }
          }
        },
        nextScheduledRestart: { type: 'string', nullable: true },
        systemHealth: {
          type: 'object',
          properties: {
            healthy: { type: 'boolean' },
            issues: { type: 'array', items: { type: 'string' } }
          }
        },
        config: { type: 'object' }
      }
    }
  })
  async getSystemStatus(): Promise<SystemStatusResponse> {
    try {
      const status = await this.nightlyRestartService.getSystemStatus();
      const config = await this.nightlyRestartService.getRestartConfig();

      return {
        ...status,
        config
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener estado del sistema',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('trigger')
  @ApiOperation({ summary: 'Ejecutar reinicio manual del sistema' })
  @ApiResponse({ 
    status: 200, 
    description: 'Reinicio iniciado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        timestamp: { type: 'string' },
        duration: { type: 'number' },
        preRestartChecks: { type: 'object' },
        restartExecution: { type: 'object' },
        postRestartValidation: { type: 'object' },
        logs: { type: 'array', items: { type: 'string' } },
        errors: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  async triggerManualRestart(
    @Body() triggerDto: TriggerManualRestartDto
  ): Promise<RestartResult> {
    try {
      const reason = triggerDto.reason || 'Reinicio manual desde panel de administración';
      return await this.nightlyRestartService.triggerManualRestart(reason);
    } catch (error) {
      throw new HttpException(
        'Error al ejecutar reinicio manual',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('history')
  @ApiOperation({ summary: 'Obtener historial de reinicios' })
  @ApiResponse({ 
    status: 200, 
    description: 'Historial obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        history: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              timestamp: { type: 'string' },
              duration: { type: 'number' },
              logs: { type: 'array', items: { type: 'string' } },
              errors: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        summary: {
          type: 'object',
          properties: {
            totalRestarts: { type: 'number' },
            successfulRestarts: { type: 'number' },
            failedRestarts: { type: 'number' },
            averageDuration: { type: 'number' },
            lastSuccessful: { type: 'string', nullable: true },
            lastFailed: { type: 'string', nullable: true }
          }
        }
      }
    }
  })
  async getRestartHistory(
    @Query('limit') limit: string = '10'
  ): Promise<RestartHistoryResponse> {
    try {
      const limitNum = parseInt(limit) || 10;
      const history = await this.nightlyRestartService.getRestartHistory(limitNum);

      // Calcular resumen
      const totalRestarts = history.length;
      const successfulRestarts = history.filter(r => r.success).length;
      const failedRestarts = totalRestarts - successfulRestarts;
      const averageDuration = totalRestarts > 0 
        ? history.reduce((sum, r) => sum + r.duration, 0) / totalRestarts 
        : 0;

      const lastSuccessful = history
        .filter(r => r.success)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.timestamp || null;

      const lastFailed = history
        .filter(r => !r.success)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.timestamp || null;

      return {
        history,
        summary: {
          totalRestarts,
          successfulRestarts,
          failedRestarts,
          averageDuration: Math.round(averageDuration),
          lastSuccessful,
          lastFailed
        }
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener historial de reinicios',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('test-checks')
  @ApiOperation({ summary: 'Ejecutar verificaciones de sistema sin reiniciar' })
  @ApiResponse({ 
    status: 200, 
    description: 'Verificaciones completadas',
    schema: {
      type: 'object',
      properties: {
        systemHealth: {
          type: 'object',
          properties: {
            healthy: { type: 'boolean' },
            issues: { type: 'array', items: { type: 'string' } }
          }
        },
        diskSpace: {
          type: 'object',
          properties: {
            available: { type: 'number' },
            total: { type: 'number' },
            percentage: { type: 'number' }
          }
        },
        memoryUsage: {
          type: 'object',
          properties: {
            percentage: { type: 'number' },
            used: { type: 'number' },
            total: { type: 'number' }
          }
        },
        services: {
          type: 'object',
          properties: {
            database: { type: 'boolean' },
            redis: { type: 'boolean' },
            api: { type: 'boolean' },
            frontend: { type: 'boolean' }
          }
        },
        recommendations: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  async testSystemChecks(): Promise<{
    systemHealth: any;
    diskSpace: any;
    memoryUsage: any;
    services: any;
    recommendations: string[];
  }> {
    try {
      // Usar métodos internos del servicio para hacer las verificaciones
      const service = this.nightlyRestartService as any;
      
      const systemHealth = await service.checkSystemHealth();
      const diskSpace = await service.checkDiskSpace();
      const memoryUsage = await service.checkMemoryUsage();

      // Verificar servicios
      const services = {
        database: await service.testDatabaseConnection(10000),
        redis: await service.testRedisConnection(10000),
        api: await service.testApiResponse(10000),
        frontend: await service.testFrontendResponse(10000)
      };

      // Generar recomendaciones
      const recommendations: string[] = [];
      
      if (!systemHealth.healthy) {
        recommendations.push('🔴 Problemas de salud del sistema detectados');
      }
      
      if (diskSpace.percentage > 80) {
        recommendations.push('🟡 Uso de disco alto - considerar limpieza');
      }
      
      if (memoryUsage.percentage > 85) {
        recommendations.push('🟡 Uso de memoria alto - revisar procesos');
      }

      const offlineServices = Object.entries(services)
        .filter(([_, isOnline]) => !isOnline)
        .map(([name, _]) => name);
      
      if (offlineServices.length > 0) {
        recommendations.push(`🔴 Servicios no disponibles: ${offlineServices.join(', ')}`);
      }

      if (recommendations.length === 0) {
        recommendations.push('✅ Sistema en estado óptimo para reinicio');
      }

      return {
        systemHealth,
        diskSpace,
        memoryUsage,
        services,
        recommendations
      };

    } catch (error) {
      throw new HttpException(
        'Error al ejecutar verificaciones del sistema',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('disable-for-date')
  @ApiOperation({ summary: 'Deshabilitar reinicio para una fecha específica' })
  @ApiResponse({ 
    status: 200, 
    description: 'Fecha excluida exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        excludedDate: { type: 'string' }
      }
    }
  })
  async disableRestartForDate(
    @Body('date') date: string
  ): Promise<{ success: boolean; message: string; excludedDate: string }> {
    try {
      // Validar formato de fecha
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        throw new HttpException(
          'Formato de fecha inválido. Use YYYY-MM-DD',
          HttpStatus.BAD_REQUEST
        );
      }

      const config = await this.nightlyRestartService.getRestartConfig();
      const excludedDays = [...config.excludedDays];
      
      if (!excludedDays.includes(date)) {
        excludedDays.push(date);
        await this.nightlyRestartService.updateRestartConfig({ excludedDays });
      }

      return {
        success: true,
        message: `Reinicio deshabilitado para la fecha ${date}`,
        excludedDate: date
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al deshabilitar reinicio para fecha',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}