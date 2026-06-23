import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ schema: 'secretaria', name: 'academic_years' })
export class AcademicYear {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() label: string;
  @Column({ name: 'start_date', type: 'date' }) startDate: string;
  @Column({ name: 'end_date', type: 'date' }) endDate: string;
  @Column({ name: 'is_active' }) isActive: boolean;
  @Column({ name: 'is_enrollment_open' }) isEnrollmentOpen: boolean;
}

@Entity({ schema: 'secretaria', name: 'services' })
export class Service {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() code: string;
  @Column() name: string;
  @Column({ nullable: true }) color: string;
}

@Entity({ schema: 'secretaria', name: 'programs' })
export class Program {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'service_id' }) serviceId: string;
  @Column() name: string;
  @Column({ name: 'level_order', nullable: true }) levelOrder: number;
  @Column({ nullable: true }) capacity: number;
  @Column({ name: 'bills_matricula', default: true }) billsMatricula: boolean;
  @Column({ name: 'bills_material', default: false }) billsMaterial: boolean;
  @Column({ name: 'bills_july', default: false }) billsJuly: boolean;
  @Column({ name: 'bills_august', default: false }) billsAugust: boolean;
  // Mapa mes→factor de cobro: { "09":1, ..., "06":0.5, "07":0, "08":0 }
  @Column({ name: 'month_billing', type: 'jsonb', nullable: true }) monthBilling: Record<string, number>;
  // Nivel Cambridge para sincronización con Mocks (null = no sincroniza)
  @Column({ name: 'mock_exam_type', nullable: true }) mockExamType: string;
}

@Entity({ schema: 'secretaria', name: 'groups' })
export class Group {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'academic_year_id' }) academicYearId: string;
  @Column({ name: 'program_id' }) programId: string;
  @Column() name: string;
  @Column({ name: 'teacher_id', nullable: true }) teacherId: string;
  @Column({ nullable: true }) room: string;
  @Column({ nullable: true }) capacity: number;
  @Column({ nullable: true }) notes: string;
  @Column({ nullable: true }) color: string;
  @Column({ name: 'sort_order', default: 0 }) sortOrder: number;
  @Column({ name: 'bills_maillot', default: false }) billsMaillot: boolean;
}
