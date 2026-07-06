import { IsString, IsOptional, IsBoolean, IsNumber, Min, Max, IsEnum, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BackupType } from '../entities/backup-record.entity';

export class CreateBackupDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  uploadToDrive?: boolean = false;

  @IsOptional()
  @IsBoolean()
  skipLocal?: boolean = false;

  @IsOptional()
  @IsString()
  customName?: string;
}

export class BackupConfigDto {
  @IsOptional()
  @IsBoolean()
  cloudBackupEnabled?: boolean;

  @IsOptional()
  @IsString()
  backupFrequency?: string; // 'daily', 'weekly', 'monthly'

  @IsOptional()
  @IsString()
  backupTime?: string; // HH:MM format

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  retentionDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  cloudRetentionDays?: number;

  @IsOptional()
  @IsBoolean()
  encryptBackups?: boolean;

  @IsOptional()
  @IsString()
  driveFolder?: string;

  @IsOptional()
  @IsBoolean()
  autoCleanup?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  maxConcurrentUploads?: number;
}

export class DriveUploadDto {
  @IsString()
  filePath: string;

  @IsOptional()
  @IsString()
  customName?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class DriveDownloadDto {
  @IsString()
  fileId: string;

  @IsString()
  destinationPath: string;

  @IsOptional()
  @IsBoolean()
  overwrite?: boolean = false;
}

export class BackupListQueryDto {
  @IsOptional()
  @IsEnum(BackupType)
  type?: BackupType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class RestoreBackupDto {
  @IsOptional()
  @IsString()
  backupId?: string; // For local backup by record ID

  @IsOptional()
  @IsString()
  driveFileId?: string; // For Google Drive backup

  @IsOptional()
  @IsString()
  localFilePath?: string; // For direct file path

  @IsOptional()
  @IsBoolean()
  createPreRestoreBackup?: boolean = true;

  @IsOptional()
  @IsBoolean()
  skipDataValidation?: boolean = false;

  @IsOptional()
  @IsString()
  restoreToDatabase?: string; // Optional different database name

  @IsOptional()
  @IsString()
  confirmationToken?: string; // Security token for confirmation
}

export class SyncBackupsDto {
  @IsOptional()
  @IsString()
  direction?: 'upload' | 'download' | 'both' = 'upload';

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean = false;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxFiles?: number = 50;

  @IsOptional()
  @IsString()
  pattern?: string; // Regex pattern for file matching
}

export class BackupStatsDto {
  totalBackups: number;
  localBackups: number;
  driveBackups: number;
  totalSize: number;
  averageSize: number;
  lastBackupDate: Date;
  nextScheduledBackup: Date;
  driveStorageUsed: number;
  driveStorageAvailable: number;
  successRate: number;
  recentFailures: number;
}

export class DriveStatusDto {
  connected: boolean;
  authenticated: boolean;
  totalStorage?: number;
  usedStorage?: number;
  availableStorage?: number;
  backupCount?: number;
  lastSyncDate?: Date;
  error?: string;
  quotaWarning?: boolean;
  folderPermissions?: {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
  };
}