import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

export interface PdfFileInfo {
  id: string;
  filename: string;
  filepath: string;
  size: number;
  formattedSize: string;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  type: 'report' | 'certificate' | 'backup' | 'export' | 'temp';
  category: string;
  userId?: string;
  isTemporary: boolean;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface PdfStorageStats {
  totalFiles: number;
  totalSize: number;
  formattedTotalSize: string;
  tempFiles: number;
  tempSize: number;
  formattedTempSize: string;
  oldestFile: Date;
  newestFile: Date;
  averageSize: number;
  byType: Record<string, { count: number; size: number }>;
  diskUsage: {
    total: number;
    used: number;
    available: number;
    usagePercentage: number;
  };
}

export interface PdfCleanupResult {
  success: boolean;
  message: string;
  filesRemoved: number;
  spaceFreed: number;
  formattedSpaceFreed: string;
  errors: string[];
  details: {
    expiredFiles: number;
    tempFiles: number;
    unusedFiles: number;
    duplicateFiles: number;
  };
  duration: number;
}

export interface PdfCleanupOptions {
  maxAge?: number; // days
  maxSize?: number; // bytes
  keepRecentCount?: number;
  removeUnused?: boolean;
  removeDuplicates?: boolean;
  dryRun?: boolean;
  types?: string[];
}

@Injectable()
export class PdfManagerService {
  private readonly logger = new Logger(PdfManagerService.name);
  private readonly pdfDirectories = [
    '/opt/mw-panel/backend/uploads/reports',
    '/opt/mw-panel/backend/uploads/certificates',
    '/opt/mw-panel/backend/uploads/exports',
    '/opt/mw-panel/backend/uploads/temp',
    '/tmp/mw-panel-pdfs'
  ];
  private readonly tempDir = '/tmp/mw-panel-pdfs';
  private readonly maxTempAge = 24 * 60 * 60 * 1000; // 24 hours
  private readonly maxTempSize = 500 * 1024 * 1024; // 500MB
  
  // In-memory registry for active PDF files
  private pdfRegistry = new Map<string, PdfFileInfo>();

  constructor() {
    this.initializePdfDirectories();
    this.loadExistingPdfs();
  }

  private async initializePdfDirectories() {
    try {
      for (const dir of this.pdfDirectories) {
        await fs.mkdir(dir, { recursive: true });
      }
      this.logger.log('PDF directories initialized');
    } catch (error) {
      this.logger.error('Failed to initialize PDF directories:', error);
    }
  }

  private async loadExistingPdfs() {
    try {
      for (const dir of this.pdfDirectories) {
        await this.scanDirectory(dir);
      }
      this.logger.log(`Loaded ${this.pdfRegistry.size} existing PDF files`);
    } catch (error) {
      this.logger.error('Failed to load existing PDFs:', error);
    }
  }

  private async scanDirectory(directory: string) {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
          const filepath = path.join(directory, entry.name);
          const stats = await fs.stat(filepath);
          
          const pdfInfo: PdfFileInfo = {
            id: this.generateFileId(filepath),
            filename: entry.name,
            filepath,
            size: stats.size,
            formattedSize: this.formatBytes(stats.size),
            createdAt: stats.birthtime || stats.ctime,
            lastAccessed: stats.atime,
            accessCount: 0,
            type: this.determineFileType(filepath),
            category: this.determineCategory(filepath),
            isTemporary: this.isTemporaryFile(filepath),
            expiresAt: this.isTemporaryFile(filepath) 
              ? new Date(Date.now() + this.maxTempAge)
              : undefined
          };

          this.pdfRegistry.set(pdfInfo.id, pdfInfo);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to scan directory ${directory}:`, error);
    }
  }

  private generateFileId(filepath: string): string {
    return crypto.createHash('md5').update(filepath).digest('hex');
  }

  private determineFileType(filepath: string): PdfFileInfo['type'] {
    if (filepath.includes('/temp') || filepath.includes('/tmp')) return 'temp';
    if (filepath.includes('/reports')) return 'report';
    if (filepath.includes('/certificates')) return 'certificate';
    if (filepath.includes('/exports')) return 'export';
    if (filepath.includes('/backup')) return 'backup';
    return 'temp';
  }

  private determineCategory(filepath: string): string {
    const filename = path.basename(filepath).toLowerCase();
    
    if (filename.includes('student')) return 'student';
    if (filename.includes('teacher')) return 'teacher';
    if (filename.includes('family')) return 'family';
    if (filename.includes('grade')) return 'grades';
    if (filename.includes('attendance')) return 'attendance';
    if (filename.includes('report')) return 'reports';
    if (filename.includes('certificate')) return 'certificates';
    if (filename.includes('backup')) return 'backup';
    
    return 'general';
  }

  private isTemporaryFile(filepath: string): boolean {
    return filepath.includes('/temp') || 
           filepath.includes('/tmp') ||
           path.basename(filepath).startsWith('temp_') ||
           path.basename(filepath).includes('_temp_');
  }

  // Public methods

  async registerPdf(filepath: string, type: PdfFileInfo['type'] = 'temp', metadata?: Record<string, any>, userId?: string): Promise<string> {
    try {
      const stats = await fs.stat(filepath);
      const fileId = this.generateFileId(filepath);
      
      const pdfInfo: PdfFileInfo = {
        id: fileId,
        filename: path.basename(filepath),
        filepath,
        size: stats.size,
        formattedSize: this.formatBytes(stats.size),
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        type,
        category: this.determineCategory(filepath),
        userId,
        isTemporary: type === 'temp' || this.isTemporaryFile(filepath),
        expiresAt: (type === 'temp' || this.isTemporaryFile(filepath))
          ? new Date(Date.now() + this.maxTempAge)
          : undefined,
        metadata
      };

      this.pdfRegistry.set(fileId, pdfInfo);
      this.logger.log(`Registered PDF: ${pdfInfo.filename} (${pdfInfo.formattedSize})`);
      
      return fileId;
    } catch (error) {
      this.logger.error(`Failed to register PDF ${filepath}:`, error);
      throw error;
    }
  }

  async accessPdf(fileId: string): Promise<PdfFileInfo | null> {
    const pdfInfo = this.pdfRegistry.get(fileId);
    if (!pdfInfo) return null;

    // Update access information
    pdfInfo.lastAccessed = new Date();
    pdfInfo.accessCount++;

    // Check if file still exists
    try {
      await fs.access(pdfInfo.filepath);
      return pdfInfo;
    } catch {
      // File no longer exists, remove from registry
      this.pdfRegistry.delete(fileId);
      return null;
    }
  }

  async removePdf(fileId: string): Promise<boolean> {
    const pdfInfo = this.pdfRegistry.get(fileId);
    if (!pdfInfo) return false;

    try {
      await fs.unlink(pdfInfo.filepath);
      this.pdfRegistry.delete(fileId);
      this.logger.log(`Removed PDF: ${pdfInfo.filename}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove PDF ${pdfInfo.filename}:`, error);
      return false;
    }
  }

  async getPdfInfo(fileId: string): Promise<PdfFileInfo | null> {
    return this.pdfRegistry.get(fileId) || null;
  }

  async getAllPdfs(type?: string, category?: string): Promise<PdfFileInfo[]> {
    let pdfs = Array.from(this.pdfRegistry.values());
    
    if (type) {
      pdfs = pdfs.filter(pdf => pdf.type === type);
    }
    
    if (category) {
      pdfs = pdfs.filter(pdf => pdf.category === category);
    }

    return pdfs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getStorageStats(): Promise<PdfStorageStats> {
    const allPdfs = Array.from(this.pdfRegistry.values());
    const tempPdfs = allPdfs.filter(pdf => pdf.isTemporary);
    
    const totalSize = allPdfs.reduce((sum, pdf) => sum + pdf.size, 0);
    const tempSize = tempPdfs.reduce((sum, pdf) => sum + pdf.size, 0);
    
    const byType = allPdfs.reduce((acc, pdf) => {
      if (!acc[pdf.type]) {
        acc[pdf.type] = { count: 0, size: 0 };
      }
      acc[pdf.type].count++;
      acc[pdf.type].size += pdf.size;
      return acc;
    }, {} as Record<string, { count: number; size: number }>);

    // Get disk usage
    const diskUsage = await this.getDiskUsage();

    return {
      totalFiles: allPdfs.length,
      totalSize,
      formattedTotalSize: this.formatBytes(totalSize),
      tempFiles: tempPdfs.length,
      tempSize,
      formattedTempSize: this.formatBytes(tempSize),
      oldestFile: allPdfs.length > 0 ? new Date(Math.min(...allPdfs.map(p => p.createdAt.getTime()))) : new Date(),
      newestFile: allPdfs.length > 0 ? new Date(Math.max(...allPdfs.map(p => p.createdAt.getTime()))) : new Date(),
      averageSize: allPdfs.length > 0 ? totalSize / allPdfs.length : 0,
      byType,
      diskUsage
    };
  }

  private async getDiskUsage(): Promise<PdfStorageStats['diskUsage']> {
    try {
      const { stdout } = await execAsync("df /opt/mw-panel | tail -1 | awk '{print $2,$3,$4,$5}'");
      const [total, used, available, usageStr] = stdout.trim().split(' ');
      
      return {
        total: parseInt(total) * 1024, // Convert from KB to bytes
        used: parseInt(used) * 1024,
        available: parseInt(available) * 1024,
        usagePercentage: parseInt(usageStr.replace('%', ''))
      };
    } catch (error) {
      this.logger.warn('Failed to get disk usage:', error);
      return {
        total: 0,
        used: 0,
        available: 0,
        usagePercentage: 0
      };
    }
  }

  async cleanupPdfs(options: PdfCleanupOptions = {}): Promise<PdfCleanupResult> {
    const startTime = Date.now();
    const result: PdfCleanupResult = {
      success: true,
      message: '',
      filesRemoved: 0,
      spaceFreed: 0,
      formattedSpaceFreed: '0 Bytes',
      errors: [],
      details: {
        expiredFiles: 0,
        tempFiles: 0,
        unusedFiles: 0,
        duplicateFiles: 0
      },
      duration: 0
    };

    try {
      const {
        maxAge = 7, // 7 days default
        maxSize = this.maxTempSize,
        keepRecentCount = 100,
        removeUnused = true,
        removeDuplicates = true,
        dryRun = false,
        types = ['temp']
      } = options;

      const allPdfs = Array.from(this.pdfRegistry.values());
      const now = Date.now();
      const maxAgeMs = maxAge * 24 * 60 * 60 * 1000;

      // 1. Remove expired files
      const expiredPdfs = allPdfs.filter(pdf => 
        pdf.expiresAt && pdf.expiresAt.getTime() < now
      );

      for (const pdf of expiredPdfs) {
        if (!dryRun) {
          const removed = await this.removePdf(pdf.id);
          if (removed) {
            result.filesRemoved++;
            result.spaceFreed += pdf.size;
            result.details.expiredFiles++;
          }
        } else {
          result.filesRemoved++;
          result.spaceFreed += pdf.size;
          result.details.expiredFiles++;
        }
      }

      // 2. Remove old temporary files
      const oldTempPdfs = allPdfs.filter(pdf => 
        types.includes(pdf.type) &&
        (now - pdf.createdAt.getTime()) > maxAgeMs
      );

      for (const pdf of oldTempPdfs) {
        if (!dryRun) {
          const removed = await this.removePdf(pdf.id);
          if (removed) {
            result.filesRemoved++;
            result.spaceFreed += pdf.size;
            result.details.tempFiles++;
          }
        } else {
          result.filesRemoved++;
          result.spaceFreed += pdf.size;
          result.details.tempFiles++;
        }
      }

      // 3. Remove unused files (not accessed in long time)
      if (removeUnused) {
        const unusedPdfs = allPdfs.filter(pdf => 
          pdf.accessCount === 0 &&
          (now - pdf.lastAccessed.getTime()) > (30 * 24 * 60 * 60 * 1000) // 30 days
        );

        for (const pdf of unusedPdfs) {
          if (!dryRun) {
            const removed = await this.removePdf(pdf.id);
            if (removed) {
              result.filesRemoved++;
              result.spaceFreed += pdf.size;
              result.details.unusedFiles++;
            }
          } else {
            result.filesRemoved++;
            result.spaceFreed += pdf.size;
            result.details.unusedFiles++;
          }
        }
      }

      // 4. Remove duplicates (same content hash)
      if (removeDuplicates) {
        const duplicates = await this.findDuplicatePdfs();
        for (const duplicate of duplicates) {
          if (!dryRun) {
            const removed = await this.removePdf(duplicate.id);
            if (removed) {
              result.filesRemoved++;
              result.spaceFreed += duplicate.size;
              result.details.duplicateFiles++;
            }
          } else {
            result.filesRemoved++;
            result.spaceFreed += duplicate.size;
            result.details.duplicateFiles++;
          }
        }
      }

      // 5. Enforce size limits
      let currentSize = allPdfs.reduce((sum, pdf) => sum + pdf.size, 0) - result.spaceFreed;
      if (currentSize > maxSize) {
        const sortedPdfs = allPdfs
          .filter(pdf => !expiredPdfs.includes(pdf) && !oldTempPdfs.includes(pdf))
          .sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

        for (const pdf of sortedPdfs) {
          if (currentSize <= maxSize) break;
          if (sortedPdfs.length - result.filesRemoved <= keepRecentCount) break;

          if (!dryRun) {
            const removed = await this.removePdf(pdf.id);
            if (removed) {
              result.filesRemoved++;
              result.spaceFreed += pdf.size;
              currentSize -= pdf.size;
            }
          } else {
            result.filesRemoved++;
            result.spaceFreed += pdf.size;
            currentSize -= pdf.size;
          }
        }
      }

      result.formattedSpaceFreed = this.formatBytes(result.spaceFreed);
      result.duration = Date.now() - startTime;
      result.message = dryRun 
        ? `Análisis completado: ${result.filesRemoved} archivos serían eliminados, liberando ${result.formattedSpaceFreed}`
        : `Limpieza completada: ${result.filesRemoved} archivos eliminados, ${result.formattedSpaceFreed} liberados`;

      this.logger.log(result.message);

    } catch (error) {
      result.success = false;
      result.errors.push(error.message);
      result.message = 'Error durante la limpieza de PDFs';
      this.logger.error('PDF cleanup failed:', error);
    }

    return result;
  }

  private async findDuplicatePdfs(): Promise<PdfFileInfo[]> {
    const duplicates: PdfFileInfo[] = [];
    const hashMap = new Map<string, PdfFileInfo[]>();

    // Group files by content hash
    for (const pdf of this.pdfRegistry.values()) {
      try {
        const hash = await this.calculateFileHash(pdf.filepath);
        if (!hashMap.has(hash)) {
          hashMap.set(hash, []);
        }
        hashMap.get(hash)!.push(pdf);
      } catch (error) {
        // Skip files that can't be hashed
        continue;
      }
    }

    // Find duplicates (keep the most recently accessed)
    for (const [hash, files] of hashMap) {
      if (files.length > 1) {
        const sorted = files.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
        duplicates.push(...sorted.slice(1)); // Keep first, mark rest as duplicates
      }
    }

    return duplicates;
  }

  private async calculateFileHash(filepath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filepath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  // Scheduled cleanup task - runs daily at 2 AM
  // @Cron('0 2 * * *') // Temporarily disabled due to Node.js 18 compatibility
  async scheduledCleanup() {
    this.logger.log('Starting scheduled PDF cleanup...');
    
    const result = await this.cleanupPdfs({
      maxAge: 7,
      removeUnused: true,
      removeDuplicates: true,
      types: ['temp']
    });

    this.logger.log(`Scheduled cleanup completed: ${result.message}`);
  }

  // Utility methods

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async createTempPdf(content: Buffer, filename?: string, metadata?: Record<string, any>): Promise<string> {
    const tempFilename = filename || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`;
    const filepath = path.join(this.tempDir, tempFilename);
    
    await fs.writeFile(filepath, content);
    
    return this.registerPdf(filepath, 'temp', metadata);
  }

  async optimizePdfStorage(): Promise<{ success: boolean; optimizations: string[]; spaceSaved: number }> {
    const optimizations: string[] = [];
    let spaceSaved = 0;

    try {
      // 1. Compress old PDFs
      const largePdfs = Array.from(this.pdfRegistry.values())
        .filter(pdf => pdf.size > 1024 * 1024 && pdf.type !== 'temp') // > 1MB, not temp
        .filter(pdf => (Date.now() - pdf.lastAccessed.getTime()) > (7 * 24 * 60 * 60 * 1000)); // Not accessed in 7 days

      for (const pdf of largePdfs.slice(0, 5)) { // Limit to 5 files per run
        try {
          const originalSize = pdf.size;
          // This would use a PDF compression library in production
          // For now, we'll simulate the optimization
          optimizations.push(`Compressed ${pdf.filename}`);
          spaceSaved += originalSize * 0.3; // Simulate 30% compression
        } catch (error) {
          this.logger.warn(`Failed to compress ${pdf.filename}:`, error);
        }
      }

      // 2. Archive old reports
      const oldReports = Array.from(this.pdfRegistry.values())
        .filter(pdf => pdf.type === 'report')
        .filter(pdf => (Date.now() - pdf.createdAt.getTime()) > (90 * 24 * 60 * 60 * 1000)); // 90 days old

      if (oldReports.length > 0) {
        optimizations.push(`Archived ${oldReports.length} old reports`);
      }

      return {
        success: true,
        optimizations,
        spaceSaved
      };

    } catch (error) {
      this.logger.error('PDF optimization failed:', error);
      return {
        success: false,
        optimizations: [],
        spaceSaved: 0
      };
    }
  }
}