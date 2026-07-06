import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BlogMedia, MediaType, MediaProvider } from '../entities';
import { CreateBlogMediaDto, UpdateBlogMediaDto } from '../dto';
import { User } from '../../users/entities/user.entity';
import { BlogGoogleDriveService } from './blog-google-drive.service';

@Injectable()
export class BlogMediaService {
  constructor(
    @InjectRepository(BlogMedia)
    private mediaRepository: Repository<BlogMedia>,
    private blogGoogleDriveService: BlogGoogleDriveService,
  ) {}

  async create(createMediaDto: CreateBlogMediaDto, uploader: User): Promise<BlogMedia> {
    const media = this.mediaRepository.create({
      ...createMediaDto,
      uploadedBy: uploader,
      uploadedById: uploader.id,
    });

    return this.mediaRepository.save(media);
  }

  /**
   * Crea un archivo multimedia subiéndolo a Google Drive
   */
  async createWithGoogleDrive(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    mediaType: MediaType,
    uploader: User,
    metadata?: any
  ): Promise<BlogMedia> {
    try {
      console.log(`🔄 [BlogMediaService] Starting upload for ${fileName} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
      
      // Subir archivo a Google Drive
      const driveResult = await this.blogGoogleDriveService.uploadBlogMedia(
        fileBuffer,
        fileName,
        mimeType,
        mediaType,
        uploader.id
      );
      
      console.log(`✅ [BlogMediaService] Google Drive upload completed for ${fileName}`);

      // Crear registro en base de datos
      const media = this.mediaRepository.create({
        filename: fileName,
        originalName: fileName,
        type: mediaType,
        provider: MediaProvider.GOOGLE_DRIVE,
        // Para multimedia, usar URLs de streaming de Google Drive
        url: this.getStreamingUrl(driveResult.fileId, mediaType),
        // Para imágenes y vídeos, Drive auto-genera thumbnail accesible via /thumbnail?id=
        thumbnailUrl: driveResult.thumbnailLink
          || ((mimeType.startsWith('image/') || mimeType.startsWith('video/'))
            ? `https://drive.google.com/thumbnail?id=${driveResult.fileId}&sz=w640-h360`
            : null),
        mimeType: mimeType,
        size: fileBuffer.length,
        uploadedBy: uploader,
        uploadedById: uploader.id,
        metadata: {
          googleDriveId: driveResult.fileId,
          downloadLink: driveResult.downloadLink,
          folderId: driveResult.folderId,
          folderPath: driveResult.folderPath,
          ...metadata
        }
      });

      return this.mediaRepository.save(media);
    } catch (error) {
      throw new BadRequestException(`Error al crear multimedia con Google Drive: ${error.message}`);
    }
  }

  /**
   * Inicia una sesión de upload resumable para archivos grandes
   */
  async createResumableUploadSession(
    fileName: string,
    fileSize: number,
    mimeType: string,
    mediaType: MediaType,
    uploader: User
  ): Promise<{
    sessionId: string;
    uploadUrl: string;
    chunkSize: number;
    totalChunks: number;
    fileName: string;
  }> {
    try {
      console.log(`🔄 [BlogMediaService] Creating resumable upload session for ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
      
      const session = await this.blogGoogleDriveService.createResumableUploadSession(
        fileName,
        fileSize,
        mimeType,
        mediaType,
        uploader.id
      );
      
      const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
      
      console.log(`✅ [BlogMediaService] Resumable upload session created: ${session.sessionId} (${totalChunks} chunks)`);

      return {
        sessionId: session.sessionId,
        uploadUrl: session.uploadUrl,
        chunkSize: CHUNK_SIZE,
        totalChunks,
        fileName: session.fileName
      };
    } catch (error) {
      throw new BadRequestException(`Error al crear sesión de upload resumable: ${error.message}`);
    }
  }

  /**
   * Sube un chunk de datos para una sesión resumable
   */
  async uploadChunk(
    uploadUrl: string,
    chunkBuffer: Buffer,
    chunkIndex: number,
    totalChunks: number,
    startByte: number,
    endByte: number,
    totalFileSize: number
  ): Promise<{
    success: boolean;
    progress: number;
    fileId?: string;
    completed: boolean;
  }> {
    try {
      const result = await this.blogGoogleDriveService.uploadChunk(
        uploadUrl,
        chunkBuffer,
        chunkIndex,
        totalChunks,
        startByte,
        endByte,
        totalFileSize
      );

      if (result.completed && result.fileId) {
        console.log(`🎉 [BlogMediaService] Upload completed! Creating database record for file: ${result.fileId}`);
      }

      return result;
    } catch (error) {
      throw new BadRequestException(`Error al subir chunk: ${error.message}`);
    }
  }

  /**
   * Completa el upload resumable creando el registro en la base de datos
   */
  async completeResumableUpload(
    fileId: string,
    fileName: string,
    originalFileName: string,
    fileSize: number,
    mimeType: string,
    mediaType: MediaType,
    uploader: User,
    folderId: string,
    folderPath: string[],
    metadata?: any
  ): Promise<BlogMedia> {
    try {
      console.log(`🔄 [BlogMediaService] Completing resumable upload for ${fileName}`);

      // Generar URLs para el archivo
      const downloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const webViewLink = `https://drive.google.com/file/d/${fileId}/view`;
      // Drive auto-genera thumbnails para imágenes y vídeos tras procesarlos
      const isThumbable = mimeType.startsWith('image/') || mimeType.startsWith('video/');
      const thumbnailLink = isThumbable
        ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w640-h360`
        : null;

      // Crear registro en base de datos
      const media = this.mediaRepository.create({
        filename: fileName,
        originalName: originalFileName,
        type: mediaType,
        provider: MediaProvider.GOOGLE_DRIVE,
        // Para multimedia, usar URLs de streaming de Google Drive
        url: this.getStreamingUrl(fileId, mediaType),
        thumbnailUrl: thumbnailLink,
        mimeType: mimeType,
        size: fileSize,
        uploadedBy: uploader,
        uploadedById: uploader.id,
        metadata: {
          googleDriveId: fileId,
          downloadLink,
          webViewLink,
          folderId,
          folderPath,
          uploadMethod: 'resumable',
          ...metadata
        }
      });

      const savedMedia = await this.mediaRepository.save(media);
      console.log(`✅ [BlogMediaService] Database record created for resumable upload: ${savedMedia.id}`);

      return savedMedia;
    } catch (error) {
      throw new BadRequestException(`Error al completar upload resumable: ${error.message}`);
    }
  }

  async findAll(filters?: {
    type?: MediaType;
    provider?: MediaProvider;
    postId?: string;
    uploadedById?: string;
    isActive?: boolean;
  }): Promise<BlogMedia[]> {
    const queryBuilder = this.mediaRepository
      .createQueryBuilder('media')
      .leftJoinAndSelect('media.uploadedBy', 'uploader')
      .leftJoinAndSelect('media.post', 'post');

    if (filters?.type) {
      queryBuilder.andWhere('media.type = :type', { type: filters.type });
    }

    if (filters?.provider) {
      queryBuilder.andWhere('media.provider = :provider', { provider: filters.provider });
    }

    if (filters?.postId) {
      queryBuilder.andWhere('media.postId = :postId', { postId: filters.postId });
    }

    if (filters?.uploadedById) {
      queryBuilder.andWhere('media.uploadedById = :uploadedById', { uploadedById: filters.uploadedById });
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('media.isActive = :isActive', { isActive: filters.isActive });
    }

    return queryBuilder
      .orderBy('media.sortOrder', 'ASC')
      .addOrderBy('media.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Obtiene multimedia visible para familias (solo contenido público o relacionado con sus hijos)
   */
  async findMediaForFamily(familyUser: User): Promise<BlogMedia[]> {
    console.log(`🔍 Finding media for family user: ${familyUser.email}`);
    
    // Para esta implementación inicial, devolvemos todo el contenido activo
    // En el futuro se puede filtrar basado en las clases de los hijos
    const queryBuilder = this.mediaRepository
      .createQueryBuilder('media')
      .leftJoinAndSelect('media.uploadedBy', 'uploader')
      .leftJoinAndSelect('media.post', 'post')
      .where('media.isActive = :isActive', { isActive: true });

    const media = await queryBuilder
      .orderBy('media.sortOrder', 'ASC')
      .addOrderBy('media.createdAt', 'DESC')
      .getMany();

    console.log(`✅ Found ${media.length} media items for family user`);
    return media;
  }

  async findOne(id: string): Promise<BlogMedia> {
    const media = await this.mediaRepository.findOne({
      where: { id },
      relations: ['uploadedBy', 'post']
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    return media;
  }

  async update(id: string, updateMediaDto: UpdateBlogMediaDto): Promise<BlogMedia> {
    const media = await this.findOne(id);

    await this.mediaRepository.update(id, updateMediaDto);
    return this.findOne(id);
  }

  /**
   * Devuelve los bytes del fotograma de un vídeo, descargándolo de Drive con las
   * credenciales del bot. Si `metadata.thumbnailFileId` está set (porque CreatePostModal
   * subió un frame extraído en cliente), se usa ese fichero. Si no, se cae al fileId
   * del propio vídeo y Drive devuelve el thumbnail auto-generado.
   */
  async getVideoThumbnailBytes(mediaId: string): Promise<{ buffer: Buffer; contentType: string }> {
    const media = await this.mediaRepository.findOne({ where: { id: mediaId } });
    if (!media) {
      throw new NotFoundException('Media no encontrado');
    }
    if (media.type !== MediaType.VIDEO) {
      throw new BadRequestException('Solo aplicable a media de tipo VIDEO');
    }

    const metadata: any = media.metadata || {};
    const fileIdForThumb = metadata.thumbnailFileId || metadata.googleDriveId;
    if (!fileIdForThumb) {
      throw new NotFoundException('Sin fileId asociado para el thumbnail');
    }

    return this.blogGoogleDriveService.fetchThumbnailBytes(fileIdForThumb);
  }

  /**
   * Sube una imagen extraída del cliente como portada (poster) de un vídeo.
   * El frame se almacena en Drive en la misma carpeta que el vídeo con prefijo `thumb_`.
   * Actualiza BlogMedia.thumbnailUrl del vídeo apuntando a esa imagen.
   */
  async replaceThumbnail(
    videoMediaId: string,
    fileBuffer: Buffer,
    mimeType: string,
    uploader: User,
  ): Promise<BlogMedia> {
    if (!mimeType.startsWith('image/')) {
      throw new BadRequestException('La portada debe ser una imagen');
    }
    if (fileBuffer.length > 2 * 1024 * 1024) {
      throw new BadRequestException('La portada no puede exceder 2 MB');
    }

    const media = await this.mediaRepository.findOne({ where: { id: videoMediaId } });
    if (!media) {
      throw new NotFoundException('Media no encontrado');
    }
    if (media.type !== MediaType.VIDEO) {
      throw new BadRequestException('Solo aplicable a media de tipo VIDEO');
    }

    const thumbFileName = `thumb_${media.filename}.jpg`;
    const driveResult = await this.blogGoogleDriveService.uploadBlogMedia(
      fileBuffer,
      thumbFileName,
      mimeType,
      MediaType.IMAGE,
      uploader.id,
    );

    media.thumbnailUrl = `https://drive.google.com/thumbnail?id=${driveResult.fileId}&sz=w640-h360`;
    media.metadata = {
      ...(media.metadata || {}),
      thumbnailFileId: driveResult.fileId,
      thumbnailGeneratedAt: new Date().toISOString(),
    } as any;
    return this.mediaRepository.save(media);
  }

  async remove(id: string): Promise<void> {
    const media = await this.findOne(id);
    await this.mediaRepository.remove(media);
  }

  async deactivate(id: string): Promise<BlogMedia> {
    const media = await this.findOne(id);

    await this.mediaRepository.update(id, { isActive: false });
    return this.findOne(id);
  }

  async activate(id: string): Promise<BlogMedia> {
    const media = await this.findOne(id);

    await this.mediaRepository.update(id, { isActive: true });
    return this.findOne(id);
  }

  async getByPost(postId: string): Promise<BlogMedia[]> {
    return this.mediaRepository.find({
      where: { postId, isActive: true },
      relations: ['uploadedBy'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' }
    });
  }

  async getUnattached(): Promise<BlogMedia[]> {
    return this.mediaRepository.find({
      where: { postId: null, isActive: true },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' }
    });
  }

  async attachToPost(mediaId: string, postId: string): Promise<BlogMedia> {
    const media = await this.findOne(mediaId);

    await this.mediaRepository.update(mediaId, { postId });
    return this.findOne(mediaId);
  }

  async detachFromPost(mediaId: string): Promise<BlogMedia> {
    const media = await this.findOne(mediaId);

    await this.mediaRepository.update(mediaId, { postId: null });
    return this.findOne(mediaId);
  }

  async reorderMedia(mediaIds: string[]): Promise<void> {
    for (let i = 0; i < mediaIds.length; i++) {
      await this.mediaRepository.update(mediaIds[i], { sortOrder: i });
    }
  }

  async getMediaStats(): Promise<{
    total: number;
    byType: Record<MediaType, number>;
    byProvider: Record<MediaProvider, number>;
    totalSize: number;
    active: number;
  }> {
    const allMedia = await this.mediaRepository.find();

    const stats = {
      total: allMedia.length,
      byType: {
        [MediaType.IMAGE]: 0,
        [MediaType.VIDEO]: 0,
        [MediaType.AUDIO]: 0,
        [MediaType.DOCUMENT]: 0,
        [MediaType.GALLERY]: 0,
      },
      byProvider: {
        [MediaProvider.LOCAL]: 0,
        [MediaProvider.GOOGLE_DRIVE]: 0,
        [MediaProvider.YOUTUBE]: 0,
        [MediaProvider.VIMEO]: 0,
        [MediaProvider.EXTERNAL]: 0,
      },
      totalSize: 0,
      active: 0,
    };

    for (const media of allMedia) {
      stats.byType[media.type]++;
      stats.byProvider[media.provider]++;
      stats.totalSize += media.size || 0;
      if (media.isActive) {
        stats.active++;
      }
    }

    return stats;
  }

  /**
   * Obtiene multimedia por mes desde Google Drive
   */
  async getBlogMediaByMonth(academicYear?: string, month?: string): Promise<any[]> {
    try {
      if (!academicYear || !month) {
        // Obtener año académico y mes actual si no se especifican
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        
        if (!academicYear) {
          if (currentMonth >= 8) { // Septiembre en adelante
            academicYear = `${currentYear}-${currentYear + 1}`;
          } else { // Enero a agosto
            academicYear = `${currentYear - 1}-${currentYear}`;
          }
        }
        
        if (!month) {
          const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
          ];
          month = monthNames[currentMonth];
        }
      }

      return this.blogGoogleDriveService.listBlogMediaByMonth(academicYear, month);
    } catch (error) {
      throw new BadRequestException(`Error al obtener multimedia del blog: ${error.message}`);
    }
  }

  /**
   * Genera la URL correcta para streaming según el tipo de media
   */
  private getStreamingUrl(fileId: string, mediaType: MediaType): string {
    switch (mediaType) {
      case 'image':
        // Para imágenes, usar la URL de visualización directa
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
      
      case 'video':
      case 'audio':
        // Para video y audio, usar la URL de contenido de Google Drive que permite streaming
        return `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
      
      default:
        // Para documentos, usar la URL de descarga
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  }

  /**
   * Obtiene los años académicos disponibles
   */
  async getAvailableAcademicYears(): Promise<string[]> {
    try {
      return this.blogGoogleDriveService.getAvailableAcademicYears();
    } catch (error) {
      throw new BadRequestException(`Error al obtener años académicos: ${error.message}`);
    }
  }

  /**
   * Obtiene los meses disponibles para un año académico
   */
  async getAvailableMonths(academicYear: string): Promise<string[]> {
    try {
      return this.blogGoogleDriveService.getAvailableMonths(academicYear);
    } catch (error) {
      throw new BadRequestException(`Error al obtener meses disponibles: ${error.message}`);
    }
  }

  /**
   * Elimina multimedia tanto de Google Drive como de la base de datos
   */
  async removeWithGoogleDrive(id: string): Promise<void> {
    const media = await this.findOne(id);
    
    // Si está en Google Drive, eliminarlo también de allí
    if (media.provider === MediaProvider.GOOGLE_DRIVE && media.metadata?.googleDriveId) {
      try {
        await this.blogGoogleDriveService.deleteBlogMedia(media.metadata.googleDriveId);
      } catch (error) {
        // Log el error pero continúa con la eliminación de la base de datos
        console.error(`Error eliminando de Google Drive: ${error.message}`);
      }
    }
    
    // Eliminar de la base de datos
    await this.mediaRepository.remove(media);
  }

  async createGallery(mediaIds: string[], galleryData: {
    filename: string;
    originalName: string;
    url: string;
    caption?: string;
  }, uploader: User): Promise<BlogMedia> {
    const galleryMedia = this.mediaRepository.create({
      ...galleryData,
      type: MediaType.GALLERY,
      provider: MediaProvider.LOCAL,
      uploadedBy: uploader,
      uploadedById: uploader.id,
      metadata: {
        galleryItems: mediaIds,
        customProperties: {
          itemCount: mediaIds.length
        }
      }
    });

    return this.mediaRepository.save(galleryMedia);
  }

  async getGalleryItems(galleryId: string): Promise<BlogMedia[]> {
    const gallery = await this.findOne(galleryId);

    if (gallery.type !== MediaType.GALLERY) {
      throw new BadRequestException('Media item is not a gallery');
    }

    const itemIds = gallery.metadata?.galleryItems || [];
    if (itemIds.length === 0) {
      return [];
    }

    return this.mediaRepository.find({
      where: { id: In(itemIds) },
      order: { sortOrder: 'ASC' }
    });
  }
}