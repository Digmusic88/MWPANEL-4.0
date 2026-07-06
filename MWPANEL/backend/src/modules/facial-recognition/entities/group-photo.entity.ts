import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';
import { FaceDetection } from './face-detection.entity';

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('group_photos')
export class GroupPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  originalFilename: string;

  @Column({ type: 'varchar', length: 500 })
  originalUrl: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  uploadDate: Date;

  @Column({ type: 'uuid' })
  uploadedById: string;

  @Column({ type: 'uuid', nullable: true })
  classGroupId: string;

  @Column({
    type: 'enum',
    enum: ProcessingStatus,
    default: ProcessingStatus.PENDING,
  })
  processingStatus: ProcessingStatus;

  @Column({ type: 'integer', default: 0 })
  facesDetected: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    width?: number;
    height?: number;
    fileSize?: number;
    mimeType?: string;
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @ManyToOne(() => ClassGroup, { nullable: true })
  @JoinColumn({ name: 'classGroupId' })
  classGroup: ClassGroup;

  @OneToMany(() => FaceDetection, (faceDetection) => faceDetection.groupPhoto, {
    cascade: true,
  })
  faceDetections: FaceDetection[];
}