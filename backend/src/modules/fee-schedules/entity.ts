import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
@Entity({ schema: 'secretaria', name: 'fee_schedules' })
export class FeeSchedule {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'academic_year_id' }) academicYearId: string;
  @Column({ name: 'service_id' }) serviceId: string;
  @Column({ name: 'program_id', nullable: true }) programId: string;
  @Column({ name: 'group_id', nullable: true }) groupId: string;
  @Column() concept: string;
  @Column({ type: 'numeric' }) amount: number;
  @Column({ nullable: true }) label: string;
  // NOTA: la columna física 'siblings_discount_eur' sigue en BD pero está EN DESUSO.
  // El descuento por hermanos se configura en org_settings ('sibling_discount_eur'), no aquí.
  @Column({ name: 'is_active', default: true }) isActive: boolean;
}
