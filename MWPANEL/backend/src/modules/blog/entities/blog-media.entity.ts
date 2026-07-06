import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BlogPost } from './blog-post.entity';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  GALLERY = 'gallery',
}

export enum MediaProvider {
  LOCAL = 'local',
  GOOGLE_DRIVE = 'google_drive',
  YOUTUBE = 'youtube',
  VIMEO = 'vimeo',
  EXTERNAL = 'external',
}

@Entity('blog_media')
@Index(['type'])
@Index(['provider'])
@Index(['isActive'])
export class BlogMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  filename: string;

  @Column({ name: 'originalName', length: 255 })
  originalName: string;

  @Column({
    type: 'enum',
    enum: MediaType,
  })
  @Index()
  type: MediaType;

  @Column({
    type: 'enum',
    enum: MediaProvider,
    default: MediaProvider.LOCAL,
  })
  @Index()
  provider: MediaProvider;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'text', nullable: true })
  thumbnailUrl: string;

  @Column({ name: 'mimeType', length: 100, nullable: true })
  mimeType: string;

  @Column({ type: 'bigint', nullable: false })
  size: number;

  @Column({ type: 'json', nullable: true })
  dimensions: {
    width?: number;
    height?: number;
    duration?: number; // For videos/audio in seconds
  };

  @Column({ type: 'text', nullable: true })
  alt: string;

  @Column({ type: 'text', nullable: true })
  caption: string;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  metadata: {
    exif?: any; // EXIF data for images
    googleDriveId?: string;
    videoId?: string; // For YouTube/Vimeo
    embedCode?: string;
    galleryItems?: string[]; // For gallery type media
    customProperties?: Record<string, any>;
  };

  // Author relationship (uploader)
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User;

  @Column('uuid', { name: 'uploaded_by_id' })
  uploadedById: string;

  // Post relationship (optional - media can exist without being attached to a post)
  @ManyToOne(() => BlogPost, (post) => post.media, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'post_id' })
  post: BlogPost;

  @Column('uuid', { nullable: true, name: 'post_id' })
  postId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isImage(): boolean {
    return this.type === MediaType.IMAGE;
  }

  get isVideo(): boolean {
    return this.type === MediaType.VIDEO;
  }

  get isAudio(): boolean {
    return this.type === MediaType.AUDIO;
  }

  get isDocument(): boolean {
    return this.type === MediaType.DOCUMENT;
  }

  get isGallery(): boolean {
    return this.type === MediaType.GALLERY;
  }

  get isExternal(): boolean {
    return this.provider !== MediaProvider.LOCAL;
  }

  get displayUrl(): string {
    return this.thumbnailUrl || this.url;
  }

  get fileSizeFormatted(): string {
    if (!this.size) return 'Unknown';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = this.size;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}