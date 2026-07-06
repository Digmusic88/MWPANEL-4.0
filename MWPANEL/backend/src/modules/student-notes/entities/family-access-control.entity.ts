import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Family } from '../../users/entities/family.entity';

@Entity('family_access_controls')
@Index(['studentId', 'familyId'], { unique: true })
export class FamilyAccessControl {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ type: 'uuid' })
  familyId: string;

  @ManyToOne(() => Family)
  @JoinColumn({ name: 'familyId' })
  family: Family;

  // Basic access controls
  @Column({ type: 'boolean', default: true })
  canViewNotes: boolean;

  @Column({ type: 'boolean', default: false })
  canDownloadFiles: boolean;

  @Column({ type: 'boolean', default: true })
  canViewMetadata: boolean; // creation date, subject, etc.

  // Content filtering
  @Column({ type: 'json', nullable: true })
  allowedSubjects: string[]; // ["Matemáticas", "Ciencias"] or null for all

  @Column({ type: 'json', nullable: true })
  blockedSubjects: string[]; // ["Educación Física"] or null for none

  @Column({ type: 'json', nullable: true })
  allowedNoteTypes: string[]; // ["text", "image", "document"] or null for all

  @Column({ type: 'json', nullable: true })
  blockedNoteTypes: string[]; // ["audio", "video"] or null for none

  // Time-based restrictions
  @Column({ type: 'time', nullable: true })
  accessStartTime: string; // "08:00"

  @Column({ type: 'time', nullable: true })
  accessEndTime: string; // "22:00"

  @Column({ type: 'boolean', default: false })
  weekendRestriction: boolean; // Block access on weekends

  @Column({ type: 'json', nullable: true })
  allowedDaysOfWeek: number[]; // [1,2,3,4,5] (Mon-Fri) or null for all days

  // Usage limits
  @Column({ type: 'integer', default: 0 })
  maxDailyViews: number; // 0 = unlimited

  @Column({ type: 'integer', default: 0 })
  maxDailyDownloads: number; // 0 = unlimited

  @Column({ type: 'integer', default: 30 })
  retentionDays: number; // How many days back family can view (0 = unlimited)

  // Approval and monitoring
  @Column({ type: 'boolean', default: false })
  requireStudentApproval: boolean; // Student must approve each view

  @Column({ type: 'boolean', default: true })
  logFamilyAccess: boolean; // Log all family access attempts

  @Column({ type: 'boolean', default: false })
  notifyStudentOnAccess: boolean; // Notify student when family views notes

  @Column({ type: 'boolean', default: false })
  notifyFamilyOnNewNote: boolean; // Notify family when student adds new note

  // Advanced filtering
  @Column({ type: 'integer', default: 0 })
  minNoteSizeBytes: number; // Minimum file size for family viewing

  @Column({ type: 'integer', default: 0 })
  maxNoteSizeBytes: number; // Maximum file size for family viewing (0 = unlimited)

  @Column({ type: 'json', nullable: true })
  bannedKeywords: string[]; // Keywords in title/description to block

  @Column({ type: 'json', nullable: true })
  requiredKeywords: string[]; // Keywords that must be present

  // Custom settings
  @Column({ type: 'json', nullable: true })
  customSettings: any; // Flexible field for future extensions

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods for checking permissions
  isAccessAllowed(currentTime: Date = new Date()): boolean {
    if (!this.canViewNotes) return false;

    // Check time restrictions
    if (this.accessStartTime && this.accessEndTime) {
      const timeStr = currentTime.toTimeString().substring(0, 5); // "HH:MM"
      if (timeStr < this.accessStartTime || timeStr > this.accessEndTime) {
        return false;
      }
    }

    // Check day of week restrictions
    if (this.weekendRestriction) {
      const dayOfWeek = currentTime.getDay(); // 0 = Sunday, 6 = Saturday
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false;
      }
    }

    if (this.allowedDaysOfWeek && this.allowedDaysOfWeek.length > 0) {
      const dayOfWeek = currentTime.getDay();
      if (!this.allowedDaysOfWeek.includes(dayOfWeek)) {
        return false;
      }
    }

    return true;
  }

  canAccessSubject(subject: string): boolean {
    // Check blocked subjects first
    if (this.blockedSubjects && this.blockedSubjects.includes(subject)) {
      return false;
    }

    // Check allowed subjects
    if (this.allowedSubjects && this.allowedSubjects.length > 0) {
      return this.allowedSubjects.includes(subject);
    }

    return true; // No restrictions means all subjects allowed
  }

  canAccessNoteType(noteType: string): boolean {
    // Check blocked note types first
    if (this.blockedNoteTypes && this.blockedNoteTypes.includes(noteType)) {
      return false;
    }

    // Check allowed note types
    if (this.allowedNoteTypes && this.allowedNoteTypes.length > 0) {
      return this.allowedNoteTypes.includes(noteType);
    }

    return true; // No restrictions means all types allowed
  }

  canAccessNoteSize(sizeBytes: number): boolean {
    if (this.minNoteSizeBytes > 0 && sizeBytes < this.minNoteSizeBytes) {
      return false;
    }

    if (this.maxNoteSizeBytes > 0 && sizeBytes > this.maxNoteSizeBytes) {
      return false;
    }

    return true;
  }

  hasContentViolation(title: string, description: string): boolean {
    const content = `${title} ${description}`.toLowerCase();

    // Check banned keywords
    if (this.bannedKeywords && this.bannedKeywords.length > 0) {
      for (const keyword of this.bannedKeywords) {
        if (content.includes(keyword.toLowerCase())) {
          return true;
        }
      }
    }

    // Check required keywords
    if (this.requiredKeywords && this.requiredKeywords.length > 0) {
      for (const keyword of this.requiredKeywords) {
        if (!content.includes(keyword.toLowerCase())) {
          return true; // Missing required keyword is a violation
        }
      }
    }

    return false;
  }
}