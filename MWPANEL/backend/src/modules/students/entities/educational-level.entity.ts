import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { Cycle } from './cycle.entity';

export enum EducationalLevelCode {
  INFANTIL = 'INFANTIL',
  PRIMARIA = 'PRIMARIA',
  SECUNDARIA = 'SECUNDARIA',
}

@Entity('educational_levels')
export class EducationalLevel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: EducationalLevelCode,
    unique: true,
  })
  code: EducationalLevelCode;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => Cycle, (cycle) => cycle.educationalLevel)
  cycles: Cycle[];
}