import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum BackupType {
  LOCAL = 'local',
  GOOGLE_DRIVE = 'google_drive',
  BOTH = 'both',
  TIME_MACHINE_HOURLY = 'time-machine-hourly',
  TIME_MACHINE_DAILY = 'time-machine-daily',
  TIME_MACHINE_WEEKLY = 'time-machine-weekly',
  TIME_MACHINE_MONTHLY = 'time-machine-monthly'
}

export enum BackupStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial'
}

@Entity('backup_records')
export class BackupRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'enum', enum: BackupType })
  type: BackupType;

  @Column({ type: 'enum', enum: BackupStatus, default: BackupStatus.PENDING })
  status: BackupStatus;

  @Column({ type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  localPath: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  driveFileId: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  driveFileName: string;

  @Column({ type: 'timestamp', nullable: true })
  backupStartTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  backupEndTime: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'text', nullable: true })
  logs: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string;

  @Column({ type: 'boolean', default: false })
  isEncrypted: boolean;

  @Column({ type: 'json', nullable: true })
  metadata: {
    databaseSize?: number;
    compressionRatio?: number;
    uploadDuration?: number;
    downloadDuration?: number;
    driveStorageUsed?: number;
    retentionDate?: string;
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  getDurationInSeconds(): number {
    if (!this.backupStartTime || !this.backupEndTime) return 0;
    return Math.floor((this.backupEndTime.getTime() - this.backupStartTime.getTime()) / 1000);
  }

  isExpired(retentionDays: number = 30): boolean {
    const expirationDate = new Date(this.createdAt);
    expirationDate.setDate(expirationDate.getDate() + retentionDays);
    return new Date() > expirationDate;
  }

  getFormattedSize(): string {
    if (!this.fileSize) return 'Unknown';
    
    const bytes = this.fileSize;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  getStatusColor(): string {
    switch (this.status) {
      case BackupStatus.COMPLETED:
        return 'green';
      case BackupStatus.FAILED:
        return 'red';
      case BackupStatus.IN_PROGRESS:
        return 'blue';
      case BackupStatus.PARTIAL:
        return 'orange';
      default:
        return 'gray';
    }
  }

  toJSON() {
    return {
      id: this.id,
      filename: this.filename,
      type: this.type,
      status: this.status,
      fileSize: this.fileSize,
      formattedSize: this.getFormattedSize(),
      localPath: this.localPath,
      driveFileId: this.driveFileId,
      driveFileName: this.driveFileName,
      backupStartTime: this.backupStartTime,
      backupEndTime: this.backupEndTime,
      duration: this.getDurationInSeconds(),
      errorMessage: this.errorMessage,
      logs: this.logs,
      checksum: this.checksum,
      isEncrypted: this.isEncrypted,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      statusColor: this.getStatusColor(),
      isExpired: this.isExpired()
    };
  }
}