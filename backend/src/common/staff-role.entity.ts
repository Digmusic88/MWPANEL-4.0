import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
@Entity({ schema: 'secretaria', name: 'staff_roles' })
export class StaffRole {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column() role: string;
}
