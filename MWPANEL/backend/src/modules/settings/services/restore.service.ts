import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BackupRecord, BackupType, BackupStatus as BackupRecordStatus } from '../entities/backup-record.entity';
import { GoogleDriveService } from '../../educational-resources/services/google-drive.service';
import { RestoreProgressGateway, RestoreProgressEvent } from '../gateways/restore-progress.gateway';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export interface RestoreOptions {
  backupId?: string;
  driveFileId?: string;
  localFilePath?: string;
  createPreRestoreBackup?: boolean;
  skipDataValidation?: boolean;
  restoreToDatabase?: string;
  confirmationToken?: string;
  sessionId: string;
  userId: string;
}

export interface RestoreResult {
  success: boolean;
  sessionId: string;
  message: string;
  backupCreated?: string;
  restoredFrom: string;
  duration: number;
  error?: string;
  logs?: string[];
}

export interface RestoreStep {
  name: string;
  description: string;
  weight: number; // Percentage of total progress
}

@Injectable()
export class RestoreService {
  private readonly logger = new Logger(RestoreService.name);
  private readonly backupDir = '/opt/mw-panel/backups';
  private readonly tempDir = '/tmp/mw-panel-restore';
  
  private readonly restoreSteps: RestoreStep[] = [
    { name: 'validation', description: 'Validando archivo de backup', weight: 10 },
    { name: 'pre_backup', description: 'Creando backup de seguridad', weight: 20 },
    { name: 'preparation', description: 'Preparando sistema para restauración', weight: 5 },
    { name: 'stop_services', description: 'Deteniendo servicios', weight: 10 },
    { name: 'restore_database', description: 'Restaurando base de datos', weight: 40 },
    { name: 'start_services', description: 'Reiniciando servicios', weight: 10 },
    { name: 'verification', description: 'Verificando integridad de datos', weight: 5 }
  ];

  constructor(
    @InjectRepository(BackupRecord)
    private readonly backupRepository: Repository<BackupRecord>,
    private readonly googleDriveService: GoogleDriveService,
    private readonly progressGateway: RestoreProgressGateway,
  ) {
    this.initializeTempDir();
  }

  private async initializeTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create temp directory:', error);
    }
  }

  async executeRestore(options: RestoreOptions): Promise<RestoreResult> {
    const startTime = Date.now();
    const { sessionId } = options;
    let logs: string[] = [];
    let currentProgress = 0;

    try {
      this.logger.log(`Starting restore process for session ${sessionId}`);
      
      // Emit initial status
      this.progressGateway.emitStatus(sessionId, {
        sessionId,
        status: 'starting',
        data: { options }
      });

      // Step 1: Validation (10%)
      currentProgress = await this.executeStep(
        sessionId, 
        'validation', 
        currentProgress, 
        async () => {
          const backupFile = await this.validateAndPrepareBackup(options);
          logs.push(`Backup file validated: ${backupFile}`);
          return { backupFile };
        }
      );

      const { backupFile } = currentProgress as any;

      // Step 2: Pre-backup creation (20%)
      let preBackupFile: string | undefined;
      if (options.createPreRestoreBackup !== false) {
        currentProgress = await this.executeStep(
          sessionId,
          'pre_backup',
          currentProgress,
          async () => {
            preBackupFile = await this.createPreRestoreBackup(sessionId);
            logs.push(`Pre-restore backup created: ${preBackupFile}`);
            return { preBackupFile };
          }
        );
      }

      // Step 3: Preparation (5%)
      currentProgress = await this.executeStep(
        sessionId,
        'preparation',
        currentProgress,
        async () => {
          await this.prepareForRestore(sessionId);
          logs.push('System prepared for restoration');
          return {};
        }
      );

      // Step 4: Stop services (10%)
      currentProgress = await this.executeStep(
        sessionId,
        'stop_services',
        currentProgress,
        async () => {
          await this.stopServices(sessionId);
          logs.push('Services stopped successfully');
          return {};
        }
      );

      // Step 5: Restore database (40%)
      currentProgress = await this.executeStep(
        sessionId,
        'restore_database',
        currentProgress,
        async () => {
          await this.restoreDatabase(backupFile, sessionId, options.restoreToDatabase);
          logs.push(`Database restored from: ${backupFile}`);
          return {};
        }
      );

      // Step 6: Start services (10%)
      currentProgress = await this.executeStep(
        sessionId,
        'start_services',
        currentProgress,
        async () => {
          await this.startServices(sessionId);
          logs.push('Services restarted successfully');
          return {};
        }
      );

      // Step 7: Verification (5%)
      currentProgress = await this.executeStep(
        sessionId,
        'verification',
        currentProgress,
        async () => {
          if (!options.skipDataValidation) {
            await this.verifyRestoration(sessionId);
            logs.push('Data integrity verification completed');
          }
          return {};
        }
      );

      // Complete
      const duration = Date.now() - startTime;
      const result: RestoreResult = {
        success: true,
        sessionId,
        message: 'Restauración completada exitosamente',
        backupCreated: preBackupFile,
        restoredFrom: backupFile,
        duration,
        logs
      };

      this.progressGateway.emitCompletion(sessionId, result);
      this.logger.log(`Restore completed successfully for session ${sessionId} in ${duration}ms`);

      // Record restore operation
      await this.recordRestoreOperation(options, result);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const result: RestoreResult = {
        success: false,
        sessionId,
        message: 'Error durante la restauración',
        restoredFrom: '',
        duration,
        error: error.message,
        logs
      };

      this.progressGateway.emitError(sessionId, error.message, { 
        stack: error.stack,
        logs 
      });

      this.logger.error(`Restore failed for session ${sessionId}:`, error);

      // Try to restart services if they were stopped
      try {
        await this.startServices(sessionId);
      } catch (restartError) {
        this.logger.error('Failed to restart services after restore error:', restartError);
      }

      return result;
    }
  }

  private async executeStep(
    sessionId: string,
    stepName: string,
    currentProgress: number,
    stepFunction: () => Promise<any>
  ): Promise<any> {
    const step = this.restoreSteps.find(s => s.name === stepName);
    if (!step) throw new Error(`Unknown step: ${stepName}`);

    const stepIndex = this.restoreSteps.findIndex(s => s.name === stepName);
    
    this.progressGateway.emitProgress(sessionId, {
      sessionId,
      progress: currentProgress,
      message: step.description,
      step: stepName,
      totalSteps: this.restoreSteps.length,
      currentStep: stepIndex + 1
    });

    const result = await stepFunction();
    const newProgress = currentProgress + step.weight;

    this.progressGateway.emitProgress(sessionId, {
      sessionId,
      progress: newProgress,
      message: `${step.description} - Completado`,
      step: stepName,
      totalSteps: this.restoreSteps.length,
      currentStep: stepIndex + 1
    });

    return result || newProgress;
  }

  private async validateAndPrepareBackup(options: RestoreOptions): Promise<string> {
    let backupFile: string;

    if (options.localFilePath) {
      // Use local file directly
      backupFile = options.localFilePath;
      await fs.access(backupFile);
    } else if (options.backupId) {
      // Find backup record and use local path
      const record = await this.backupRepository.findOne({
        where: { id: parseInt(options.backupId) }
      });
      if (!record || !record.localPath) {
        throw new Error('Backup record not found or no local file available');
      }
      backupFile = record.localPath;
      await fs.access(backupFile);
    } else if (options.driveFileId) {
      // Download from Google Drive - NOT IMPLEMENTED YET
      // TODO: Implement download method in GoogleDriveService if needed for restore functionality
      throw new Error('Google Drive download functionality not yet implemented');
      // const tempFile = path.join(this.tempDir, `restore_${uuidv4()}.sql.gz`);
      // const success = await this.googleDriveService.downloadBackup(options.driveFileId, tempFile);
      // if (!success) {
      //   throw new Error('Failed to download backup from Google Drive');
      // }
      // backupFile = tempFile;
    } else {
      throw new Error('No backup source specified');
    }

    // Validate file
    const stats = await fs.stat(backupFile);
    if (stats.size === 0) {
      throw new Error('Backup file is empty');
    }

    // Validate file format (should be .sql or .sql.gz)
    const ext = path.extname(backupFile);
    if (!['.sql', '.gz'].includes(ext) && !backupFile.endsWith('.sql.gz')) {
      throw new Error('Invalid backup file format. Expected .sql or .sql.gz');
    }

    return backupFile;
  }

  private async createPreRestoreBackup(sessionId: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `pre-restore-${timestamp}.sql.gz`;
    const backupPath = path.join(this.backupDir, backupFileName);

    const command = `docker exec mw-panel-db pg_dump -U mwpanel -d mwpanel --verbose | gzip > "${backupPath}"`;
    
    await execAsync(command);
    
    // Verify backup was created
    const stats = await fs.stat(backupPath);
    if (stats.size === 0) {
      throw new Error('Failed to create pre-restore backup');
    }

    return backupPath;
  }

  private async prepareForRestore(sessionId: string): Promise<void> {
    // Enable maintenance mode
    // Note: This would require implementing maintenance mode in the system
    this.logger.log(`Preparing system for restore - session ${sessionId}`);
  }

  private async stopServices(sessionId: string): Promise<void> {
    // Stop only the backend service to prevent new connections
    const command = 'docker-compose stop backend';
    await execAsync(command, { cwd: '/opt/mw-panel' });
  }

  private async restoreDatabase(backupFile: string, sessionId: string, targetDb?: string): Promise<void> {
    const dbName = targetDb || 'mwpanel';
    
    let command: string;
    
    if (backupFile.endsWith('.gz')) {
      command = `gunzip -c "${backupFile}" | docker exec -i mw-panel-db psql -U mwpanel -d ${dbName}`;
    } else {
      command = `docker exec -i mw-panel-db psql -U mwpanel -d ${dbName} < "${backupFile}"`;
    }

    await execAsync(command);
  }

  private async startServices(sessionId: string): Promise<void> {
    // Restart all services
    const command = 'docker-compose up -d';
    await execAsync(command, { cwd: '/opt/mw-panel' });
    
    // Wait for services to be ready
    await this.waitForServices();
  }

  private async waitForServices(): Promise<void> {
    // Wait for database to be ready
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      try {
        await execAsync('docker exec mw-panel-db pg_isready -U mwpanel');
        break;
      } catch {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Database failed to start after restore');
    }
  }

  private async verifyRestoration(sessionId: string): Promise<void> {
    // Basic verification - check if database is accessible and has data
    try {
      const result = await execAsync(
        'docker exec mw-panel-db psql -U mwpanel -d mwpanel -c "SELECT COUNT(*) FROM users;"'
      );
      
      if (!result.stdout || result.stdout.trim() === '0') {
        throw new Error('Database verification failed - no users found');
      }
    } catch (error) {
      throw new Error(`Database verification failed: ${error.message}`);
    }
  }

  private async recordRestoreOperation(options: RestoreOptions, result: RestoreResult): Promise<void> {
    try {
      const record = this.backupRepository.create({
        filename: `restore-operation-${Date.now()}`,
        type: BackupType.LOCAL,
        status: result.success ? BackupRecordStatus.COMPLETED : BackupRecordStatus.FAILED,
        backupStartTime: new Date(Date.now() - result.duration),
        backupEndTime: new Date(),
        logs: result.logs?.join('\n') || '',
        errorMessage: result.error,
        metadata: {
          operation: 'restore',
          sessionId: result.sessionId,
          restoredFrom: result.restoredFrom,
          userId: options.userId,
          duration: result.duration
        }
      });

      await this.backupRepository.save(record);
    } catch (error) {
      this.logger.error('Failed to record restore operation:', error);
    }
  }

  // Utility methods

  async getRestoreHistory(limit: number = 50): Promise<BackupRecord[]> {
    return this.backupRepository.find({
      where: { 
        metadata: { operation: 'restore' } as any 
      },
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  async generateRestoreToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    // Store token with expiration (implement caching service if needed)
    return token;
  }

  async validateRestoreToken(token: string, userId: string): Promise<boolean> {
    // Validate token (implement caching service if needed)
    return token && token.length === 64; // Basic validation
  }
}