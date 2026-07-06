import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { SpecificCompetency } from './specific-competency.entity';
import { Cycle } from '../../students/entities/cycle.entity';
import { Course } from '../../students/entities/course.entity';
import { Subject } from '../../students/entities/subject.entity';

/**
 * Saberes Básicos
 * Son los conocimientos, destrezas y actitudes que constituyen
 * los contenidos propios de un área/materia
 * Su aprendizaje es necesario para la adquisición de las competencias específicas
 */
@Entity('basic_knowledge')
export class BasicKnowledge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string; // ej: "A.1.1", "B.2.3"

  @Column()
  block: string; // Bloque temático, ej: "A. Números y operaciones"

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @ManyToOne(() => SpecificCompetency, (competency) => competency.basicKnowledge, { nullable: true })
  @JoinColumn({ name: 'specificCompetencyId' })
  specificCompetency: SpecificCompetency;

  @Column('uuid', { nullable: true })
  specificCompetencyId: string;

  // Para Infantil y Primaria - por ciclo
  @ManyToOne(() => Cycle, { nullable: true })
  @JoinColumn({ name: 'cycleId' })
  cycle: Cycle;

  @Column('uuid', { nullable: true })
  cycleId: string;

  // Para ESO - por curso
  @ManyToOne(() => Course, { nullable: true })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column('uuid', { nullable: true })
  courseId: string;

  // Ancla de ÁREA: un saber básico cuelga del área (subject) + ciclo, no de una CE.
  @ManyToOne(() => Subject, { nullable: true })
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @Column('uuid', { nullable: true })
  subjectId: string;

  // Tipos de saber
  @Column({
    type: 'enum',
    enum: ['KNOWLEDGE', 'SKILL', 'ATTITUDE'],
    default: 'KNOWLEDGE',
  })
  knowledgeType: 'KNOWLEDGE' | 'SKILL' | 'ATTITUDE';

  // Para DUA - múltiples representaciones
  @Column('text', { array: true, nullable: true })
  alternativeRepresentations: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}