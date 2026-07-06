import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Family } from '../../users/entities/family.entity';
import { User } from '../../users/entities/user.entity';
import { StudentNote } from './student-note.entity';

export enum AccessAction {
  VIEW = 'view',
  DOWNLOAD = 'download',
  DENIED = 'denied',
  SEARCH = 'search',
  FILTER = 'filter'
}

@Entity('family_access_logs')
@Index(['familyId', 'createdAt'])
@Index(['studentId', 'createdAt'])
@Index(['action', 'createdAt'])
export class FamilyAccessLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  familyId: string;

  @ManyToOne(() => Family)
  @JoinColumn({ name: 'familyId' })
  family: Family;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ type: 'uuid' })
  familyUserId: string; // Which family member (primary/secondary contact)

  @ManyToOne(() => User)
  @JoinColumn({ name: 'familyUserId' })
  familyUser: User;

  @Column({ type: 'uuid', nullable: true })
  noteId: string; // Specific note accessed (null for general actions)

  @ManyToOne(() => StudentNote, { nullable: true })
  @JoinColumn({ name: 'noteId' })
  note: StudentNote;

  @Column({ type: 'enum', enum: AccessAction })
  action: AccessAction;

  @Column({ type: 'varchar', length: 255, nullable: true })
  noteType: string; // Type of note accessed (text, image, etc.)

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject: string; // Subject of note accessed

  @Column({ type: 'boolean', default: true })
  accessGranted: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  denialReason: string; // Why access was denied

  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string;

  @Column({ type: 'json', nullable: true })
  searchFilters: any; // Filters used in search/view requests

  @Column({ type: 'json', nullable: true })
  metadata: any; // Additional context information

  @CreateDateColumn()
  createdAt: Date;

  // Daily usage tracking helpers
  static async getDailyViewCount(
    familyId: string,
    studentId: string,
    date: Date = new Date()
  ): Promise<number> {
    // This would typically be implemented in the service
    // Placeholder for method signature
    return 0;
  }

  static async getDailyDownloadCount(
    familyId: string,
    studentId: string,
    date: Date = new Date()
  ): Promise<number> {
    // This would typically be implemented in the service
    // Placeholder for method signature
    return 0;
  }
}