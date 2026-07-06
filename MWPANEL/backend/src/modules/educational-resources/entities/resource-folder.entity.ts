/**
 * @archivo: resource-folder.entity.ts
 * @módulo: Educational Resources - Carpetas Personalizadas
 * @función: Organización jerárquica de recursos por carpetas personalizadas
 * @jerarquía: Asignatura > Carpeta personalizada > Recurso
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Subject } from '../../students/entities/subject.entity';
import { EducationalResource } from './educational-resource.entity';

@Entity('resource_folders')
export class ResourceFolder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  @Index('IDX_resource_folders_subjectId')
  subjectId: string;

  @Column()
  @Index('IDX_resource_folders_createdById')
  createdById: string;

  // Permite crear subcarpetas (carpetas dentro de carpetas)
  @Column({ nullable: true })
  @Index('IDX_resource_folders_parentFolderId')
  parentFolderId: string;

  // Color personalizado para la carpeta (opcional)
  @Column({ default: '#1890ff' })
  color: string;

  // Orden de visualización (para que el profesor pueda ordenar sus carpetas)
  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Subject, { eager: true })
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  // Relación recursiva para subcarpetas
  @ManyToOne(() => ResourceFolder, folder => folder.subfolders, { nullable: true })
  @JoinColumn({ name: 'parentFolderId' })
  parentFolder: ResourceFolder;

  @OneToMany(() => ResourceFolder, folder => folder.parentFolder)
  subfolders: ResourceFolder[];

  // Recursos dentro de esta carpeta
  @OneToMany(() => EducationalResource, resource => resource.folder)
  resources: EducationalResource[];
}
