import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('student_curriculum_audit_log')
export class StudentCurriculumAuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) studentId: string;
  @Column({ type: 'uuid' }) subjectId: string;
  @Column({ type: 'uuid' }) academicYearId: string;
  @Column({ type: 'varchar', length: 32 }) action: string;
  @Column({ type: 'jsonb', nullable: true }) oldValue?: any;
  @Column({ type: 'jsonb', nullable: true }) newValue?: any;
  @Column({ type: 'text', default: '' }) reason: string;
  @Column({ type: 'uuid', nullable: true }) changedById?: string | null;
  @CreateDateColumn() createdAt: Date;
}
