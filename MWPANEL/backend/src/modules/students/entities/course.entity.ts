import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Cycle } from './cycle.entity';
import { Subject } from './subject.entity';

/**
 * Cursos académicos dentro de cada ciclo
 * Educación Infantil: 3 cursos por ciclo (0-1-2 años, 3-4-5 años)
 * Educación Primaria: 2 cursos por ciclo (1º-2º, 3º-4º, 5º-6º)
 * ESO: 4 cursos independientes
 */
@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // ej: "1º Primaria", "3 años", "2º ESO"

  @Column({ unique: true })
  code: string; // ej: "1EP", "3EI", "2ESO"

  @Column()
  order: number; // Orden dentro del ciclo o etapa

  @Column({ type: 'int', nullable: true })
  ageReference: number; // Edad de referencia

  @Column({ nullable: true })
  academicYear: string;

  @ManyToOne(() => Cycle, (cycle) => cycle.courses)
  @JoinColumn({ name: 'cycleId' })
  cycle: Cycle;

  @Column('uuid', { nullable: true })
  cycleId: string;

  @OneToMany(() => Subject, (subject) => subject.course)
  subjects: Subject[];
}