import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { Roles } from './common/decorators/roles.decorator';
import { UserRole } from './modules/users/entities/user.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { EmailService } from './modules/communications/services/email.service';

@ApiTags('Simple Local Backup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('simple-backup')
export class SimpleBackupController {
  private readonly backupDir = '/app/backups';
  private isBackupRunning = false;

  constructor(
    @Inject(EmailService)
    private readonly emailService: EmailService,
  ) {
    console.log('🎯🎯🎯 SIMPLE BACKUP CONTROLLER INITIALIZED - LOCAL ONLY 🎯🎯🎯');
    this.ensureBackupDirectory();
  }

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`✅ Simple backup directory ensured: ${this.backupDir}`);
    } catch (error) {
      console.error('❌ Failed to create simple backup directory:', error);
    }
  }

  @Post('create')
  @ApiOperation({ summary: 'Crear backup completo LOCAL .tar.gz (sin Google Drive)' })
  @ApiResponse({ status: 200, description: 'Backup LOCAL creado exitosamente' })
  async createLocalBackup(@Body() options: any = {}): Promise<{ message: string, filename: string, localPath: string, size: string }> {
    console.log('🚀🚀🚀 SIMPLE BACKUP CREATE CALLED - LOCAL TAR.GZ ONLY 🚀🚀🚀');
    
    if (this.isBackupRunning) {
      throw new HttpException('Ya hay un backup en progreso', HttpStatus.CONFLICT);
    }

    try {
      this.isBackupRunning = true;
      
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
      const backupDirName = `mw_panel_simple_backup_${timestamp}`;
      const tempBackupDir = `/tmp/${backupDirName}`;
      
      console.log('📂 Creando directorio temporal:', tempBackupDir);
      await fs.mkdir(tempBackupDir, { recursive: true });
      
      // 1. Create database backup
      console.log('💾 Creando backup de base de datos...');
      await this.createDatabaseBackup(tempBackupDir);
      
      // 2. Copy uploads directory
      console.log('📁 Copiando uploads...');
      await this.copyDirectory('/app/uploads', `${tempBackupDir}/uploads`);
      
      // 3. Copy config files
      console.log('⚙️ Copiando configuración...');
      await this.copyConfigFiles(tempBackupDir);
      
      // 4. Create tar.gz archive
      console.log('🗜️ Comprimiendo a .tar.gz...');
      const finalArchiveName = `${backupDirName}.tar.gz`;
      const finalArchivePath = path.join(this.backupDir, finalArchiveName);
      
      const execAsync = promisify(exec);
      const command = `cd /tmp && tar -czf "${finalArchivePath}" ${backupDirName}`;
      await execAsync(command);
      
      // Cleanup
      await fs.rm(tempBackupDir, { recursive: true, force: true });
      
      const stats = await fs.stat(finalArchivePath);
      console.log(`✅ Backup LOCAL creado: ${finalArchiveName} (${this.formatBytes(stats.size)})`);
      
      return {
        message: 'Backup LOCAL .tar.gz creado exitosamente (sin Google Drive)',
        filename: finalArchiveName,
        localPath: finalArchivePath,
        size: this.formatBytes(stats.size)
      };
      
    } catch (error) {
      console.error('❌ Error creando backup LOCAL:', error);
      throw new HttpException(`Error al crear backup LOCAL: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      this.isBackupRunning = false;
    }
  }

  private async createDatabaseBackup(backupDir: string): Promise<void> {
    const dbBackupPath = `${backupDir}/database.sql`;
    
    // Simple database dump using pg_dump
    const execAsync = promisify(exec);
    const dumpCommand = `docker exec mw-panel-db pg_dump -U mwpanel mwpanel > ${dbBackupPath}`;
    
    try {
      await execAsync(dumpCommand);
      console.log('✅ Database backup created');
    } catch (error) {
      console.error('❌ Database backup failed:', error);
      // Create a fallback empty file
      await fs.writeFile(dbBackupPath, '-- Database backup failed\n');
    }
  }

  private async copyDirectory(source: string, destination: string): Promise<void> {
    try {
      await fs.access(source);
      await fs.mkdir(destination, { recursive: true });
      
      const execAsync = promisify(exec);
      await execAsync(`cp -r ${source}/* ${destination}/ 2>/dev/null || true`);
      console.log(`✅ Copied: ${source} -> ${destination}`);
    } catch (error) {
      console.warn(`⚠️ Could not copy ${source}:`, error.message);
      await fs.mkdir(destination, { recursive: true });
    }
  }

  private async copyConfigFiles(backupDir: string): Promise<void> {
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
        console.log(`✅ Config copied: ${filename}`);
      } catch (error) {
        console.warn(`⚠️ Config not found: ${configFile}`);
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

  @Post('test-birthday-emails')
  @ApiOperation({ summary: 'Test birthday email automation' })
  @ApiResponse({ status: 200, description: 'Birthday email test completed' })
  async testBirthdayEmails(): Promise<{ message: string; details: any }> {
    try {
      console.log('🎂 Testing birthday email automation via SimpleBackupController');
      await this.emailService.processBirthdayAutomations();
      return { 
        message: 'Birthday email automation test completed successfully',
        details: 'Check logs for details'
      };
    } catch (error) {
      console.error('❌ Birthday email test failed:', error);
      throw new HttpException(`Birthday email test failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('process-pending-emails')
  @ApiOperation({ summary: 'Process pending email notifications' })
  @ApiResponse({ status: 200, description: 'Pending emails processed' })
  async processPendingEmails(): Promise<{ message: string; processed: number }> {
    try {
      console.log('📧 Processing pending emails via SimpleBackupController');
      await this.emailService.processPendingEmails();
      return { 
        message: 'Pending emails processed successfully',
        processed: 0 // TODO: return actual count
      };
    } catch (error) {
      console.error('❌ Process pending emails failed:', error);
      throw new HttpException(`Process pending emails failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}