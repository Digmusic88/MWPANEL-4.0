import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('student_notes_config')
export class StudentNotesConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'config_key', unique: true })
  key: string;

  @Column({ name: 'config_value', type: 'text' })
  value: string;

  @Column({ name: 'config_type', default: 'string' })
  type: 'string' | 'number' | 'boolean' | 'json';

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}