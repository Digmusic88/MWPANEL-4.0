import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ schema: 'secretaria', name: 'students' })
export class Student {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'mwpanel_student_id', nullable: true }) mwpanelStudentId: string;
  @Column({ name: 'family_id', nullable: true }) familyId: string;
  @Column({ name: 'first_name', nullable: true }) firstName: string;
  @Column({ name: 'last_name', nullable: true }) lastName: string;
  @Column({ name: 'birth_date', type: 'date', nullable: true }) birthDate: string;
  @Column({ name: 'grade_label', nullable: true }) gradeLabel: string;
  @Column({ name: 'school_origin', nullable: true }) schoolOrigin: string;
  @Column({ nullable: true }) address: string;
  @Column({ name: 'postal_code', nullable: true }) postalCode: string;
  @Column({ nullable: true }) city: string;
  @Column({ nullable: true }) notes: string;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
}

@Entity({ schema: 'secretaria', name: 'enrollments' })
export class Enrollment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'student_id' }) studentId: string;
  @Column({ name: 'academic_year_id' }) academicYearId: string;
  @Column({ name: 'service_id' }) serviceId: string;
  @Column({ name: 'group_id', nullable: true }) groupId: string;
  @Column({ default: 'preinscrito' }) status: string;
  @Column({ name: 'custom_fee', type: 'numeric', nullable: true }) customFee: number;
  @Column({ name: 'custom_fee_reason', nullable: true }) customFeeReason: string;
  @Column({ nullable: true }) notes: string;
}
