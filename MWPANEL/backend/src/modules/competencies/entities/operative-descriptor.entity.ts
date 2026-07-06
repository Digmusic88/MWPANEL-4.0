import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ExitProfile } from './exit-profile.entity';
import { Competency } from './competency.entity';

/**
 * Descriptores Operativos de las Competencias Clave
 * Concretan el nivel de desempeño esperado para cada competencia
 * al finalizar cada etapa educativa (Primaria o ESO)
 */
@Entity('operative_descriptors')
export class OperativeDescriptor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string; // ej: "CCL1", "CCL2", "STEM1", etc.

  @Column({ type: 'text' })
  description: string; // Descripción detallada del descriptor

  @Column({ type: 'text', nullable: true })
  shortDescription?: string; // Versión resumida del descriptor

  @Column({ type: 'int' })
  order: number; // Orden dentro de la competencia

  @ManyToOne(() => ExitProfile, (profile) => profile.operativeDescriptors)
  @JoinColumn({ name: 'exitProfileId' })
  exitProfile: ExitProfile;

  @Column('uuid')
  exitProfileId: string;

  @ManyToOne(() => Competency)
  @JoinColumn({ name: 'competencyId' })
  competency: Competency;

  @Column('uuid')
  competencyId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}