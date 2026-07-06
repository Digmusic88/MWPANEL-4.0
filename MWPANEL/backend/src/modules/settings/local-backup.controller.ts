import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BackupRecord, BackupType, BackupStatus as BackupRecordStatus } from './entities/backup-record.entity';
import { BackupConfig } from './entities/backup-config.entity';
import { BackupConfigService, BackupConfigDto } from './services/backup-config.service';
import { LocalBackupService } from './services/local-backup.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { exec } from 'child_process';
import { promisify } from 'util';

interface BackupInfo {
  filename: string;
  size: string;
  created: string;
  type: 'full';
  localPath: string;
}

interface BackupStatus {
  isRunning: boolean;
  lastBackup?: string;
  totalBackups: number;
  totalSize: string;
  recentBackups: BackupInfo[];
}

@ApiTags('Settings - Local Backup Only')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('settings/backup')
export class LocalBackupController {
  private readonly backupDir = '/app/backups';
  private isBackupRunning = false;
  private get maxBackups(): Promise<number> {
    return this.backupConfigService.getConfig().then(config => config.retentionCount);
  }

  constructor(
    @InjectRepository(BackupRecord)
    private readonly backupRepository: Repository<BackupRecord>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly backupConfigService: BackupConfigService,
    private readonly localBackupService: LocalBackupService,
  ) {
    console.log('🎯🎯🎯 LOCAL BACKUP CONTROLLER INITIALIZED - ONLY .tar.gz local backups, NO Google Drive 🎯🎯🎯');
    this.ensureBackupDirectory();
  }

  @Get('config')
  @ApiOperation({ summary: 'Obtener configuración de backup local' })
  @ApiResponse({ status: 200, description: 'Configuración de backup obtenida correctamente' })
  async getBackupConfig(): Promise<BackupConfigDto> {
    const config = await this.backupConfigService.getConfig();
    return {
      enableAutoBackup: config.enableAutoBackup,
      backupFrequency: config.backupFrequency,
      backupTime: config.backupTime,
      retentionCount: config.retentionCount
    };
  }

  @Put('config')
  @ApiOperation({ summary: 'Actualizar configuración de backup local' })
  @ApiResponse({ status: 200, description: 'Configuración de backup actualizada correctamente' })
  async updateBackupConfig(@Body() configDto: BackupConfigDto): Promise<{ message: string; config: BackupConfigDto }> {
    const updatedConfig = await this.backupConfigService.updateConfig(configDto);
    return {
      message: 'Configuración de backup actualizada exitosamente',
      config: {
        enableAutoBackup: updatedConfig.enableAutoBackup,
        backupFrequency: updatedConfig.backupFrequency,
        backupTime: updatedConfig.backupTime,
        retentionCount: updatedConfig.retentionCount
      }
    };
  }

  @Get('test')
  @ApiOperation({ summary: 'Test endpoint to verify LocalBackupController is working' })
  @ApiResponse({ status: 200, description: 'Test successful' })
  async testEndpoint(): Promise<{ message: string }> {
    console.log('🎯🎯🎯 LOCAL BACKUP CONTROLLER TEST ENDPOINT CALLED 🎯🎯🎯');
    return {
      message: 'LocalBackupController is working correctly - NO Google Drive!'
    };
  }

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`✅ Local backup directory ensured: ${this.backupDir}`);
    } catch (error) {
      console.error('❌ Failed to create backup directory:', error);
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Obtener estado de backups locales .tar.gz únicamente' })
  @ApiResponse({ status: 200, description: 'Estado de backups locales obtenido correctamente' })
  async getBackupStatus(): Promise<BackupStatus> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.endsWith('.tar.gz'));
      
      const backups: BackupInfo[] = [];
      
      for (const file of backupFiles) {
        try {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          
          backups.push({
            filename: file,
            size: this.formatBytes(stats.size),
            created: stats.birthtime.toISOString(),
            type: 'full',
            localPath: filePath
          });
        } catch (error) {
          console.warn(`Error getting stats for ${file}:`, error.message);
        }
      }

      backups.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

      const totalSizeBytes = backups.reduce((total, backup) => {
        const size = this.parseSize(backup.size);
        return total + size;
      }, 0);

      return {
        isRunning: this.isBackupRunning,
        lastBackup: backups.length > 0 ? backups[0].created : undefined,
        totalBackups: backups.length,
        totalSize: this.formatBytes(totalSizeBytes),
        recentBackups: backups.slice(0, 10),
      };
    } catch (error) {
      console.error('Error getting backup status:', error);
      throw new HttpException('Error al obtener estado de backups', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('create')
  @ApiOperation({ summary: 'Crear backup completo local .tar.gz - SOLO LOCAL, sin Google Drive' })
  @ApiResponse({ status: 200, description: 'Backup completo .tar.gz creado localmente únicamente' })
  async createLocalBackup(@Body() options: any = {}): Promise<{ message: string, filename: string, localPath: string, size: string }> {
    console.log('🎯 LOCAL BACKUP CREATE CALLED - CREATING .tar.gz LOCALLY ONLY');
    console.log('🚫 NO Google Drive upload - LOCAL STORAGE ONLY');
    
    if (this.isBackupRunning) {
      throw new HttpException('Ya hay un backup en progreso', HttpStatus.CONFLICT);
    }

    try {
      this.isBackupRunning = true;
      
      // Update last backup time in configuration
      await this.backupConfigService.updateLastBackupTime();
      
      // Use the service to create the backup
      const result = await this.localBackupService.createBackup();
      
      return result;
      
    } catch (error) {
      console.error('Error creating LOCAL backup:', error);
      throw new HttpException(`Error al crear backup LOCAL: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      this.isBackupRunning = false;
    }
  }

  @Delete(':filename')
  @ApiOperation({ summary: 'Eliminar backup local específico' })
  @ApiResponse({ status: 200, description: 'Backup local eliminado correctamente' })
  async deleteBackup(@Param('filename') filename: string): Promise<{ message: string }> {
    try {
      const filePath = path.join(this.backupDir, filename);
      
      await fs.access(filePath);
      await fs.unlink(filePath);
      await this.backupRepository.delete({ filename });
      
      console.log(`🗑️ Backup LOCAL eliminado: ${filename}`);
      
      return {
        message: `Backup LOCAL ${filename} eliminado exitosamente`
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new HttpException('Backup no encontrado', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(`Error al eliminar backup: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Limpiar backups locales antiguos (mantener solo 10)' })
  @ApiResponse({ status: 200, description: 'Limpieza de backups locales completada' })
  async cleanupBackups(): Promise<{ message: string, deletedCount: number }> {
    const deletedCount = await this.cleanOldBackups();
    return {
      message: `Limpieza LOCAL completada. ${deletedCount} backups antiguos eliminados.`,
      deletedCount
    };
  }

  @Post('restore/:filename')
  @ApiOperation({ summary: 'Restaurar backup específico local' })
  @ApiResponse({ status: 200, description: 'Backup restaurado exitosamente' })
  async restoreBackup(@Param('filename') filename: string): Promise<{ message: string }> {
    if (this.isBackupRunning) {
      throw new HttpException('Ya hay una operación de backup en progreso', HttpStatus.CONFLICT);
    }

    try {
      this.isBackupRunning = true;
      
      const backupPath = path.join(this.backupDir, filename);
      
      // Verificar que el backup existe
      await fs.access(backupPath);
      
      console.log(`🔄 Iniciando restauración de backup: ${filename}`);
      
      // Extraer el backup
      const tempRestoreDir = `/tmp/restore_${Date.now()}`;
      await fs.mkdir(tempRestoreDir, { recursive: true });
      
      const execAsync = promisify(exec);
      console.log('📦 Extrayendo backup...');
      await execAsync(`cd ${tempRestoreDir} && tar -xzf "${backupPath}"`);
      
      // Buscar el directorio extraído
      const extractedDirs = await fs.readdir(tempRestoreDir);
      const backupContentDir = path.join(tempRestoreDir, extractedDirs[0]);
      
      // Restaurar base de datos
      console.log('🗄️ Restaurando base de datos...');
      await this.restoreDatabase(backupContentDir);
      
      // Restaurar archivos de uploads
      console.log('📁 Restaurando archivos...');
      await this.restoreUploads(backupContentDir);
      
      // Limpiar directorio temporal
      await fs.rm(tempRestoreDir, { recursive: true, force: true });
      
      console.log(`✅ Backup ${filename} restaurado exitosamente`);
      
      return {
        message: `Backup ${filename} restaurado exitosamente. Reinicie el sistema para aplicar cambios.`
      };
      
    } catch (error) {
      console.error('Error restaurando backup:', error);
      throw new HttpException(`Error al restaurar backup: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      this.isBackupRunning = false;
    }
  }

  @Get('sandbox/status/:sessionId')
  @ApiOperation({ summary: 'Obtener estado de pruebas de sandbox' })
  @ApiResponse({ status: 200, description: 'Estado de sandbox obtenido' })
  async getSandboxStatus(@Param('sessionId') sessionId: string): Promise<{ sessionId: string; status: string; progress?: number; message?: string }> {
    // For local backups, sandbox tests are synchronous, so they're always completed
    return {
      sessionId,
      status: 'completed',
      progress: 100,
      message: 'Local sandbox test completed'
    };
  }

  @Post('sandbox/test')
  @ApiOperation({ summary: 'Ejecutar pruebas de sandbox en backup local' })
  @ApiResponse({ status: 200, description: 'Pruebas de sandbox iniciadas' })
  async runSandboxTest(@Body() testData: any): Promise<{ success: boolean; sessionId: string; message: string; testResults?: any }> {
    try {
      console.log('🧪 Starting sandbox test for local backup:', testData);
      
      // Find the backup to test
      let filename: string;
      if (testData.localFilePath) {
        filename = testData.localFilePath.split('/').pop();
      } else if (testData.backupId) {
        // Assume backupId is the filename for local backups
        filename = testData.backupId;
      } else {
        throw new Error('No valid backup specified for sandbox test');
      }
      
      // Run the test using existing test-restore functionality
      const testResults = await this.performSandboxTest(filename, testData.testType || 'full');
      
      // Generate a session ID for tracking
      const sessionId = `sandbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        sessionId,
        message: `Sandbox test completed for ${filename}`,
        testResults
      };
      
    } catch (error) {
      console.error('Error in sandbox test:', error);
      throw new HttpException(`Error en pruebas de sandbox: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('test-restore/:filename')
  @ApiOperation({ summary: 'Probar restauración de backup en entorno sandbox' })
  @ApiResponse({ status: 200, description: 'Test de restauración completado' })
  async testRestoreBackup(@Param('filename') filename: string): Promise<{ message: string, testResults: any }> {
    try {
      const backupPath = path.join(this.backupDir, filename);
      
      // Verificar que el backup existe
      await fs.access(backupPath);
      
      console.log(`🧪 Iniciando test de restauración de backup: ${filename}`);
      
      // Extraer el backup en un directorio temporal
      const tempTestDir = `/tmp/test_restore_${Date.now()}`;
      await fs.mkdir(tempTestDir, { recursive: true });
      
      const execAsync = promisify(exec);
      await execAsync(`cd ${tempTestDir} && tar -xzf "${backupPath}"`);
      
      // Buscar el directorio extraído
      const extractedDirs = await fs.readdir(tempTestDir);
      const backupContentDir = path.join(tempTestDir, extractedDirs[0]);
      
      // Realizar tests de validación
      const testResults = await this.performBackupTests(backupContentDir);
      
      // Limpiar directorio temporal
      await fs.rm(tempTestDir, { recursive: true, force: true });
      
      console.log(`✅ Test de backup ${filename} completado`);
      
      return {
        message: `Test de restauración de ${filename} completado exitosamente`,
        testResults
      };
      
    } catch (error) {
      console.error('Error en test de restauración:', error);
      throw new HttpException(`Error en test de restauración: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async cleanOldBackups(): Promise<number> {
    try {
      const config = await this.backupConfigService.getConfig();
      const maxBackups = config.retentionCount;
      
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.endsWith('.tar.gz'));
      
      // Get file stats and sort by creation date (newest first)
      const filesWithStats = [];
      for (const file of backupFiles) {
        try {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          filesWithStats.push({ file, filePath, birthtime: stats.birthtime });
        } catch (error) {
          console.warn(`Error getting stats for ${file}:`, error.message);
        }
      }
      
      // Sort by creation date (newest first)
      filesWithStats.sort((a, b) => b.birthtime.getTime() - a.birthtime.getTime());
      
      let deletedCount = 0;
      // Keep only the first maxBackups files, delete the rest
      if (filesWithStats.length > maxBackups) {
        const filesToDelete = filesWithStats.slice(maxBackups);
        
        for (const fileInfo of filesToDelete) {
          try {
            await fs.unlink(fileInfo.filePath);
            await this.backupRepository.delete({ filename: fileInfo.file });
            console.log(`🗑️ Backup LOCAL eliminado (mantener solo ${maxBackups}): ${fileInfo.file}`);
            deletedCount++;
          } catch (error) {
            console.warn(`Error eliminando archivo ${fileInfo.file}:`, error.message);
          }
        }
      }
      
      console.log(`🧹 Limpieza LOCAL completada: ${deletedCount} backups eliminados, ${Math.min(filesWithStats.length, maxBackups)} mantenidos`);
      return deletedCount;
    } catch (error) {
      console.error('Error durante limpieza de backups LOCAL:', error);
      return 0;
    }
  }

  private async createDatabaseBackupInDir(backupDir: string): Promise<void> {
    const dbBackupPath = `${backupDir}/database.sql.gz`;
    
    const tables = await this.dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    let sqlContent = `-- MW Panel Full LOCAL Backup Database\n-- Created: ${new Date().toISOString()}\n\n`;
    
    for (const table of tables) {
      const tableName = table.table_name;
      try {
        const createTableResult = await this.dataSource.query(`
          SELECT 'CREATE TABLE IF NOT EXISTS "' || schemaname||'"."'||tablename||'" (' ||
          array_to_string(
            array_agg(
              '"'||column_name||'" '|| type ||
              CASE WHEN character_maximum_length IS NOT NULL 
                   THEN '('||character_maximum_length||')'
                   ELSE ''
              END ||
              CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
              CASE WHEN column_default IS NOT NULL 
                   THEN ' DEFAULT '|| column_default  
                   ELSE ''
              END
            ), ', ') || ');' AS create_statement
          FROM (
            SELECT 
              c.relname AS tablename,
              n.nspname AS schemaname,
              a.attname AS column_name,
              pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
              CASE WHEN a.attlen = -1 AND a.atttypmod <> -1
                   THEN a.atttypmod - 4
                   ELSE NULL
              END AS character_maximum_length,
              CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable,
              CASE WHEN a.atthasdef 
                   THEN ' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid)
                   ELSE ''
              END AS column_default
            FROM pg_attribute a
            JOIN pg_class c ON a.attrelid = c.oid
            JOIN pg_namespace n ON c.relnamespace = n.oid
            LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
            WHERE c.relname = '${tableName}'
              AND n.nspname = 'public'
              AND a.attnum > 0
              AND NOT a.attisdropped
            ORDER BY a.attnum
          ) AS subquery
          GROUP BY schemaname, tablename;
        `);
        
        if (createTableResult.length > 0) {
          sqlContent += `\n-- Table: ${tableName}\n`;
          sqlContent += createTableResult[0].create_statement + '\n';
          
          const data = await this.dataSource.query(`SELECT * FROM "${tableName}"`);
          if (data.length > 0) {
            const columns = Object.keys(data[0]);
            const values = data.map(row => 
              '(' + columns.map(col => {
                const val = row[col];
                if (val === null) return 'NULL';
                if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                if (val instanceof Date) return `'${val.toISOString()}'`;
                return val;
              }).join(', ') + ')'
            ).join(',\n  ');
            
            sqlContent += `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES\n  ${values};\n`;
          }
        }
      } catch (tableError) {
        console.warn(`Error processing table ${tableName}:`, tableError.message);
        sqlContent += `-- Error processing table ${tableName}: ${tableError.message}\n`;
      }
    }
    
    const compressedContent = zlib.gzipSync(sqlContent);
    await fs.writeFile(dbBackupPath, compressedContent);
    console.log('Database dump created successfully for LOCAL backup');
  }

  private async copyUploadsToBackup(backupDir: string): Promise<void> {
    const uploadsSource = '/app/uploads';
    const uploadsDestination = `${backupDir}/uploads`;
    
    try {
      await fs.access(uploadsSource);
      await fs.mkdir(uploadsDestination, { recursive: true });
      
      const execAsync = promisify(exec);
      await execAsync(`cp -r ${uploadsSource}/* ${uploadsDestination}/ 2>/dev/null || true`);
      
      console.log('Uploads copied successfully for LOCAL backup');
    } catch (error) {
      console.warn('No uploads directory found or error copying:', error.message);
      await fs.mkdir(uploadsDestination, { recursive: true });
    }
  }

  private async copyConfigToBackup(backupDir: string): Promise<void> {
    const configDestination = `${backupDir}/config`;
    await fs.mkdir(configDestination, { recursive: true });
    
    const configFiles = [
      '/app/google-credentials.json',
      '/app/package.json',
      '/app/.env'
    ];
    
    for (const configFile of configFiles) {
      try {
        await fs.access(configFile);
        const filename = path.basename(configFile);
        await fs.copyFile(configFile, `${configDestination}/${filename}`);
        console.log(`Config file copied for LOCAL backup: ${filename}`);
      } catch (error) {
        console.warn(`Config file not found: ${configFile}`);
      }
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(\w+)$/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    
    const multipliers = {
      'BYTES': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024
    };
    
    return value * (multipliers[unit] || 1);
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    const hash = crypto.createHash('sha256');
    hash.update(fileBuffer);
    return hash.digest('hex');
  }

  private async restoreDatabase(backupContentDir: string): Promise<void> {
    const dbBackupPath = path.join(backupContentDir, 'database.sql.gz');
    
    try {
      await fs.access(dbBackupPath);
      
      // Decomprimir el archivo SQL
      const compressedData = await fs.readFile(dbBackupPath);
      const sqlContent = zlib.gunzipSync(compressedData).toString();
      
      // Ejecutar las sentencias SQL
      const statements = sqlContent.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await this.dataSource.query(statement);
          } catch (error) {
            console.warn(`Warning ejecutando SQL: ${error.message}`);
          }
        }
      }
      
      console.log('✅ Base de datos restaurada exitosamente');
    } catch (error) {
      throw new Error(`Error restaurando base de datos: ${error.message}`);
    }
  }

  private async restoreUploads(backupContentDir: string): Promise<void> {
    const uploadsBackupPath = path.join(backupContentDir, 'uploads');
    const uploadsDestination = '/app/uploads';
    
    try {
      await fs.access(uploadsBackupPath);
      
      // Crear directorio de destino si no existe
      await fs.mkdir(uploadsDestination, { recursive: true });
      
      // Copiar archivos
      const execAsync = promisify(exec);
      await execAsync(`cp -r ${uploadsBackupPath}/* ${uploadsDestination}/ 2>/dev/null || true`);
      
      console.log('✅ Archivos de uploads restaurados exitosamente');
    } catch (error) {
      console.warn(`Warning restaurando uploads: ${error.message}`);
    }
  }

  private async performSandboxTest(filename: string, testType: string): Promise<any> {
    console.log(`🧪 Running ${testType} sandbox test for: ${filename}`);
    
    const backupPath = path.join(this.backupDir, filename);
    
    // Verify backup exists
    try {
      await fs.access(backupPath);
    } catch (error) {
      throw new Error(`Backup file not found: ${filename}`);
    }
    
    // Extract backup for testing
    const tempTestDir = `/tmp/sandbox_test_${Date.now()}`;
    await fs.mkdir(tempTestDir, { recursive: true });
    
    try {
      const execAsync = promisify(exec);
      await execAsync(`cd ${tempTestDir} && tar -xzf "${backupPath}"`);
      
      const extractedDirs = await fs.readdir(tempTestDir);
      const backupContentDir = path.join(tempTestDir, extractedDirs[0]);
      
      // Run comprehensive tests
      const testResults = await this.performComprehensiveBackupTests(backupContentDir, testType);
      
      // Cleanup
      await fs.rm(tempTestDir, { recursive: true, force: true });
      
      return {
        success: true,
        sessionId: `sandbox_${Date.now()}`,
        testType,
        summary: {
          overallStatus: testResults.success ? 'passed' : 'failed',
          testsRun: testResults.testsRun || 4,
          testsPassed: testResults.testsPassed || 0,
          testsFailed: testResults.testsFailed || 0,
          warnings: testResults.warnings || 0
        },
        results: testResults,
        recommendations: testResults.recommendations || [],
        estimatedRestoreTime: 300, // 5 minutes estimate
        riskLevel: testResults.success ? 'low' : 'medium',
        logs: testResults.logs || [],
        duration: Date.now() - Date.now(),
        filename
      };
      
    } catch (error) {
      await fs.rm(tempTestDir, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  }

  private async performComprehensiveBackupTests(backupContentDir: string, testType: string): Promise<any> {
    const results = {
      success: true,
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      warnings: 0,
      logs: [],
      recommendations: [],
      integrity: false,
      database: false,
      uploads: false,
      config: false,
      errors: []
    };

    results.logs.push(`Starting ${testType} sandbox tests...`);
    
    try {
      // Test 1: File Integrity
      results.testsRun++;
      results.logs.push('Testing file integrity...');
      const requiredFiles = ['database.sql.gz'];
      let integrityPassed = true;
      
      for (const file of requiredFiles) {
        try {
          await fs.access(path.join(backupContentDir, file));
          results.logs.push(`✅ Required file found: ${file}`);
        } catch (error) {
          results.errors.push(`Missing required file: ${file}`);
          integrityPassed = false;
          results.testsFailed++;
        }
      }
      
      if (integrityPassed) {
        results.testsPassed++;
        results.integrity = true;
        results.logs.push('✅ File integrity test passed');
      } else {
        results.logs.push('❌ File integrity test failed');
      }

      // Test 2: Database Validation
      if (testType === 'full' || testType === 'restoration') {
        results.testsRun++;
        results.logs.push('Testing database backup...');
        
        try {
          const dbBackupPath = path.join(backupContentDir, 'database.sql.gz');
          const compressedData = await fs.readFile(dbBackupPath);
          const sqlContent = zlib.gunzipSync(compressedData).toString();
          
          if (sqlContent.includes('CREATE TABLE') && sqlContent.includes('INSERT INTO')) {
            results.database = true;
            results.testsPassed++;
            results.logs.push('✅ Database backup validation passed');
          } else {
            results.errors.push('Database backup does not contain valid data');
            results.testsFailed++;
            results.logs.push('❌ Database backup validation failed');
          }
        } catch (error) {
          results.errors.push(`Database validation error: ${error.message}`);
          results.testsFailed++;
          results.logs.push('❌ Database backup validation failed');
        }
      }

      // Test 3: Uploads Directory
      if (testType === 'full') {
        results.testsRun++;
        results.logs.push('Testing uploads backup...');
        
        try {
          const uploadsPath = path.join(backupContentDir, 'uploads');
          await fs.access(uploadsPath);
          results.uploads = true;
          results.testsPassed++;
          results.logs.push('✅ Uploads backup test passed');
        } catch (error) {
          results.warnings++;
          results.logs.push('⚠️ Uploads directory not found (may be normal if no uploads exist)');
        }
      }

      // Test 4: Configuration Files
      if (testType === 'full') {
        results.testsRun++;
        results.logs.push('Testing configuration backup...');
        
        try {
          const configPath = path.join(backupContentDir, 'config');
          await fs.access(configPath);
          results.config = true;
          results.testsPassed++;
          results.logs.push('✅ Configuration backup test passed');
        } catch (error) {
          results.warnings++;
          results.logs.push('⚠️ Configuration directory not found');
        }
      }

      // Generate recommendations
      if (results.testsFailed === 0) {
        results.recommendations.push('Backup is ready for restoration');
        results.recommendations.push('Consider creating a pre-restoration backup');
      } else {
        results.recommendations.push('Review failed tests before restoration');
        results.recommendations.push('Contact support if issues persist');
      }

      results.success = results.testsFailed === 0;
      results.logs.push(`Sandbox test completed: ${results.testsPassed}/${results.testsRun} tests passed`);

    } catch (error) {
      results.errors.push(`Sandbox test error: ${error.message}`);
      results.testsFailed++;
      results.success = false;
      results.logs.push(`❌ Sandbox test failed: ${error.message}`);
    }

    return results;
  }

  private async performBackupTests(backupContentDir: string): Promise<any> {
    const testResults = {
      integrity: false,
      database: false,
      uploads: false,
      config: false,
      errors: []
    };

    try {
      // Test 1: Verificar integridad del backup
      const requiredFiles = ['database.sql.gz'];
      for (const file of requiredFiles) {
        try {
          await fs.access(path.join(backupContentDir, file));
          testResults.integrity = true;
        } catch (error) {
          testResults.errors.push(`Archivo requerido faltante: ${file}`);
        }
      }

      // Test 2: Validar base de datos
      try {
        const dbBackupPath = path.join(backupContentDir, 'database.sql.gz');
        const compressedData = await fs.readFile(dbBackupPath);
        const sqlContent = zlib.gunzipSync(compressedData).toString();
        
        if (sqlContent.includes('CREATE TABLE') && sqlContent.includes('INSERT INTO')) {
          testResults.database = true;
        } else {
          testResults.errors.push('El backup de base de datos no contiene datos válidos');
        }
      } catch (error) {
        testResults.errors.push(`Error validando base de datos: ${error.message}`);
      }

      // Test 3: Verificar uploads
      try {
        const uploadsPath = path.join(backupContentDir, 'uploads');
        await fs.access(uploadsPath);
        testResults.uploads = true;
      } catch (error) {
        testResults.errors.push('Directorio de uploads no encontrado (puede ser normal)');
      }

      // Test 4: Verificar archivos de configuración
      try {
        const configPath = path.join(backupContentDir, 'config');
        await fs.access(configPath);
        testResults.config = true;
      } catch (error) {
        testResults.errors.push('Directorio de configuración no encontrado');
      }

    } catch (error) {
      testResults.errors.push(`Error general en tests: ${error.message}`);
    }

    return testResults;
  }
}