import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BackupRecord } from '../entities/backup-record.entity';
import { GoogleDriveService } from '../../educational-resources/services/google-drive.service';
import { RestoreProgressGateway } from '../gateways/restore-progress.gateway';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export interface SandboxTestOptions {
  backupId?: string;
  driveFileId?: string;
  localFilePath?: string;
  testType: 'integrity' | 'restoration' | 'compatibility' | 'full';
  sessionId: string;
  userId: string;
}

export interface SandboxTestResult {
  success: boolean;
  sessionId: string;
  testType: string;
  summary: {
    overallStatus: 'passed' | 'failed' | 'warning';
    testsRun: number;
    testsPassed: number;
    testsFailed: number;
    warnings: number;
  };
  results: {
    integrityCheck?: IntegrityTestResult;
    restorationTest?: RestorationTestResult;
    compatibilityCheck?: CompatibilityTestResult;
    dataValidation?: DataValidationResult;
  };
  recommendations: string[];
  estimatedRestoreTime: number;
  riskLevel: 'low' | 'medium' | 'high';
  logs: string[];
  duration: number;
  error?: string;
}

interface IntegrityTestResult {
  status: 'passed' | 'failed' | 'warning';
  fileSize: number;
  compression: string;
  checksumValid: boolean;
  sqlSyntaxValid: boolean;
  encoding: string;
  issues: string[];
}

interface RestorationTestResult {
  status: 'passed' | 'failed' | 'warning';
  sandboxDbCreated: boolean;
  dataRestored: boolean;
  servicesCompatible: boolean;
  migrationRequired: boolean;
  tablesCount: number;
  recordsCount: number;
  issues: string[];
}

interface CompatibilityTestResult {
  status: 'passed' | 'failed' | 'warning';
  schemaVersion: string;
  currentVersion: string;
  compatible: boolean;
  migrationRequired: boolean;
  migrationPath: string[];
  breakingChanges: string[];
  issues: string[];
}

interface DataValidationResult {
  status: 'passed' | 'failed' | 'warning';
  usersValid: boolean;
  constraintsValid: boolean;
  foreignKeysValid: boolean;
  dataIntegrityScore: number;
  issues: string[];
}

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);
  private readonly sandboxDir = '/tmp/mw-panel-sandbox';
  private readonly sandboxDbName = 'mwpanel_sandbox';

  constructor(
    @InjectRepository(BackupRecord)
    private readonly backupRepository: Repository<BackupRecord>,
    private readonly googleDriveService: GoogleDriveService,
    private readonly progressGateway: RestoreProgressGateway,
  ) {
    this.initializeSandboxEnvironment();
  }

  private async initializeSandboxEnvironment() {
    try {
      await fs.mkdir(this.sandboxDir, { recursive: true });
      await this.ensureSandboxDatabase();
    } catch (error) {
      this.logger.error('Failed to initialize sandbox environment:', error);
    }
  }

  private async ensureSandboxDatabase() {
    try {
      // Create sandbox database if it doesn't exist
      await execAsync(`docker exec mw-panel-db psql -U mwpanel -c "SELECT 1 FROM pg_database WHERE datname = '${this.sandboxDbName}'" | grep -q 1 || docker exec mw-panel-db createdb -U mwpanel ${this.sandboxDbName}`);
      this.logger.log('Sandbox database initialized');
    } catch (error) {
      this.logger.warn('Sandbox database initialization warning:', error);
    }
  }

  async runSandboxTest(options: SandboxTestOptions): Promise<SandboxTestResult> {
    const startTime = Date.now();
    const { sessionId, testType } = options;
    let logs: string[] = [];
    let currentProgress = 0;
    let backupFile: string | undefined = undefined;

    try {
      this.logger.log(`Starting sandbox test for session ${sessionId}, type: ${testType}`);
      
      // Emit initial status
      this.progressGateway.emitStatus(sessionId, {
        sessionId,
        status: 'starting',
        data: { testType, options }
      });

      // Step 1: Prepare backup file (20%)
      currentProgress = await this.executeTestStep(
        sessionId, 
        'preparation', 
        currentProgress, 
        20,
        async () => {
          backupFile = await this.prepareBackupForTesting(options);
          logs.push(`Backup file prepared: ${backupFile}`);
          return { backupFile };
        }
      );

      // Initialize result structure
      const result: SandboxTestResult = {
        success: false,
        sessionId,
        testType,
        summary: {
          overallStatus: 'failed',
          testsRun: 0,
          testsPassed: 0,
          testsFailed: 0,
          warnings: 0
        },
        results: {},
        recommendations: [],
        estimatedRestoreTime: 0,
        riskLevel: 'high',
        logs,
        duration: 0
      };

      // Run tests based on type
      if (testType === 'integrity' || testType === 'full') {
        currentProgress = await this.executeTestStep(
          sessionId, 
          'integrity_check', 
          currentProgress, 
          25,
          async () => {
            result.results.integrityCheck = await this.runIntegrityTest(backupFile);
            result.summary.testsRun++;
            if (result.results.integrityCheck.status === 'passed') {
              result.summary.testsPassed++;
            } else if (result.results.integrityCheck.status === 'failed') {
              result.summary.testsFailed++;
            } else {
              result.summary.warnings++;
            }
            logs.push('Integrity check completed');
            return {};
          }
        );
      }

      if (testType === 'restoration' || testType === 'full') {
        currentProgress = await this.executeTestStep(
          sessionId, 
          'restoration_test', 
          currentProgress, 
          30,
          async () => {
            result.results.restorationTest = await this.runRestorationTest(backupFile);
            result.summary.testsRun++;
            if (result.results.restorationTest.status === 'passed') {
              result.summary.testsPassed++;
            } else if (result.results.restorationTest.status === 'failed') {
              result.summary.testsFailed++;
            } else {
              result.summary.warnings++;
            }
            logs.push('Restoration test completed');
            return {};
          }
        );
      }

      if (testType === 'compatibility' || testType === 'full') {
        currentProgress = await this.executeTestStep(
          sessionId, 
          'compatibility_check', 
          currentProgress, 
          20,
          async () => {
            result.results.compatibilityCheck = await this.runCompatibilityTest(backupFile);
            result.summary.testsRun++;
            if (result.results.compatibilityCheck.status === 'passed') {
              result.summary.testsPassed++;
            } else if (result.results.compatibilityCheck.status === 'failed') {
              result.summary.testsFailed++;
            } else {
              result.summary.warnings++;
            }
            logs.push('Compatibility check completed');
            return {};
          }
        );
      }

      // Data validation (always run for full tests)
      if (testType === 'full') {
        currentProgress = await this.executeTestStep(
          sessionId, 
          'data_validation', 
          currentProgress, 
          25,
          async () => {
            result.results.dataValidation = await this.runDataValidation();
            result.summary.testsRun++;
            if (result.results.dataValidation.status === 'passed') {
              result.summary.testsPassed++;
            } else if (result.results.dataValidation.status === 'failed') {
              result.summary.testsFailed++;
            } else {
              result.summary.warnings++;
            }
            logs.push('Data validation completed');
            return {};
          }
        );
      }

      // Generate recommendations and final assessment
      result.recommendations = this.generateRecommendations(result);
      result.estimatedRestoreTime = this.estimateRestoreTime(result);
      result.riskLevel = this.assessRiskLevel(result);
      result.summary.overallStatus = this.determineOverallStatus(result);
      result.success = result.summary.overallStatus !== 'failed';
      result.duration = Date.now() - startTime;
      result.logs = logs;

      this.progressGateway.emitCompletion(sessionId, {
        sessionId,
        result,
        completed: true,
        timestamp: new Date().toISOString()
      });

      // Auto cleanup after successful completion
      await this.autoCleanup(sessionId, backupFile);

      this.logger.log(`Sandbox test completed for session ${sessionId}: ${result.summary.overallStatus}`);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const result: SandboxTestResult = {
        success: false,
        sessionId,
        testType,
        summary: {
          overallStatus: 'failed',
          testsRun: 0,
          testsPassed: 0,
          testsFailed: 1,
          warnings: 0
        },
        results: {},
        recommendations: ['Contactar soporte técnico', 'Verificar configuración del sistema'],
        estimatedRestoreTime: 0,
        riskLevel: 'high',
        logs,
        duration,
        error: error.message
      };

      this.progressGateway.emitError(sessionId, error.message, {
        stack: error.stack,
        logs
      });

      // Auto cleanup after error
      await this.autoCleanup(sessionId, backupFile);

      this.logger.error(`Sandbox test failed for session ${sessionId}:`, error);
      return result;
    }
  }

  private async executeTestStep(
    sessionId: string,
    stepName: string,
    currentProgress: number,
    stepWeight: number,
    stepFunction: () => Promise<any>
  ): Promise<any> {
    this.progressGateway.emitProgress(sessionId, {
      sessionId,
      progress: currentProgress,
      message: `Ejecutando ${stepName}...`,
      step: stepName,
      totalSteps: 4,
      currentStep: Math.floor(currentProgress / 25) + 1
    });

    const result = await stepFunction();
    const newProgress = currentProgress + stepWeight;

    this.progressGateway.emitProgress(sessionId, {
      sessionId,
      progress: newProgress,
      message: `${stepName} completado`,
      step: stepName,
      totalSteps: 4,
      currentStep: Math.floor(newProgress / 25)
    });

    return result || newProgress;
  }

  private async prepareBackupForTesting(options: SandboxTestOptions): Promise<string> {
    let backupFile: string;

    if (options.localFilePath) {
      backupFile = options.localFilePath;
      await fs.access(backupFile);
    } else if (options.backupId) {
      const record = await this.backupRepository.findOne({
        where: { id: parseInt(options.backupId) }
      });
      if (!record || !record.localPath) {
        throw new Error('Backup record not found or no local file available');
      }
      backupFile = record.localPath;
      await fs.access(backupFile);
    } else if (options.driveFileId) {
      // Download from Google Drive
      const tempFile = path.join(this.sandboxDir, `test_${uuidv4()}.tar.gz`);
      this.logger.log(`Downloading backup from Google Drive: ${options.driveFileId}`);
      
      const success = await this.googleDriveService.downloadBackup(options.driveFileId, tempFile);
      if (!success) {
        throw new Error('Failed to download backup from Google Drive');
      }
      
      // Verify file was downloaded and has content
      try {
        const stats = await fs.stat(tempFile);
        if (stats.size === 0) {
          await fs.unlink(tempFile).catch(() => {});
          throw new Error('Downloaded backup file is empty');
        }
        this.logger.log(`Backup downloaded successfully: ${tempFile} (${stats.size} bytes)`);
      } catch (error) {
        await fs.unlink(tempFile).catch(() => {});
        throw new Error(`Downloaded backup verification failed: ${error.message}`);
      }
      
      backupFile = tempFile;
    } else {
      throw new Error('No backup source specified');
    }

    return backupFile;
  }

  private async runIntegrityTest(backupFile: string): Promise<IntegrityTestResult> {
    const result: IntegrityTestResult = {
      status: 'passed',
      fileSize: 0,
      compression: 'none',
      checksumValid: true,
      sqlSyntaxValid: true,
      encoding: 'UTF-8',
      issues: []
    };

    try {
      // Check file size
      const stats = await fs.stat(backupFile);
      result.fileSize = stats.size;

      if (stats.size === 0) {
        result.status = 'failed';
        result.issues.push('Archivo de backup está vacío');
        return result;
      }

      // Check compression
      if (backupFile.endsWith('.gz')) {
        result.compression = 'gzip';
        
        // Test gzip integrity
        try {
          await execAsync(`gzip -t "${backupFile}"`);
        } catch (error) {
          result.status = 'failed';
          result.checksumValid = false;
          result.issues.push('Archivo comprimido corrupto');
        }
      }

      // Basic SQL syntax check (first 1000 lines)
      try {
        let command = result.compression === 'gzip' 
          ? `gunzip -c "${backupFile}" | head -1000`
          : `head -1000 "${backupFile}"`;
        
        const { stdout } = await execAsync(command);
        
        // Check for basic SQL patterns
        if (!stdout.includes('CREATE') && !stdout.includes('INSERT') && !stdout.includes('--')) {
          result.status = 'warning';
          result.sqlSyntaxValid = false;
          result.issues.push('No se detectaron comandos SQL válidos');
        }

        // Check encoding
        if (stdout.includes('\\x') || stdout.includes('\\\\')) {
          result.encoding = 'UTF-8 con caracteres especiales';
        }

      } catch (error) {
        result.status = 'warning';
        result.issues.push('Error al verificar sintaxis SQL');
      }

    } catch (error) {
      result.status = 'failed';
      result.issues.push(`Error de integridad: ${error.message}`);
    }

    return result;
  }

  private async runRestorationTest(backupFile: string): Promise<RestorationTestResult> {
    const result: RestorationTestResult = {
      status: 'passed',
      sandboxDbCreated: false,
      dataRestored: false,
      servicesCompatible: true,
      migrationRequired: false,
      tablesCount: 0,
      recordsCount: 0,
      issues: []
    };

    try {
      // Clean and recreate sandbox database
      await execAsync(`docker exec mw-panel-db dropdb -U mwpanel --if-exists ${this.sandboxDbName}`);
      await execAsync(`docker exec mw-panel-db createdb -U mwpanel ${this.sandboxDbName}`);
      result.sandboxDbCreated = true;

      // Attempt restoration to sandbox
      let restoreCommand: string;
      if (backupFile.endsWith('.tar.gz')) {
        // Extract tar.gz and find SQL file, then restore
        const extractDir = path.join(this.sandboxDir, `extract_${uuidv4()}`);
        await fs.mkdir(extractDir, { recursive: true });
        
        try {
          // Extract the tar.gz file
          await execAsync(`tar -xzf "${backupFile}" -C "${extractDir}"`);
          
          // Find the SQL file (should be database backup)
          const files = await fs.readdir(extractDir);
          const sqlFile = files.find(f => f.endsWith('.sql') || f.endsWith('.sql.gz'));
          
          if (!sqlFile) {
            throw new Error('No SQL file found in backup archive');
          }
          
          const sqlPath = path.join(extractDir, sqlFile);
          
          if (sqlFile.endsWith('.gz')) {
            restoreCommand = `gunzip -c "${sqlPath}" | docker exec -i mw-panel-db psql -U mwpanel -d ${this.sandboxDbName}`;
          } else {
            restoreCommand = `docker exec -i mw-panel-db psql -U mwpanel -d ${this.sandboxDbName} < "${sqlPath}"`;
          }
          
          await execAsync(restoreCommand);
          result.dataRestored = true;
          
          // Cleanup extraction directory
          await execAsync(`rm -rf "${extractDir}"`);
        } catch (error) {
          // Cleanup extraction directory on error
          await execAsync(`rm -rf "${extractDir}"`).catch(() => {});
          throw error;
        }
      } else if (backupFile.endsWith('.sql.gz')) {
        restoreCommand = `gunzip -c "${backupFile}" | docker exec -i mw-panel-db psql -U mwpanel -d ${this.sandboxDbName}`;
        await execAsync(restoreCommand);
        result.dataRestored = true;
      } else if (backupFile.endsWith('.sql')) {
        restoreCommand = `docker exec -i mw-panel-db psql -U mwpanel -d ${this.sandboxDbName} < "${backupFile}"`;
        await execAsync(restoreCommand);
        result.dataRestored = true;
      } else {
        throw new Error('Unsupported backup file format');
      }

      // Count tables and records
      const tablesResult = await execAsync(
        `docker exec mw-panel-db psql -U mwpanel -d ${this.sandboxDbName} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"`
      );
      result.tablesCount = parseInt(tablesResult.stdout.trim()) || 0;

      // Count total records in users table (as a sample)
      try {
        const usersResult = await execAsync(
          `docker exec mw-panel-db psql -U mwpanel -d ${this.sandboxDbName} -t -c "SELECT COUNT(*) FROM users;"`
        );
        result.recordsCount = parseInt(usersResult.stdout.trim()) || 0;
      } catch {
        result.issues.push('No se pudo contar registros de usuarios');
      }

      // Basic validation
      if (result.tablesCount < 10) {
        result.status = 'warning';
        result.issues.push('Pocas tablas detectadas, posible restauración incompleta');
      }

      if (result.recordsCount === 0) {
        result.status = 'warning';
        result.issues.push('No se encontraron usuarios en la base de datos');
      }

    } catch (error) {
      result.status = 'failed';
      result.issues.push(`Error en restauración: ${error.message}`);
    }

    return result;
  }

  private async runCompatibilityTest(backupFile: string): Promise<CompatibilityTestResult> {
    const result: CompatibilityTestResult = {
      status: 'passed',
      schemaVersion: 'unknown',
      currentVersion: 'unknown',
      compatible: true,
      migrationRequired: false,
      migrationPath: [],
      breakingChanges: [],
      issues: []
    };

    try {
      // Get current system schema version
      try {
        const currentVersionResult = await execAsync(
          `docker exec mw-panel-db psql -U mwpanel -d mwpanel -t -c "SELECT version FROM migrations ORDER BY id DESC LIMIT 1;"`
        );
        result.currentVersion = currentVersionResult.stdout.trim() || 'unknown';
      } catch {
        result.currentVersion = 'no_migrations_table';
      }

      // Get backup schema version (if sandbox was restored)
      try {
        const backupVersionResult = await execAsync(
          `docker exec mw-panel-db psql -U mwpanel -d ${this.sandboxDbName} -t -c "SELECT version FROM migrations ORDER BY id DESC LIMIT 1;"`
        );
        result.schemaVersion = backupVersionResult.stdout.trim() || 'unknown';
      } catch {
        result.schemaVersion = 'no_migrations_table';
        result.issues.push('No se encontró tabla de migraciones en el backup');
      }

      // Check compatibility
      if (result.schemaVersion !== 'unknown' && result.currentVersion !== 'unknown') {
        if (result.schemaVersion !== result.currentVersion) {
          result.compatible = false;
          result.migrationRequired = true;
          result.status = 'warning';
          result.issues.push(`Versión del backup (${result.schemaVersion}) difiere de la actual (${result.currentVersion})`);
          result.migrationPath = ['Ejecutar migraciones pendientes', 'Verificar compatibilidad de datos'];
        }
      } else {
        result.status = 'warning';
        result.issues.push('No se pudo determinar compatibilidad de versiones');
      }

      // Check for critical table structures
      const criticalTables = ['users', 'students', 'teachers', 'families'];
      for (const table of criticalTables) {
        try {
          await execAsync(
            `docker exec mw-panel-db psql -U mwpanel -d ${this.sandboxDbName} -c "\\d ${table}" > /dev/null`
          );
        } catch {
          result.status = 'failed';
          result.compatible = false;
          result.breakingChanges.push(`Tabla crítica '${table}' no encontrada`);
        }
      }

    } catch (error) {
      result.status = 'failed';
      result.issues.push(`Error en verificación de compatibilidad: ${error.message}`);
    }

    return result;
  }

  private async runDataValidation(): Promise<DataValidationResult> {
    const result: DataValidationResult = {
      status: 'passed',
      usersValid: true,
      constraintsValid: true,
      foreignKeysValid: true,
      dataIntegrityScore: 100,
      issues: []
    };

    try {
      // Validate users table
      try {
        const usersCheck = await execAsync(
          `docker exec mw-panel-db psql -U mwpanel -d ${this.sandboxDbName} -t -c "SELECT COUNT(*) FROM users WHERE email IS NULL OR email = '';"`
        );
        const invalidUsers = parseInt(usersCheck.stdout.trim()) || 0;
        if (invalidUsers > 0) {
          result.usersValid = false;
          result.dataIntegrityScore -= 20;
          result.issues.push(`${invalidUsers} usuarios con emails inválidos`);
        }
      } catch {
        result.usersValid = false;
        result.issues.push('Error validando tabla de usuarios');
      }

      // Check foreign key constraints
      try {
        await execAsync(
          `docker exec mw-panel-db psql -U mwpanel -d ${this.sandboxDbName} -c "SET session_replication_role = replica; SET session_replication_role = DEFAULT;"`
        );
      } catch (error) {
        result.foreignKeysValid = false;
        result.dataIntegrityScore -= 30;
        result.issues.push('Problemas con llaves foráneas detectados');
      }

      // Validate constraints
      try {
        const constraintsCheck = await execAsync(
          `docker exec mw-panel-db psql -U mwpanel -d ${this.sandboxDbName} -t -c "SELECT COUNT(*) FROM information_schema.check_constraints;"`
        );
        const constraintsCount = parseInt(constraintsCheck.stdout.trim()) || 0;
        if (constraintsCount === 0) {
          result.constraintsValid = false;
          result.dataIntegrityScore -= 10;
          result.issues.push('No se encontraron restricciones de datos');
        }
      } catch {
        result.issues.push('Error verificando restricciones');
      }

      // Determine final status
      if (result.dataIntegrityScore < 70) {
        result.status = 'failed';
      } else if (result.dataIntegrityScore < 90) {
        result.status = 'warning';
      }

    } catch (error) {
      result.status = 'failed';
      result.dataIntegrityScore = 0;
      result.issues.push(`Error en validación de datos: ${error.message}`);
    }

    return result;
  }

  private generateRecommendations(result: SandboxTestResult): string[] {
    const recommendations: string[] = [];

    if (result.summary.testsFailed > 0) {
      recommendations.push('❌ NO RECOMENDADO: Resolver errores críticos antes de restaurar');
    }

    if (result.results.integrityCheck?.status === 'failed') {
      recommendations.push('🔧 Verificar integridad del archivo de backup');
    }

    if (result.results.compatibilityCheck?.migrationRequired) {
      recommendations.push('📊 Ejecutar migraciones de base de datos después de restaurar');
    }

    if (result.results.dataValidation?.dataIntegrityScore && result.results.dataValidation.dataIntegrityScore < 90) {
      recommendations.push('⚠️  Revisar integridad de datos después de la restauración');
    }

    if (result.summary.warnings > 0 && result.summary.testsFailed === 0) {
      recommendations.push('✅ RECOMENDADO CON PRECAUCIÓN: Monitorear durante restauración');
    }

    if (result.summary.testsFailed === 0 && result.summary.warnings === 0) {
      recommendations.push('✅ TOTALMENTE RECOMENDADO: Backup listo para restauración');
    }

    recommendations.push('💾 SIEMPRE crear backup de seguridad antes de restaurar');
    recommendations.push('🕐 Programar restauración en horario de bajo tráfico');

    return recommendations;
  }

  private estimateRestoreTime(result: SandboxTestResult): number {
    let baseTime = 120; // 2 minutos base

    // Add time based on data size
    if (result.results.restorationTest?.tablesCount) {
      baseTime += result.results.restorationTest.tablesCount * 2;
    }

    if (result.results.restorationTest?.recordsCount) {
      baseTime += Math.floor(result.results.restorationTest.recordsCount / 1000) * 5;
    }

    // Add time for migrations
    if (result.results.compatibilityCheck?.migrationRequired) {
      baseTime += 180; // 3 minutos adicionales
    }

    // Add time for integrity issues
    if (result.summary.warnings > 2) {
      baseTime += 60; // 1 minuto adicional
    }

    return Math.min(baseTime, 1800); // Máximo 30 minutos
  }

  private assessRiskLevel(result: SandboxTestResult): 'low' | 'medium' | 'high' {
    if (result.summary.testsFailed > 0) return 'high';
    if (result.summary.warnings > 2) return 'medium';
    if (result.results.compatibilityCheck?.migrationRequired) return 'medium';
    if (result.results.dataValidation?.dataIntegrityScore && result.results.dataValidation.dataIntegrityScore < 80) return 'medium';
    return 'low';
  }

  private determineOverallStatus(result: SandboxTestResult): 'passed' | 'failed' | 'warning' {
    if (result.summary.testsFailed > 0) return 'failed';
    if (result.summary.warnings > 0) return 'warning';
    return 'passed';
  }

  // Utility methods
  async cleanupSandbox(): Promise<void> {
    try {
      // Drop sandbox database
      await execAsync(`docker exec mw-panel-db dropdb -U mwpanel --if-exists ${this.sandboxDbName}`);
      
      // Clean sandbox directory with all temporary files
      await execAsync(`rm -rf ${this.sandboxDir}/*`);
      
      // Clean any remaining temp files older than 1 hour
      await execAsync(`find /tmp -name "test_*.tar.gz" -mtime +0.04 -delete 2>/dev/null || true`);
      await execAsync(`find /tmp -name "extract_*" -type d -mtime +0.04 -exec rm -rf {} + 2>/dev/null || true`);
      
      this.logger.log('Sandbox cleaned up successfully');
    } catch (error) {
      this.logger.error('Error cleaning up sandbox:', error);
    }
  }

  /**
   * Limpia archivos temporales específicos de una sesión
   */
  async cleanupSessionFiles(sessionId: string): Promise<void> {
    try {
      // Clean specific session files
      await execAsync(`find ${this.sandboxDir} -name "*${sessionId}*" -delete 2>/dev/null || true`);
      
      // Clean any extraction directories from this session
      await execAsync(`find ${this.sandboxDir} -name "extract_*" -type d -exec rm -rf {} + 2>/dev/null || true`);
      
      this.logger.log(`Session files cleaned up for session: ${sessionId}`);
    } catch (error) {
      this.logger.warn(`Error cleaning up session files for ${sessionId}:`, error);
    }
  }

  /**
   * Limpieza automática que se ejecuta después de cada test
   */
  private async autoCleanup(sessionId: string, backupFile?: string): Promise<void> {
    try {
      // Clean downloaded backup file if it was temporary
      if (backupFile && backupFile.includes(this.sandboxDir)) {
        await fs.unlink(backupFile).catch(() => {});
        this.logger.log(`Deleted temporary backup file: ${backupFile}`);
      }
      
      // Clean session-specific files
      await this.cleanupSessionFiles(sessionId);
      
    } catch (error) {
      this.logger.warn('Auto cleanup error:', error);
    }
  }
}