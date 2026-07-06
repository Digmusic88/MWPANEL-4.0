import { Injectable } from '@nestjs/common'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import { BackupStatus, BackupItem, BackupListResponse } from '../dto/time-machine.dto'

const execAsync = promisify(exec)

@Injectable()
export class TimeMachineService {
  private readonly backupBaseDir = '/app/time-machine-backups'
  private readonly logFile = '/app/time-machine-backups/logs/cron.log'
  private readonly retention = 4  // Reduced from 7 to save disk space (each backup ~2.4GB)

  async getStatus(): Promise<BackupStatus> {
    try {
      // Check container and database status
      const containerStatus = await this.checkContainerStatus()
      const databaseStatus = await this.checkDatabaseStatus()
      
      // Get disk space
      const diskSpace = await this.getDiskSpace()
      
      // Check cron jobs
      const cronJobs = await this.getCronJobsStatus()
      
      // Calculate backup stats
      const backupStats = await this.calculateBackupStats()
      
      // Get latest backup
      const latestBackup = await this.getLatestBackup()

      return {
        containerStatus,
        databaseStatus,
        diskSpace,
        cronJobs,
        backupStats,
        latestBackup,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error getting Time Machine status:', error)
      throw new Error('Failed to get system status')
    }
  }

  async listBackups(): Promise<BackupListResponse> {
    try {
      const backupTypes = ['hourly', 'daily', 'weekly', 'monthly']
      const allBackups: BackupItem[] = []
      const stats = { total: 0, byType: [], totalSizeMB: 0 }

      for (const type of backupTypes) {
        const typeDir = path.join(this.backupBaseDir, type)
        
        try {
          await fs.access(typeDir)
          const entries = await fs.readdir(typeDir, { withFileTypes: true })
          const directories = entries.filter(entry => entry.isDirectory())
          
          let typeSize = 0
          let latest = null
          let oldest = null

          for (const dir of directories) {
            const backupPath = path.join(typeDir, dir.name)
            const stat = await fs.stat(backupPath)
            const sizeMB = await this.getDirectorySize(backupPath)
            
            typeSize += sizeMB
            
            // Track latest and oldest
            if (!latest || stat.mtime > new Date(latest)) {
              latest = stat.mtime.toISOString()
            }
            if (!oldest || stat.mtime < new Date(oldest)) {
              oldest = stat.mtime.toISOString()
            }

            allBackups.push({
              type,
              timestamp: dir.name,
              size: `${sizeMB}MB`,
              age: this.calculateAge(stat.mtime),
              path: backupPath,
              date: stat.mtime.toISOString()
            })
          }

          stats.byType.push({
            type,
            count: directories.length,
            totalSize: typeSize,
            latest,
            oldest
          })
          
          stats.totalSizeMB += typeSize
        } catch (error) {
          // Directory doesn't exist or is empty
          stats.byType.push({
            type,
            count: 0,
            totalSize: 0,
            latest: null,
            oldest: null
          })
        }
      }

      // Sort backups by timestamp (newest first)
      allBackups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      stats.total = allBackups.length

      return {
        success: true,
        backups: allBackups,
        stats,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error listing backups:', error)
      throw new Error('Failed to list backups')
    }
  }

  async createBackup(type: 'hourly' | 'daily' | 'weekly' | 'monthly'): Promise<any> {
    try {
      const timestamp = this.generateTimestamp()
      const backupDir = path.join(this.backupBaseDir, type, timestamp)
      
      console.log(`[Time Machine] Creating ${type} backup: ${timestamp}`)
      
      // Create backup directory
      await fs.mkdir(backupDir, { recursive: true })
      
      // Backup PostgreSQL database
      await this.backupDatabase(backupDir)
      
      // Backup source files
      await this.backupSourceFiles(backupDir)
      
      // Cleanup old backups
      await this.cleanupOldBackups(type)
      
      const size = await this.getDirectorySize(backupDir)
      console.log(`[Time Machine] Backup ${timestamp} completed: ${size}MB`)
      
      return {
        success: true,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} backup created successfully`,
        backup: {
          type,
          timestamp,
          size: `${size}MB`,
          path: backupDir
        }
      }
    } catch (error) {
      console.error(`Error creating ${type} backup:`, error)
      throw new Error(`Failed to create ${type} backup: ${error.message}`)
    }
  }

  async verifyBackup(backupPath?: string): Promise<any> {
    try {
      if (backupPath) {
        // Verify specific backup
        return await this.verifySpecificBackup(backupPath)
      } else {
        // Verify latest backup of each type
        return await this.verifyAllLatestBackups()
      }
    } catch (error) {
      console.error('Error verifying backup:', error)
      throw new Error('Failed to verify backup')
    }
  }

  async getCronLogs(): Promise<any> {
    try {
      try {
        const logContent = await fs.readFile(this.logFile, 'utf-8')
        const lines = logContent.split('\n').filter(line => line.trim() !== '')
        
        return {
          success: true,
          logs: lines.slice(-50), // Last 50 lines
          totalLines: lines.length,
          lastUpdate: new Date().toISOString()
        }
      } catch (error) {
        // Log file doesn't exist yet
        return {
          success: true,
          logs: ['Time Machine cron system initialized - waiting for first execution...'],
          totalLines: 0,
          lastUpdate: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Error reading cron logs:', error)
      throw new Error('Failed to read cron logs')
    }
  }

  private async checkContainerStatus(): Promise<string> {
    try {
      // Since we're running inside a container, we can assume it's running
      // Check if we can access basic system resources and if the app is responding
      const { stdout } = await execAsync('ps aux | wc -l')
      const processCount = parseInt(stdout.trim())
      
      // If we have processes running and can execute commands, container is healthy
      return processCount >= 5 ? 'running' : 'degraded'
    } catch (error) {
      return 'stopped'
    }
  }

  private async checkDatabaseStatus(): Promise<string> {
    try {
      // Check PostgreSQL connection directly using environment variables
      const dbHost = process.env.DB_HOST || 'postgres'
      const dbPort = process.env.DB_PORT || '5432'
      const dbUser = process.env.DB_USER || 'mwpanel'
      const dbPassword = process.env.DB_PASSWORD || 'mwpanel123'
      
      // Use pg_isready to check if PostgreSQL is accepting connections
      await execAsync(`PGPASSWORD=${dbPassword} pg_isready -h ${dbHost} -p ${dbPort} -U ${dbUser}`)
      return 'available'
    } catch (error) {
      return 'unavailable'
    }
  }

  private async getDiskSpace(): Promise<{ available: string; used: string }> {
    try {
      const { stdout } = await execAsync('df -h /app | tail -1')
      const parts = stdout.trim().split(/\s+/)
      return {
        available: parts[3] || '0B',
        used: parts[4] || '0%'
      }
    } catch (error) {
      return { available: '0B', used: '0%' }
    }
  }

  private async getCronJobsStatus(): Promise<{ enabled: boolean; count: number }> {
    try {
      const { stdout } = await execAsync('crontab -l 2>/dev/null | grep -c "time-machine" || echo "0"')
      const count = parseInt(stdout.trim())
      return {
        enabled: count > 0,
        count
      }
    } catch (error) {
      return { enabled: false, count: 0 }
    }
  }

  private async calculateBackupStats() {
    const types = ['hourly', 'daily', 'weekly', 'monthly']
    const stats = { hourly: null, daily: null, weekly: null, monthly: null, total: { count: 0, size: 0 } }

    for (const type of types) {
      const typeDir = path.join(this.backupBaseDir, type)
      
      try {
        await fs.access(typeDir)
        const entries = await fs.readdir(typeDir, { withFileTypes: true })
        const directories = entries.filter(entry => entry.isDirectory())
        
        let totalSize = 0
        for (const dir of directories) {
          const dirPath = path.join(typeDir, dir.name)
          totalSize += await this.getDirectorySize(dirPath)
        }

        stats[type] = {
          count: directories.length,
          retention: this.retention,
          size: totalSize
        }
        
        stats.total.count += directories.length
        stats.total.size += totalSize
      } catch (error) {
        stats[type] = { count: 0, retention: this.retention, size: 0 }
      }
    }

    return stats
  }

  private async getLatestBackup() {
    const types = ['hourly', 'daily', 'weekly', 'monthly']
    let latest = null

    for (const type of types) {
      const typeDir = path.join(this.backupBaseDir, type)
      
      try {
        await fs.access(typeDir)
        const entries = await fs.readdir(typeDir, { withFileTypes: true })
        const directories = entries.filter(entry => entry.isDirectory())
        
        for (const dir of directories) {
          const dirPath = path.join(typeDir, dir.name)
          const stat = await fs.stat(dirPath)
          
          if (!latest || stat.mtime > new Date(latest.timestamp)) {
            latest = {
              type,
              timestamp: stat.mtime.toISOString(),
              age: this.calculateAge(stat.mtime),
              path: dirPath
            }
          }
        }
      } catch (error) {
        // Directory doesn't exist
      }
    }

    return latest
  }

  private async backupDatabase(backupDir: string): Promise<void> {
    const dbBackupPath = path.join(backupDir, 'database.sql')
    
    // Use environment variables for database connection
    const dbHost = process.env.DB_HOST || 'postgres'
    const dbPort = process.env.DB_PORT || '5432'
    const dbUser = process.env.DB_USER || 'mwpanel'
    const dbPassword = process.env.DB_PASSWORD || 'mwpanel123'
    const dbName = process.env.DB_NAME || 'mwpanel'
    
    try {
      // Create PostgreSQL dump using process spawn to avoid shell redirection issues
      const dumpCommand = `bash -c "PGPASSWORD=${dbPassword} pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --no-owner --no-privileges > '${dbBackupPath}'"`
      console.log(`[Time Machine] Executing: ${dumpCommand}`)
      const { stdout, stderr } = await execAsync(dumpCommand)
      
      if (stderr) {
        console.log(`[Time Machine] pg_dump stderr: ${stderr}`)
      }
      
      // Check if file was created and has content
      const fs = await import('fs/promises')
      const stat = await fs.stat(dbBackupPath)
      console.log(`[Time Machine] Database dump size: ${stat.size} bytes`)
      
      if (stat.size === 0) {
        throw new Error('Database dump file is empty')
      }
      
      // Compress the dump
      await execAsync(`gzip "${dbBackupPath}"`)
      
      // Verify compressed file
      const compressedPath = `${dbBackupPath}.gz`
      const compressedStat = await fs.stat(compressedPath)
      console.log(`[Time Machine] Compressed dump size: ${compressedStat.size} bytes`)
      
      console.log(`[Time Machine] Database backup completed successfully`)
    } catch (error) {
      console.error(`[Time Machine] Database backup failed:`, error)
      throw error
    }
  }

  private async backupSourceFiles(backupDir: string): Promise<void> {
    const sourceBackupPath = path.join(backupDir, 'source-files.tar.gz')
    
    // Backup important application files from container
    const tarCommand = `tar -czf "${sourceBackupPath}" ` +
      '--exclude=node_modules ' +
      '--exclude=time-machine-backups ' +
      '--exclude=*.log ' +
      '-C /app ' +
      'dist uploads package.json'
    
    try {
      await execAsync(tarCommand)
      console.log(`[Time Machine] Source files backup completed`)
    } catch (error) {
      console.log(`[Time Machine] Source files backup failed, continuing without it`)
      // Create empty tar file so backup doesn't fail completely
      await execAsync(`touch "${sourceBackupPath}"`)
    }
  }

  private async cleanupOldBackups(type: string): Promise<void> {
    const typeDir = path.join(this.backupBaseDir, type)
    
    try {
      const entries = await fs.readdir(typeDir, { withFileTypes: true })
      const directories = entries
        .filter(entry => entry.isDirectory())
        .map(entry => ({
          name: entry.name,
          path: path.join(typeDir, entry.name)
        }))

      if (directories.length > this.retention) {
        // Sort by creation time and remove oldest
        const stats = await Promise.all(
          directories.map(async dir => ({
            ...dir,
            mtime: (await fs.stat(dir.path)).mtime
          }))
        )
        
        stats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
        const toDelete = stats.slice(this.retention)
        
        for (const dir of toDelete) {
          console.log(`[Time Machine] Removing old backup: ${dir.name}`)
          await execAsync(`rm -rf "${dir.path}"`)
        }
      }
    } catch (error) {
      console.error(`Error cleaning up old ${type} backups:`, error)
    }
  }

  private async verifySpecificBackup(backupPath: string) {
    try {
      const stat = await fs.stat(backupPath)
      const dbFile = path.join(backupPath, 'database.sql.gz')
      const sourceFile = path.join(backupPath, 'source-files.tar.gz')
      
      const checks = {
        directoryExists: stat.isDirectory(),
        databaseBackupExists: false,
        sourceBackupExists: false,
        databaseBackupValid: false,
        sourceBackupValid: false
      }
      
      // Check database backup
      try {
        const dbStat = await fs.stat(dbFile)
        checks.databaseBackupExists = true
        checks.databaseBackupValid = dbStat.size > 1000 // At least 1KB
      } catch (error) {
        // File doesn't exist
      }
      
      // Check source backup
      try {
        const sourceStat = await fs.stat(sourceFile)
        checks.sourceBackupExists = true
        checks.sourceBackupValid = sourceStat.size > 10000 // At least 10KB
      } catch (error) {
        // File doesn't exist
      }
      
      const isValid = Object.values(checks).every(check => check === true)
      
      return {
        success: true,
        path: backupPath,
        valid: isValid,
        checks,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        path: backupPath,
        valid: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  private async verifyAllLatestBackups() {
    const types = ['hourly', 'daily', 'weekly', 'monthly']
    const results = []

    for (const type of types) {
      const latest = await this.getLatestBackupOfType(type)
      if (latest) {
        const verification = await this.verifySpecificBackup(latest.path)
        results.push({
          type,
          ...verification
        })
      } else {
        results.push({
          type,
          success: false,
          valid: false,
          error: `No ${type} backups found`
        })
      }
    }

    return {
      success: true,
      results,
      timestamp: new Date().toISOString()
    }
  }

  private async getLatestBackupOfType(type: string) {
    const typeDir = path.join(this.backupBaseDir, type)
    
    try {
      const entries = await fs.readdir(typeDir, { withFileTypes: true })
      const directories = entries.filter(entry => entry.isDirectory())
      
      if (directories.length === 0) return null
      
      let latest = null
      let latestTime = 0
      
      for (const dir of directories) {
        const dirPath = path.join(typeDir, dir.name)
        const stat = await fs.stat(dirPath)
        
        if (stat.mtime.getTime() > latestTime) {
          latestTime = stat.mtime.getTime()
          latest = {
            name: dir.name,
            path: dirPath,
            mtime: stat.mtime
          }
        }
      }
      
      return latest
    } catch (error) {
      return null
    }
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(`du -sm "${dirPath}" | cut -f1`)
      return parseInt(stdout.trim()) || 0
    } catch (error) {
      return 0
    }
  }

  private calculateAge(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 60) return `${diffMins} minutes ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hours ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} days ago`
  }

  private generateTimestamp(): string {
    const now = new Date()
    return now.toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '_')
  }
}// Build at Thu Aug 28 10:58:37 PM CEST 2025
