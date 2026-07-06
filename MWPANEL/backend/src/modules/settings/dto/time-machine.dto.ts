import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsIn, IsOptional } from 'class-validator'

export class CreateBackupDto {
  @ApiProperty({
    description: 'Type of backup to create',
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    example: 'hourly'
  })
  @IsString()
  @IsIn(['hourly', 'daily', 'weekly', 'monthly'])
  type: 'hourly' | 'daily' | 'weekly' | 'monthly'
}

export class VerifyBackupDto {
  @ApiProperty({
    description: 'Optional specific backup path to verify',
    required: false,
    example: '/app/time-machine-backups/hourly/20250828_194559'
  })
  @IsOptional()
  @IsString()
  backupPath?: string
}

export interface BackupStats {
  hourly: BackupTypeStats
  daily: BackupTypeStats
  weekly: BackupTypeStats
  monthly: BackupTypeStats
  total: {
    count: number
    size: number
  }
}

export interface BackupTypeStats {
  count: number
  retention: number
  size: number
}

export interface BackupItem {
  type: string
  timestamp: string
  size: string
  age: string
  path: string
  date: string
}

export interface BackupStatus {
  containerStatus: string
  databaseStatus: string
  diskSpace: {
    available: string
    used: string
  }
  cronJobs: {
    enabled: boolean
    count: number
  }
  backupStats: BackupStats
  latestBackup: {
    type: string
    timestamp: string
    age: string
    path: string
  } | null
  timestamp: string
}

export interface BackupListResponse {
  success: boolean
  backups: BackupItem[]
  stats: {
    total: number
    byType: Array<{
      type: string
      count: number
      totalSize: number
      latest: string | null
      oldest: string | null
    }>
    totalSizeMB: number
  }
  timestamp: string
}