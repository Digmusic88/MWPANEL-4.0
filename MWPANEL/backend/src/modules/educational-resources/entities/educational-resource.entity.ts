/**
 * @archivo: educational-resource.entity.ts
 * @módulo: Educational Resources (Sistema de Recursos Didácticos)
 * @función: Gestión de recursos educativos con integración Google Drive
 * @crítico: SÍ - Sistema recién reparado y funcional al 100%
 * @dependencias: User, Subject, EducationalLevel, Google Drive Service
 * @no_modificar: ResourceType enum sin verificar compatibilidad Drive
 * @relacionado_con: google-drive.service.ts, educational-resources.service.ts
 */

/**
 * TABLA: educational_resources
 * USO ACTUAL: Recursos educativos subidos por PROFESORES/ADMIN
 * FUNCIONALIDAD: Subida automática a Google Drive + base de datos
 * RELACIONES: 
 *   - users (N:1) - Autor del recurso
 *   - subjects (N:1) - Asignatura del recurso
 *   - educational_levels (N:1) - Nivel educativo
 *   - resource_assignments (1:N) - Asignaciones a grupos
 *   - resource_views (1:N) - Visualizaciones
 *   - resource_favorites (1:N) - Favoritos de usuarios
 * 
 * INTEGRACIÓN GOOGLE DRIVE:
 * - Subida automática con estructura de carpetas
 * - Links directos de visualización/descarga
 * - Sincronización bidireccional
 * - Shared Drive: "12. Plataforma (Recursos dicácticos compartidos)"
 * 
 * ESTADO ACTUAL: ✅ FUNCIONAL 100% (reparado 2025-07-12)
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
import { EducationalLevel } from '../../students/entities/educational-level.entity';
import { AcademicYear } from '../../students/entities/academic-year.entity';
import { ResourceAssignment } from './resource-assignment.entity';
import { ResourceView } from './resource-view.entity';
import { ResourceComment } from './resource-comment.entity';
import { ResourceFavorite } from './resource-favorite.entity';
import { ResourceFolder } from './resource-folder.entity';

// CRÍTICO: ResourceType - Define tipos de archivos permitidos en recursos
// USADO POR: educational-resources.controller.ts (validación multer), frontend
// NOTA: Si se modifica, actualizar también allowedMimeTypes en controller
/**
 * TIPOS DE RECURSOS EDUCATIVOS - NOMENCLATURA FIJA
 * 
 * PDF: Documentos PDF educativos
 * VIDEO: Videos educativos MP4
 * IMAGE: Imágenes JPEG/PNG/GIF
 * INTERACTIVE_HTML: Contenido HTML interactivo
 * DOCUMENT: Documentos Word (.doc/.docx)
 * PRESENTATION: Presentaciones PowerPoint (.ppt/.pptx)
 * SPREADSHEET: Hojas de cálculo Excel (.xls/.xlsx)
 * AUDIO: Archivos de audio MP3
 * 
 * VALIDACIÓN:
 * - Cada tipo tiene MIME types específicos en controller
 * - Tamaño máximo: 50MB por archivo
 * - Filtros automáticos en subida
 * 
 * ESTADO: ✅ Validación funcionando correctamente
 */
export enum ResourceType {
  PDF = 'PDF',
  VIDEO = 'VIDEO',
  IMAGE = 'IMAGE',
  INTERACTIVE_HTML = 'INTERACTIVE_HTML',
  DOCUMENT = 'DOCUMENT',
  PRESENTATION = 'PRESENTATION',
  SPREADSHEET = 'SPREADSHEET',
  AUDIO = 'AUDIO',
  LINK = 'LINK',
}

@Entity('educational_resources')
export class EducationalResource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ResourceType,
  })
  type: ResourceType;

  @Column()
  gradeLevel: string;

  @Column()
  academicYear: string;

  @Column('uuid', { nullable: true })
  academicYearId: string | null;

  @ManyToOne(() => AcademicYear, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'academicYearId' })
  academicYearRef?: AcademicYear;

  @Column({ type: 'text', nullable: true })
  tags: string;

  @Column({ nullable: true })
  @Index('IDX_educational_resources_driveFileId', { unique: true })
  driveFileId: string | null;

  @Column({ nullable: true })
  driveFolderId: string | null;

  @Column({ nullable: true })
  driveFileName: string | null;

  @Column({ nullable: true })
  webViewLink: string | null;

  @Column({ nullable: true })
  downloadLink: string | null;

  @Column({ nullable: true })
  thumbnailLink: string | null;

  @Column({ nullable: true })
  mimeType: string | null;

  @Column({ type: 'bigint', nullable: true })
  fileSize: number | null;

  // Link resource fields
  @Column({ nullable: true })
  externalUrl: string | null;

  @Column({ nullable: true })
  previewTitle: string | null;

  @Column({ type: 'text', nullable: true })
  previewDescription: string | null;

  @Column({ nullable: true })
  previewImage: string | null;

  @Column()
  @Index('IDX_educational_resources_authorId')
  authorId: string;

  @Column()
  @Index('IDX_educational_resources_subjectId')
  subjectId: string;

  @Column()
  @Index('IDX_educational_resources_educationalLevelId')
  educationalLevelId: string;

  @Column({ nullable: true })
  @Index('IDX_educational_resources_folderId')
  folderId: string;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  views: number;

  @Column({ default: 0 })
  downloads: number;

  @Column({ default: 0 })
  displayOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @ManyToOne(() => Subject, { eager: true })
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @ManyToOne(() => EducationalLevel, { eager: true })
  @JoinColumn({ name: 'educationalLevelId' })
  educationalLevel: EducationalLevel;

  @ManyToOne(() => ResourceFolder, folder => folder.resources, { nullable: true })
  @JoinColumn({ name: 'folderId' })
  folder: ResourceFolder;

  @OneToMany(() => ResourceAssignment, assignment => assignment.resource)
  assignments: ResourceAssignment[];

  @OneToMany(() => ResourceView, view => view.resource)
  resourceViews: ResourceView[];

  @OneToMany(() => ResourceComment, comment => comment.resource)
  comments: ResourceComment[];

  @OneToMany(() => ResourceFavorite, favorite => favorite.resource)
  favorites: ResourceFavorite[];

  // Virtual properties
  get tagsArray(): string[] {
    return this.tags ? this.tags.split(',').map(tag => tag.trim()) : [];
  }

  set tagsArray(tags: string[]) {
    this.tags = tags.join(', ');
  }
}