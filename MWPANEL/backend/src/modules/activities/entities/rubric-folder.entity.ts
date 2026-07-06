import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Rubric } from './rubric.entity';

@Entity('rubric_folders')
@Index(['teacherId', 'isActive'])
@Index(['parentFolderId'])
export class RubricFolder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ 
    type: 'varchar', 
    length: 7, 
    nullable: true,
    comment: 'Color hexadecimal para la carpeta (#RRGGBB)'
  })
  color?: string;

  @Column({ 
    type: 'varchar', 
    length: 50, 
    nullable: true, 
    default: 'folder',
    comment: 'Icono de Ant Design para la carpeta'
  })
  icon?: string;

  @Column({ 
    name: 'parent_folder_id',
    type: 'uuid', 
    nullable: true,
    comment: 'ID de la carpeta padre (null para carpeta raíz)'
  })
  parentFolderId?: string;

  @Column({ 
    name: 'teacher_id',
    type: 'uuid',
    comment: 'Propietario de la carpeta'
  })
  teacherId: string;

  @Column({ 
    name: 'is_shared',
    type: 'boolean', 
    default: false,
    comment: 'Si la carpeta es compartida con otros profesores'
  })
  isShared: boolean;

  @Column({ 
    name: 'shared_with',
    type: 'uuid', 
    array: true, 
    nullable: true,
    comment: 'Array de IDs de profesores con acceso'
  })
  sharedWith?: string[];

  @Column({ 
    name: 'order_index',
    type: 'integer', 
    default: 0,
    comment: 'Orden de visualización dentro de la carpeta padre'
  })
  orderIndex: number;

  @Column({ 
    name: 'is_system_folder',
    type: 'boolean', 
    default: false,
    comment: 'Si es una carpeta del sistema (no editable por usuarios)'
  })
  isSystemFolder: boolean;

  @Column({ 
    name: 'is_active',
    type: 'boolean', 
    default: true 
  })
  isActive: boolean;

  @CreateDateColumn({ 
    name: 'created_at',
    type: 'timestamp with time zone'
  })
  createdAt: Date;

  @UpdateDateColumn({ 
    name: 'updated_at',
    type: 'timestamp with time zone'
  })
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Teacher, { eager: false })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @ManyToOne(() => RubricFolder, folder => folder.subfolders, { nullable: true })
  @JoinColumn({ name: 'parent_folder_id' })
  parentFolder?: RubricFolder;

  @OneToMany(() => RubricFolder, folder => folder.parentFolder)
  subfolders: RubricFolder[];

  @OneToMany(() => Rubric, rubric => rubric.folder)
  rubrics: Rubric[];

  // Métodos helper
  get fullPath(): string {
    if (!this.parentFolder) {
      return this.name;
    }
    return `${this.parentFolder.fullPath}/${this.name}`;
  }

  get isRoot(): boolean {
    return this.parentFolderId === null;
  }

  get hasSubfolders(): boolean {
    return this.subfolders && this.subfolders.length > 0;
  }

  get totalRubrics(): number {
    let total = this.rubrics?.length || 0;
    if (this.subfolders) {
      total += this.subfolders.reduce((sum, folder) => sum + folder.totalRubrics, 0);
    }
    return total;
  }
}