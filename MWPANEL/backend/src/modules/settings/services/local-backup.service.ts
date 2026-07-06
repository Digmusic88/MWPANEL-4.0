import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { BackupRecord, BackupType, BackupStatus } from '../entities/backup-record.entity';
import { BackupConfigService } from './backup-config.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { exec } from 'child_process';
import { promisify } from 'util';

@Injectable()
export class LocalBackupService {
  private readonly logger = new Logger(LocalBackupService.name);
  private readonly backupDir = '/app/backups';

  constructor(
    @InjectRepository(BackupRecord)
    private readonly backupRepository: Repository<BackupRecord>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly backupConfigService: BackupConfigService,
  ) {
    this.ensureBackupDirectory();
  }

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      this.logger.log(`✅ Local backup directory ensured: ${this.backupDir}`);
    } catch (error) {
      this.logger.error('❌ Failed to create backup directory:', error);
    }
  }

  async createBackup(): Promise<{ message: string; filename: string; localPath: string; size: string }> {
    this.logger.log('🎯 LOCAL BACKUP CREATE CALLED - CREATING .tar.gz LOCALLY ONLY');
    
    try {
      // Clean old backups before creating new one
      await this.cleanOldBackups();
      
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
      const backupDirName = `mw_panel_full_backup_${timestamp}`;
      const tempBackupDir = `/tmp/${backupDirName}`;
      
      this.logger.log('🚀 Iniciando backup completo LOCAL...', { tempBackupDir });
      
      await fs.mkdir(tempBackupDir, { recursive: true });
      
      this.logger.log('📊 Creando backup de base de datos...');
      await this.createDatabaseBackupInDir(tempBackupDir);
      
      this.logger.log('📁 Copiando archivos de uploads...');
      await this.copyUploadsToBackup(tempBackupDir);
      
      this.logger.log('⚙️ Copiando archivos de configuración...');
      await this.copyConfigToBackup(tempBackupDir);
      
      this.logger.log('🗜️ Comprimiendo backup completo LOCAL...');
      const finalArchiveName = `${backupDirName}.tar.gz`;
      const finalArchivePath = path.join(this.backupDir, finalArchiveName);
      
      const execAsync = promisify(exec);
      const command = `cd /tmp && tar -czf "${finalArchivePath}" ${backupDirName}`;
      await execAsync(command);
      
      const stats = await fs.stat(finalArchivePath);
      this.logger.log(`✅ Archivo LOCAL .tar.gz creado: ${this.formatBytes(stats.size)}`);
      
      await fs.rm(tempBackupDir, { recursive: true, force: true });
      this.logger.log('🧹 Directorio temporal eliminado');
      
      // Save backup record to database
      const backupRecord = this.backupRepository.create({
        filename: finalArchiveName,
        type: BackupType.LOCAL,
        status: BackupStatus.COMPLETED,
        fileSize: stats.size,
        localPath: finalArchivePath,
        driveFileId: null,
        driveFileName: null,
        backupStartTime: new Date(),
        backupEndTime: new Date(),
        checksum: await this.calculateChecksum(finalArchivePath),
      });
      
      await this.backupRepository.save(backupRecord);
      this.logger.log('💾 Registro de backup LOCAL guardado en base de datos');
      
      return {
        message: 'Backup completo .tar.gz creado exitosamente LOCAL (sin Google Drive)',
        filename: finalArchiveName,
        localPath: finalArchivePath,
        size: this.formatBytes(stats.size)
      };
      
    } catch (error) {
      this.logger.error('Error creating LOCAL backup:', error);
      throw error;
    }
  }

  private async cleanOldBackups(): Promise<number> {
    try {
      const config = await this.backupConfigService.getConfig();
      const maxBackups = config.retentionCount;
      
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.endsWith('.tar.gz'));
      
      const filesWithStats = [];
      for (const file of backupFiles) {
        try {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          filesWithStats.push({ file, filePath, birthtime: stats.birthtime });
        } catch (error) {
          this.logger.warn(`Error getting stats for ${file}:`, error.message);
        }
      }
      
      filesWithStats.sort((a, b) => b.birthtime.getTime() - a.birthtime.getTime());
      
      let deletedCount = 0;
      if (filesWithStats.length > maxBackups) {
        const filesToDelete = filesWithStats.slice(maxBackups);
        
        for (const fileInfo of filesToDelete) {
          try {
            await fs.unlink(fileInfo.filePath);
            await this.backupRepository.delete({ filename: fileInfo.file });
            this.logger.log(`🗑️ Backup LOCAL eliminado (mantener solo ${maxBackups}): ${fileInfo.file}`);
            deletedCount++;
          } catch (error) {
            this.logger.warn(`Error eliminando archivo ${fileInfo.file}:`, error.message);
          }
        }
      }
      
      this.logger.log(`🧹 Limpieza LOCAL completada: ${deletedCount} backups eliminados, ${Math.min(filesWithStats.length, maxBackups)} mantenidos`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Error durante limpieza de backups LOCAL:', error);
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
        this.logger.warn(`Error processing table ${tableName}:`, tableError.message);
        sqlContent += `-- Error processing table ${tableName}: ${tableError.message}\n`;
      }
    }
    
    const compressedContent = zlib.gzipSync(sqlContent);
    await fs.writeFile(dbBackupPath, compressedContent);
    this.logger.log('Database dump created successfully for LOCAL backup');
  }

  private async copyUploadsToBackup(backupDir: string): Promise<void> {
    const uploadsSource = '/app/uploads';
    const uploadsDestination = `${backupDir}/uploads`;
    
    try {
      await fs.access(uploadsSource);
      await fs.mkdir(uploadsDestination, { recursive: true });
      
      const execAsync = promisify(exec);
      await execAsync(`cp -r ${uploadsSource}/* ${uploadsDestination}/ 2>/dev/null || true`);
      
      this.logger.log('Uploads copied successfully for LOCAL backup');
    } catch (error) {
      this.logger.warn('No uploads directory found or error copying:', error.message);
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
        this.logger.log(`Config file copied for LOCAL backup: ${filename}`);
      } catch (error) {
        this.logger.warn(`Config file not found: ${configFile}`);
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

  private async calculateChecksum(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    const hash = crypto.createHash('sha256');
    hash.update(fileBuffer);
    return hash.digest('hex');
  }
}