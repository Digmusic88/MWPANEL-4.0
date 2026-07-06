import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OperativeDescriptor } from './operative-descriptor.entity';

export enum ExitProfileType {
  PRIMARY = 'PRIMARY', // Al finalizar Educación Primaria
  BASIC_EDUCATION = 'BASIC_EDUCATION', // Al término de la Enseñanza Básica (ESO)
}

/**
 * Perfil de Salida del alumnado
 * Define las competencias clave esperadas al finalizar cada etapa educativa
 * Es la piedra angular del currículo y el referente para la evaluación
 */
@Entity('exit_profiles')
export class ExitProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ExitProfileType,
    unique: true,
  })
  type: ExitProfileType;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  legalReference: string; // Referencia al decreto/normativa

  @OneToMany(() => OperativeDescriptor, (descriptor) => descriptor.exitProfile)
  operativeDescriptors: OperativeDescriptor[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}