import {
  Controller,
  Post,
  Get,
  Body,
  Query,
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
import { RestoreService, RestoreOptions } from '../services/restore.service';
import { RestoreBackupDto, BackupListQueryDto } from '../dto/backup-drive.dto';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BackupRecord, BackupStatus } from '../entities/backup-record.entity';
import { GoogleDriveService } from '../../educational-resources/services/google-drive.service';

interface RestoreTokenResponse {
  token: string;
  expiresIn: number;
  sessionId: string;
}

interface RestoreInitiationResponse {
  success: boolean;
  sessionId: string;
  message: string;
  estimatedDuration?: number;
}

@ApiTags('Restore')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('settings/restore')
export class RestoreController {
  constructor(
    private readonly restoreService: RestoreService,
    @InjectRepository(BackupRecord)
    private readonly backupRepository: Repository<BackupRecord>,
    private readonly googleDriveService: GoogleDriveService
  ) {}

  @Post('token')
  @ApiOperation({ summary: 'Generar token de confirmación para restauración' })
  @ApiResponse({ status: 200, description: 'Token generado exitosamente' })
  async generateRestoreToken(@Req() req: Request): Promise<RestoreTokenResponse> {
    try {
      const user = req.user as any;
      const sessionId = uuidv4();
      const token = await this.restoreService.generateRestoreToken(user.sub);

      return {
        token,
        expiresIn: 300, // 5 minutes
        sessionId
      };
    } catch (error) {
      throw new HttpException(
        'Error al generar token de restauración',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('initiate')
  @ApiOperation({ summary: 'Iniciar proceso de restauración' })
  @ApiResponse({ status: 200, description: 'Restauración iniciada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de restauración inválidos' })
  @ApiResponse({ status: 403, description: 'Token de confirmación inválido' })
  async initiateRestore(
    @Body() restoreDto: RestoreBackupDto,
    @Req() req: Request
  ): Promise<RestoreInitiationResponse> {
    try {
      const user = req.user as any;

      // Validate confirmation token
      if (!restoreDto.confirmationToken) {
        throw new HttpException(
          'Token de confirmación requerido',
          HttpStatus.BAD_REQUEST
        );
      }

      const isValidToken = await this.restoreService.validateRestoreToken(
        restoreDto.confirmationToken,
        user.sub
      );

      if (!isValidToken) {
        throw new HttpException(
          'Token de confirmación inválido o expirado',
          HttpStatus.FORBIDDEN
        );
      }

      // Validate backup source
      if (!restoreDto.backupId && !restoreDto.driveFileId && !restoreDto.localFilePath) {
        throw new HttpException(
          'Debe especificar una fuente de backup',
          HttpStatus.BAD_REQUEST
        );
      }

      // Generate session ID if not provided
      const sessionId = uuidv4();

      // Prepare restore options
      const restoreOptions: RestoreOptions = {
        ...restoreDto,
        sessionId,
        userId: user.sub,
        createPreRestoreBackup: restoreDto.createPreRestoreBackup ?? true,
        skipDataValidation: restoreDto.skipDataValidation ?? false,
      };

      // Start restore process asynchronously
      this.executeRestoreAsync(restoreOptions);

      return {
        success: true,
        sessionId,
        message: 'Proceso de restauración iniciado',
        estimatedDuration: this.estimateRestoreDuration(restoreOptions)
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Error al iniciar restauración: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('backups')
  @ApiOperation({ summary: 'Obtener lista de backups disponibles para restauración' })
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
              localPath: { type: 'string' },
              restorable: { type: 'boolean' }
            }
          }
        },
        total: { type: 'number' }
      }
    }
  })
  async getAvailableBackupsForRestore(@Query('limit') limit: string = '5') {
    try {
      // Always limit to 5 most recent backups for restore interface
      const limitNum = Math.min(parseInt(limit) || 5, 5);
      
      // Get backups from Google Drive in real-time (limited to 5)
      const driveBackups = await this.googleDriveService.getBackupsList();
      
      // Format for restore interface
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
        duration: null, // Not tracked for Google Drive backups
        checksum: null, // Not tracked for Google Drive backups
        restorable: true // All Google Drive backups are restorable
      }));

      return {
        backups: formattedBackups,
        total: formattedBackups.length,
        source: 'google-drive',
        maxBackups: 5,
        message: 'Showing 5 most recent backups from Google Drive'
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener lista de backups para restauración',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  @Get('history')
  @ApiOperation({ summary: 'Obtener historial de restauraciones' })
  @ApiResponse({ status: 200, description: 'Historial obtenido exitosamente' })
  async getRestoreHistory(@Query() queryDto: BackupListQueryDto) {
    try {
      const limit = queryDto.limit || 50;
      const history = await this.restoreService.getRestoreHistory(limit);

      return {
        history: history.map(record => record.toJSON()),
        total: history.length
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener historial de restauraciones',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('status/:sessionId')
  @ApiOperation({ summary: 'Obtener estado de restauración por sesión' })
  @ApiResponse({ status: 200, description: 'Estado obtenido exitosamente' })
  async getRestoreStatus(@Query('sessionId') sessionId: string) {
    try {
      // This would typically check active sessions
      // For now, return basic info
      return {
        sessionId,
        status: 'active', // This should be retrieved from actual session store
        message: 'Restauración en progreso'
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener estado de restauración',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('cancel/:sessionId')
  @ApiOperation({ summary: 'Cancelar restauración en progreso' })
  @ApiResponse({ status: 200, description: 'Restauración cancelada exitosamente' })
  async cancelRestore(@Query('sessionId') sessionId: string) {
    try {
      // Implementation would depend on how restore process is managed
      // This is a placeholder for the cancellation logic
      
      return {
        success: true,
        sessionId,
        message: 'Solicitud de cancelación enviada'
      };
    } catch (error) {
      throw new HttpException(
        'Error al cancelar restauración',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('estimates')
  @ApiOperation({ summary: 'Obtener estimaciones de tiempo de restauración' })
  @ApiResponse({ status: 200, description: 'Estimaciones obtenidas exitosamente' })
  async getRestoreEstimates() {
    try {
      return {
        averageRestoreTime: 120, // seconds
        estimatedTimeBySize: {
          small: 60,   // < 100MB
          medium: 120, // 100MB - 1GB
          large: 300,  // > 1GB
        },
        factors: [
          'Tamaño del backup',
          'Velocidad del disco',
          'Carga del sistema',
          'Verificación de integridad'
        ]
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener estimaciones',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Private helper methods

  private async executeRestoreAsync(options: RestoreOptions): Promise<void> {
    try {
      await this.restoreService.executeRestore(options);
    } catch (error) {
      // Error handling is done within the restore service
      // This just ensures the async operation doesn't crash the main thread
      console.error('Async restore execution failed:', error);
    }
  }

  private estimateRestoreDuration(options: RestoreOptions): number {
    // Basic estimation logic - in a real implementation, this would be more sophisticated
    let baseTime = 120; // 2 minutes base
    
    if (options.createPreRestoreBackup) {
      baseTime += 30; // Additional 30 seconds for pre-backup
    }
    
    if (!options.skipDataValidation) {
      baseTime += 20; // Additional 20 seconds for validation
    }
    
    if (options.driveFileId) {
      baseTime += 30; // Additional 30 seconds for download
    }
    
    return baseTime;
  }
}