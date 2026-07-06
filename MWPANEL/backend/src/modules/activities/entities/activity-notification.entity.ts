import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ActivityAssessment } from './activity-assessment.entity';
import { Family } from '../../users/entities/family.entity';

@Entity('activity_notifications')
export class ActivityNotification {
  @ApiProperty({ description: 'ID único de la notificación' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Fecha en que la familia vio la notificación' })
  @Column({ type: 'timestamp', nullable: true })
  viewedAt?: Date;

  @ApiProperty({ description: 'ID de la valoración' })
  @Column({ name: 'assessment_id' })
  assessmentId: string;

  @ApiProperty({ description: 'ID de la familia' })
  @Column({ name: 'family_id' })
  familyId: string;

  // Relaciones
  @ManyToOne(() => ActivityAssessment, (assessment) => assessment.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessment_id' })
  assessment: ActivityAssessment;

  @ManyToOne(() => Family, (family) => family.id)
  @JoinColumn({ name: 'family_id' })
  family: Family;

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  createdAt: Date;
}