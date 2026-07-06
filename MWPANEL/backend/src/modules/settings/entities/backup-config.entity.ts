import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('backup_config')
export class BackupConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: true })
  enableAutoBackup: boolean;

  @Column({ 
    type: 'enum',
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily'
  })
  backupFrequency: 'daily' | 'weekly' | 'monthly';

  @Column({ default: '02:00' })
  backupTime: string;

  @Column({ default: 10 })
  retentionCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastBackupTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextBackupTime: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}