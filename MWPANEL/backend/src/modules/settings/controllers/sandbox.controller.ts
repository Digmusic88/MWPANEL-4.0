import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { SandboxService, SandboxTestOptions, SandboxTestResult } from '../services/sandbox.service';
import { IsString, IsOptional, IsIn } from 'class-validator';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BackupRecord, BackupStatus } from '../entities/backup-record.entity';
import { GoogleDriveService } from '../../educational-resources/services/google-drive.service';

class SandboxTestDto {
  @IsOptional()
  @IsString()
  backupId?: string;

  @IsOptional()
  @IsString()
  driveFileId?: string;

  @IsOptional()
  @IsString()
  localFilePath?: string;

  @IsIn(['integrity', 'restoration', 'compatibility', 'full'])
  testType: 'integrity' | 'restoration' | 'compatibility' | 'full';
}

interface SandboxTestResponse {
  success: boolean;
  sessionId: string;
  message: string;
  testType: string;
}

interface SandboxStatusResponse {
  sessionId: string;
  status: string;
  progress: number;
  message: string;
  result?: any;
  error?: string;
}

@ApiTags('Sandbox Testing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('settings/sandbox')
export class SandboxController {
  private readonly sessionCacheDir = '/tmp/sandbox-sessions';

  constructor(
    private readonly sandboxService: SandboxService,
    @InjectRepository(BackupRecord)
    private readonly backupRepository: Repository<BackupRecord>,
    private readonly googleDriveService: GoogleDriveService
  ) {
    // Ensure cache directory exists
    const fs = require('fs');
    if (!fs.existsSync(this.sessionCacheDir)) {
      fs.mkdirSync(this.sessionCacheDir, { recursive: true });
    }
  }

  private setSessionData(sessionId: string, data: any): void {
    const fs = require('fs');
    const sessionFile = `${this.sessionCacheDir}/${sessionId}.json`;
    fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2));
  }

  private getSessionData(sessionId: string): any | null {
    const fs = require('fs');
    const sessionFile = `${this.sessionCacheDir}/${sessionId}.json`;
    try {
      if (fs.existsSync(sessionFile)) {
        const data = fs.readFileSync(sessionFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error reading session file:', error);
    }
    return null;
  }

  @Post('test')
  @ApiOperation({ summary: 'Ejecutar prueba de sandbox en backup' })
  @ApiResponse({ 
    status: 200, 
    description: 'Prueba de sandbox iniciada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        sessionId: { type: 'string' },
        message: { type: 'string' },
        testType: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Parámetros de prueba inválidos' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async runSandboxTest(@Body() testDto: SandboxTestDto, @Req() req: Request): Promise<SandboxTestResponse> {
    try {
      const user = req.user as any;
      const sessionId = uuidv4();

      // Validate input
      if (!testDto.backupId && !testDto.driveFileId && !testDto.localFilePath) {
        throw new HttpException(
          'Debe especificar una fuente de backup (backupId, driveFileId, o localFilePath)',
          HttpStatus.BAD_REQUEST
        );
      }

      const options: SandboxTestOptions = {
        ...testDto,
        sessionId,
        userId: user.sub
      };

      // Initialize session tracking
      this.setSessionData(sessionId, {
        status: 'starting',
        progress: 0,
        message: 'Iniciando pruebas de sandbox...',
        startTime: new Date().toISOString(),
        testType: testDto.testType
      });

      // Start sandbox test asynchronously and track results
      this.sandboxService.runSandboxTest(options)
        .then(result => {
          this.setSessionData(sessionId, {
            status: 'completed',
            progress: 100,
            message: 'Pruebas completadas',
            result,
            completedAt: new Date().toISOString()
          });
        })
        .catch(error => {
          console.error('Sandbox test error:', error);
          this.setSessionData(sessionId, {
            status: 'failed',
            progress: 0,
            message: error.message || 'Error en las pruebas',
            error: error.message,
            failedAt: new Date().toISOString()
          });
        });

      return {
        success: true,
        sessionId,
        message: 'Prueba de sandbox iniciada exitosamente',
        testType: testDto.testType
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al iniciar prueba de sandbox',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('status/:sessionId')
  @ApiOperation({ summary: 'Obtener estado de prueba de sandbox' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estado de la prueba obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        status: { type: 'string' },
        progress: { type: 'number' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Sesión de prueba no encontrada' })
  async getSandboxStatus(@Param('sessionId') sessionId: string): Promise<SandboxStatusResponse> {
    try {
      const sessionData = this.getSessionData(sessionId);
      
      if (!sessionData) {
        return {
          sessionId,
          status: 'not_found',
          progress: 0,
          message: 'Sesión no encontrada'
        };
      }

      // Calculate progress based on elapsed time for in-progress tests
      let progress = sessionData.progress;
      if (sessionData.status === 'starting' || sessionData.status === 'in_progress') {
        const elapsed = Date.now() - new Date(sessionData.startTime).getTime();
        const estimatedDuration = 30000; // 30 seconds estimated
        progress = Math.min(90, Math.floor((elapsed / estimatedDuration) * 90)); // Max 90% until complete
      }

      return {
        sessionId,
        status: sessionData.status,
        progress,
        message: sessionData.message,
        result: sessionData.result,
        error: sessionData.error
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener estado de prueba',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('types')
  @ApiOperation({ summary: 'Obtener tipos de prueba disponibles' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tipos de prueba obtenidos exitosamente',
    schema: {
      type: 'object',
      properties: {
        types: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              duration: { type: 'string' },
              tests: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    }
  })
  async getTestTypes() {
    return {
      types: [
        {
          id: 'integrity',
          name: 'Prueba de Integridad',
          description: 'Verifica la integridad del archivo de backup',
          duration: '1-2 minutos',
          tests: [
            'Validación de archivo',
            'Verificación de compresión',
            'Análisis de sintaxis SQL',
            'Verificación de encoding'
          ]
        },
        {
          id: 'restoration',
          name: 'Prueba de Restauración',
          description: 'Simula el proceso completo de restauración',
          duration: '3-5 minutos',
          tests: [
            'Creación de base de datos sandbox',
            'Restauración de datos',
            'Conteo de tablas y registros',
            'Verificación de estructura'
          ]
        },
        {
          id: 'compatibility',
          name: 'Prueba de Compatibilidad',
          description: 'Verifica compatibilidad con la versión actual',
          duration: '2-3 minutos',
          tests: [
            'Comparación de versiones',
            'Análisis de migraciones',
            'Detección de cambios críticos',
            'Validación de esquema'
          ]
        },
        {
          id: 'full',
          name: 'Prueba Completa',
          description: 'Ejecuta todas las pruebas disponibles',
          duration: '5-10 minutos',
          tests: [
            'Prueba de integridad',
            'Prueba de restauración',
            'Prueba de compatibilidad',
            'Validación de datos',
            'Análisis de riesgos',
            'Generación de recomendaciones'
          ]
        }
      ]
    };
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Obtener recomendaciones generales de sandbox' })
  @ApiResponse({ 
    status: 200, 
    description: 'Recomendaciones obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'string' }
            }
          }
        }
      }
    }
  })
  async getGeneralRecommendations() {
    return {
      recommendations: [
        {
          category: 'Preparación',
          title: 'Backup de Seguridad',
          description: 'Siempre crear un backup de seguridad antes de cualquier restauración',
          priority: 'critical'
        },
        {
          category: 'Timing',
          title: 'Horario de Baja Actividad',
          description: 'Programar restauraciones durante horarios de menor tráfico',
          priority: 'high'
        },
        {
          category: 'Testing',
          title: 'Pruebas Completas',
          description: 'Ejecutar pruebas completas en backups antiguos o de fuentes externas',
          priority: 'high'
        },
        {
          category: 'Monitoreo',
          title: 'Supervisión Activa',
          description: 'Monitorear el proceso de restauración y validar resultados',
          priority: 'medium'
        },
        {
          category: 'Documentación',
          title: 'Registro de Cambios',
          description: 'Documentar todos los cambios y resultados de las pruebas',
          priority: 'medium'
        }
      ]
    };
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Limpiar entorno de sandbox' })
  @ApiResponse({ 
    status: 200, 
    description: 'Sandbox limpiado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  async cleanupSandbox(): Promise<{ success: boolean; message: string }> {
    try {
      await this.sandboxService.cleanupSandbox();
      return {
        success: true,
        message: 'Entorno de sandbox limpiado exitosamente'
      };
    } catch (error) {
      throw new HttpException(
        'Error al limpiar sandbox',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('backups')
  @ApiOperation({ summary: 'Obtener lista de backups disponibles para testing' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de backups obtenida exitosamente',
    schema: {
      type: 'object',
      properties: {
        backups: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              filename: { type: 'string' },
              type: { type: 'string' },
              status: { type: 'string' },
              formattedSize: { type: 'string' },
              createdAt: { type: 'string' },
              driveFileId: { type: 'string' },
              localPath: { type: 'string' }
            }
          }
        },
        total: { type: 'number' }
      }
    }
  })
  async getAvailableBackups(@Query('limit') limit: string = '5') {
    try {
      // Always limit to 5 most recent backups for sandbox testing
      const limitNum = Math.min(parseInt(limit) || 5, 5);
      
      // Get backups from Google Drive in real-time (limited to 5)
      const driveBackups = await this.googleDriveService.getBackupsList();
      
      // Format for sandbox interface
      const formattedBackups = driveBackups.slice(0, limitNum).map((backup, index) => ({
        id: backup.driveFileId, // Use drive file ID as unique identifier
        filename: backup.name,
        type: backup.name.includes('.tar.gz') ? 'full' : 'database',
        status: 'COMPLETED', // Google Drive backups are always completed
        formattedSize: this.formatBytes(parseInt(backup.size) || 0),
        createdAt: backup.createdTime,
        driveFileId: backup.driveFileId,
        localPath: null, // Google Drive backups don't have local paths
        hasLocalFile: false,
        hasDriveFile: true,
        testable: true // All Google Drive backups are testable
      }));

      return {
        backups: formattedBackups,
        total: formattedBackups.length,
        source: 'google-drive',
        maxBackups: 5,
        message: 'Showing 5 most recent backups from Google Drive for testing'
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener lista de backups',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('history')
  @ApiOperation({ summary: 'Obtener historial de pruebas de sandbox' })
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
              sessionId: { type: 'string' },
              testType: { type: 'string' },
              status: { type: 'string' },
              timestamp: { type: 'string' },
              duration: { type: 'number' },
              riskLevel: { type: 'string' }
            }
          }
        },
        total: { type: 'number' }
      }
    }
  })
  async getSandboxHistory(@Query('limit') limit: string = '50') {
    // This would be implemented with actual database storage
    // For now, return mock data
    return {
      history: [
        {
          sessionId: 'test-session-1',
          testType: 'full',
          status: 'passed',
          timestamp: new Date().toISOString(),
          duration: 300000,
          riskLevel: 'low'
        }
      ],
      total: 1
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}