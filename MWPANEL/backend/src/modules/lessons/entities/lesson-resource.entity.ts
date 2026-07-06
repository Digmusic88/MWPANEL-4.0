import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { LessonFolder } from './lesson-folder.entity';
import { User } from '../../users/entities/user.entity';
import { LessonResourceShare } from './lesson-resource-share.entity';
import { LessonResourceAccessLog } from './lesson-resource-access-log.entity';

export enum LessonResourceType {
  FILE = 'FILE',
  YOUTUBE_LINK = 'YOUTUBE_LINK',
  WEB_LINK = 'WEB_LINK',
  INTERNAL_DOC = 'INTERNAL_DOC',
  PRESENTATION = 'PRESENTATION',
  TSX_ARTIFACT = 'TSX_ARTIFACT',
}

export enum LessonResourceVisibility {
  PRIVATE = 'PRIVATE',
  CLASS = 'CLASS',
  SCHOOL = 'SCHOOL', 
  PUBLIC = 'PUBLIC',
}

export interface TsxSandboxConfig {
  maxExecutionTime: number;
  allowedDomains: string[];
  maxMemoryUsage: number;
  allowedReactHooks: string[];
  cssRestrictions: boolean;
}

@Entity('lesson_resources')
export class LessonResource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lesson_folder_id' })
  lessonFolderId: string;

  @Column({
    type: 'enum',
    enum: LessonResourceType,
  })
  type: LessonResourceType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Para archivos físicos
  @Column({ name: 'drive_file_id', nullable: true })
  driveFileId?: string;

  @Column({ name: 'file_name', nullable: true })
  fileName?: string;

  @Column({ name: 'mime_type', nullable: true })
  mimeType?: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize?: number;

  @Column({ name: 'web_view_link', nullable: true })
  webViewLink?: string;

  @Column({ name: 'download_link', nullable: true })
  downloadLink?: string;

  // Para enlaces externos
  @Column({ name: 'external_url', nullable: true })
  externalUrl?: string;

  // Para documentos internos (WYSIWYG)
  @Column({ name: 'internal_content', type: 'text', nullable: true })
  internalContent?: string;

  // Para artefactos TSX
  @Column({ name: 'tsx_source_code', type: 'text', nullable: true })
  tsxCode?: string;

  @Column({ name: 'tsx_component_props', type: 'jsonb', nullable: true })
  tsxProps?: Record<string, any>;

  @Column({ name: 'tsx_dependencies', type: 'simple-array', nullable: true })
  tsxDependencies?: string[];

  @Column({ name: 'tsx_styles', type: 'text', nullable: true })
  tsxStyles?: string;

  // Metadatos y configuración
  @Column({ name: 'order_index', default: 0 })
  orderIndex: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: LessonResourceVisibility,
    default: LessonResourceVisibility.CLASS,
  })
  visibility: LessonResourceVisibility;

  // Usage statistics
  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @Column({ name: 'download_count', default: 0 })
  downloadCount: number;

  // Auditoría
  @Column({ name: 'created_by_id' })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => LessonFolder, folder => folder.resources, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_folder_id' })
  lessonFolder: LessonFolder;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @OneToMany(() => LessonResourceShare, share => share.resource)
  shares: LessonResourceShare[];

  @OneToMany(() => LessonResourceAccessLog, log => log.resource)
  accessLogs: LessonResourceAccessLog[];

  // Computed properties
  get isFile(): boolean {
    return this.type === LessonResourceType.FILE;
  }

  get isLink(): boolean {
    return [
      LessonResourceType.YOUTUBE_LINK,
      LessonResourceType.WEB_LINK,
    ].includes(this.type);
  }

  get isTsxArtifact(): boolean {
    return this.type === LessonResourceType.TSX_ARTIFACT;
  }

  get isInternalContent(): boolean {
    return [
      LessonResourceType.INTERNAL_DOC,
      LessonResourceType.PRESENTATION,
    ].includes(this.type);
  }

  get fileExtension(): string | null {
    if (!this.fileName) return null;
    const lastDot = this.fileName.lastIndexOf('.');
    return lastDot !== -1 ? this.fileName.substring(lastDot + 1).toLowerCase() : null;
  }

  get fileSizeFormatted(): string {
    if (!this.fileSize) return '';
    
    const bytes = Number(this.fileSize);
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  get youtubeVideoId(): string | null {
    if (this.type !== LessonResourceType.YOUTUBE_LINK || !this.externalUrl) {
      return null;
    }

    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = this.externalUrl.match(regex);
    return match ? match[1] : null;
  }

  get thumbnailUrl(): string | null {
    const videoId = this.youtubeVideoId;
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
  }

  // Métodos de validación
  validateTsxCode(): boolean {
    if (this.type !== LessonResourceType.TSX_ARTIFACT) return true;
    if (!this.tsxCode) return false;

    // Validaciones básicas
    if (this.tsxCode.length > 50000) return false; // 50KB máximo
    
    // Verificar que no contenga imports peligrosos
    const dangerousImports = [
      'fs', 'child_process', 'exec', 'eval', 'Function',
      'XMLHttpRequest', 'fetch', 'require', 'import('
    ];
    
    return !dangerousImports.some(danger => this.tsxCode!.includes(danger));
  }

  // Usage tracking methods
  incrementViewCount(): void {
    this.viewCount = (this.viewCount || 0) + 1;
  }

  incrementDownloadCount(): void {
    this.downloadCount = (this.downloadCount || 0) + 1;
  }
}