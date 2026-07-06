import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Subject } from '../../students/entities/subject.entity';
import { EducationalLevel } from '../../students/entities/educational-level.entity';
import { EvaluationCriterion } from './evaluation-criterion.entity';
import { BasicKnowledge } from './basic-knowledge.entity';
import { Competency } from './competency.entity';

/**
 * Competencias Específicas de cada área/materia
 * Son los desempeños que el alumnado debe poder desplegar
 * en actividades o situaciones que requieren los saberes básicos
 * Conectan las competencias clave con los saberes básicos y criterios de evaluación
 */
@Entity('specific_competencies')
export class SpecificCompetency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string; // ej: "CE.MAT.1", "CE.LCL.2"

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int', default: 0 })
  order: number; // Orden dentro de la materia

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @Column('uuid')
  subjectId: string;

  @ManyToOne(() => EducationalLevel)
  @JoinColumn({ name: 'educationalLevelId' })
  educationalLevel: EducationalLevel;

  @Column('uuid')
  educationalLevelId: string;

  // Relación con competencias clave a través de descriptores operativos
  @ManyToMany(() => Competency)
  @JoinTable({
    name: 'specific_competency_key_mapping',
    joinColumn: { name: 'specificCompetencyId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'competencyId', referencedColumnName: 'id' },
  })
  keyCompetencies: Competency[];

  @OneToMany(() => EvaluationCriterion, (criterion) => criterion.specificCompetency)
  evaluationCriteria: EvaluationCriterion[];

  @OneToMany(() => BasicKnowledge, (knowledge) => knowledge.specificCompetency)
  basicKnowledge: BasicKnowledge[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}