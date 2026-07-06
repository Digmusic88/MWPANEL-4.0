import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from './task.entity';

export enum AttachmentType {
  INSTRUCTION = 'instruction',    // Instrucciones
  TEMPLATE = 'template',         // Plantilla
  REFERENCE = 'reference',       // Material de referencia
  EXAMPLE = 'example',          // Ejemplo
  RESOURCE = 'resource',        // Recurso adicional
}

@Entity('task_attachments')
export class TaskAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  filename: string; // Nombre del archivo en el servidor

  @Column({ type: 'varchar', length: 255 })
  originalName: string; // Nombre original del archivo

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number; // Tamaño en bytes

  @Column({ type: 'varchar', length: 500, nullable: true })
  path: string; // Ruta del archivo en el servidor (local, puede ser null si está en Google Drive)

  @Column({
    type: 'enum',
    enum: AttachmentType,
    default: AttachmentType.INSTRUCTION,
  })
  type: AttachmentType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string; // Descripción del archivo

  @Column({ type: 'int', default: 0 })
  downloadCount: number; // Número de descargas

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Campos para Google Drive
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'drivefileid' })
  driveFileId: string; // ID del archivo en Google Drive

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'drivefolderid' })
  driveFolderId: string; // ID de la carpeta en Google Drive

  @Column({ type: 'varchar', length: 1000, nullable: true, name: 'drivewebviewlink' })
  driveWebViewLink: string; // URL de visualización en Google Drive

  @Column({ type: 'varchar', length: 1000, nullable: true, name: 'drivedownloadlink' })
  driveDownloadLink: string; // URL de descarga directa de Google Drive

  @Column({ type: 'text', nullable: true, name: 'drivefolderpath' })
  driveFolderPath: string; // Ruta de carpetas en Google Drive (JSON array)

  @CreateDateColumn()
  uploadedAt: Date;

  // Relaciones
  @Column({ type: 'uuid' })
  taskId: string;

  @ManyToOne(() => Task, (task) => task.attachments)
  @JoinColumn({ name: 'taskId' })
  task: Task;

  // Métodos utiles
  get fileExtension(): string {
    return this.originalName.split('.').pop()?.toLowerCase() || '';
  }

  get sizeInMB(): number {
    return Math.round((this.size / (1024 * 1024)) * 100) / 100;
  }

  get isImage(): boolean {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    return imageTypes.includes(this.fileExtension);
  }

  get isDocument(): boolean {
    const docTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
    return docTypes.includes(this.fileExtension);
  }

  get isSpreadsheet(): boolean {
    const spreadsheetTypes = ['xls', 'xlsx', 'csv'];
    return spreadsheetTypes.includes(this.fileExtension);
  }

  get isPresentation(): boolean {
    const presentationTypes = ['ppt', 'pptx'];
    return presentationTypes.includes(this.fileExtension);
  }

  get isInGoogleDrive(): boolean {
    return !!this.driveFileId;
  }

  get downloadUrl(): string {
    return this.isInGoogleDrive ? this.driveDownloadLink : `/uploads/tasks/${this.filename}`;
  }
}