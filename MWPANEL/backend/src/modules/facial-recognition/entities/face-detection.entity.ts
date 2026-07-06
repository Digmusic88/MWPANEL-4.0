import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Student } from '../../students/entities/student.entity';
import { GroupPhoto } from './group-photo.entity';

export interface FaceCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FacialEmbedding {
  vector: number[];
  algorithm: string;
  version: string;
}

@Entity('face_detections')
export class FaceDetection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupPhotoId: string;

  @Column({ type: 'jsonb' })
  faceCoordinates: FaceCoordinates;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  confidenceScore: number;

  @Column({ type: 'uuid', nullable: true })
  assignedStudentId: string;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  assignedById: string;

  @Column({ type: 'jsonb', nullable: true })
  facialEmbedding: FacialEmbedding;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => GroupPhoto, (groupPhoto) => groupPhoto.faceDetections, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'groupPhotoId' })
  groupPhoto: GroupPhoto;

  @ManyToOne(() => Student, { nullable: true })
  @JoinColumn({ name: 'assignedStudentId' })
  assignedStudent: Student;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedById' })
  assignedBy: User;
}