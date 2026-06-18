import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ schema: 'secretaria', name: 'families' })
export class Family {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'display_name' }) displayName: string;
  @Column({ name: 'mwpanel_family_id', nullable: true }) mwpanelFamilyId: string;
  @Column({ nullable: true }) notes: string;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }) createdAt: Date;
}

@Entity({ schema: 'secretaria', name: 'guardians' })
export class Guardian {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'family_id' }) familyId: string;
  @Column({ name: 'full_name' }) fullName: string;
  @Column({ default: 'tutor' }) relationship: string;
  @Column({ nullable: true }) nif: string;
  @Column({ nullable: true }) phone: string;
  @Column({ name: 'phone_alt', nullable: true }) phoneAlt: string;
  @Column({ nullable: true }) email: string;
  @Column({ name: 'is_primary_contact', default: false }) isPrimaryContact: boolean;
}
