import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Entidad para escalas de calificación del sistema unificado
 * MW Panel 2.0 - Sistema de conversión automática
 */
@Entity('grading_scales')
@Index('idx_grading_scales_type', ['scale_type'])
@Index('idx_grading_scales_active', ['is_active'])
@Index('idx_grading_scales_default', ['is_default'])
export class GradingScale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ 
    type: 'varchar', 
    length: 50,
    enum: ['numeric', 'letter', 'emoji', 'descriptive', 'custom']
  })
  scale_type: 'numeric' | 'letter' | 'emoji' | 'descriptive' | 'custom';

  @Column({ type: 'jsonb' })
  conversion_rules: {
    formula: string;
    min_input: number;
    max_input: number;
    examples: Record<string, number>;
    [key: string]: any;
  };

  @Column({ type: 'boolean', default: false })
  is_default: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  created_by?: User;

  @Column({ type: 'uuid', nullable: true })
  created_by_id?: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}