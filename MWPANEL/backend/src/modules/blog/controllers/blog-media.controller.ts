import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
  ParseBoolPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import axios from 'axios';
import { BlogMediaService } from '../services/blog-media.service';
import { CreateBlogMediaDto, UpdateBlogMediaDto } from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { User, UserRole } from '../../users/entities/user.entity';
import { BlogMedia, MediaType, MediaProvider } from '../entities';

@ApiTags('Blog Media')
@Controller('blog-media')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BlogMediaController {
  constructor(private readonly mediaService: BlogMediaService) {}

  @Post()
  @ApiOperation({ summary: 'Upload new media' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Media uploaded successfully', type: BlogMedia })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async create(
    @Body() createMediaDto: CreateBlogMediaDto,
    @CurrentUser() user: User,
  ): Promise<BlogMedia> {
    return this.mediaService.create(createMediaDto, user);
  }

  @Get('unattached')
  @ApiOperation({ summary: 'Get unattached media files' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Unattached media retrieved successfully', type: [BlogMedia] })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getUnattached(): Promise<BlogMedia[]> {
    return this.mediaService.getUnattached();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get media statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Statistics retrieved successfully' })
  @Roles(UserRole.ADMIN)
  async getStats(): Promise<{
    total: number;
    byType: Record<MediaType, number>;
    byProvider: Record<MediaProvider, number>;
    totalSize: number;
    active: number;
  }> {
    return this.mediaService.getMediaStats();
  }

  @Get('gallery/years')
  @ApiOperation({ summary: 'Get available academic years' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Academic years retrieved successfully' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getAvailableAcademicYears(): Promise<string[]> {
    return this.mediaService.getAvailableAcademicYears();
  }

  @Get('gallery/:academicYear/months')
  @ApiOperation({ summary: 'Get available months for an academic year' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Months retrieved successfully' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getAvailableMonths(
    @Param('academicYear') academicYear: string,
  ): Promise<string[]> {
    return this.mediaService.getAvailableMonths(academicYear);
  }

  @Get('gallery/:academicYear/:month')
  @ApiOperation({ summary: 'Get blog media by academic year and month from Google Drive' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Blog media retrieved successfully' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getBlogMediaByMonth(
    @Param('academicYear') academicYear: string,
    @Param('month') month: string,
  ): Promise<any[]> {
    return this.mediaService.getBlogMediaByMonth(academicYear, month);
  }

  @Get('proxy-drive/:fileId')
  @Public()
  @ApiOperation({ summary: 'Stream Google Drive file through proxy using file ID directly' })
  @ApiResponse({
    status: 200,
    description: 'Media file streamed successfully',
    content: {
      'application/octet-stream': {
        schema: { type: 'string', format: 'binary' }
      }
    }
  })
  async proxyDriveFile(
    @Param('fileId') fileId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    try {
      console.log(`🔗 Proxying Google Drive file directly: ${fileId}`);

      // Try multiple Google Drive URL strategies
      const urls = [
        `https://drive.google.com/uc?id=${fileId}&confirm=t`,
        `https://docs.google.com/uc?export=download&id=${fileId}`,
        `https://drive.usercontent.google.com/download?id=${fileId}&export=download`,
        `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
      ];

      let streamResponse = null;
      let workingUrl = null;

      // Try each URL strategy until one works
      for (const url of urls) {
        try {
          console.log(`🔄 Trying URL: ${url}`);
          streamResponse = await axios.get(url, {
            responseType: 'stream',
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': '*/*',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive'
            },
            maxRedirects: 5,
            validateStatus: (status) => status < 400,
            maxContentLength: 500 * 1024 * 1024,
            maxBodyLength: 500 * 1024 * 1024,
          });

          if (streamResponse.status === 200) {
            workingUrl = url;
            console.log(`✅ URL works: ${url}`);
            break;
          }
        } catch (urlError: any) {
          console.log(`❌ URL failed: ${url} - ${urlError.message}`);
          continue;
        }
      }

      if (!streamResponse || !workingUrl) {
        console.log(`❌ All URL strategies failed for file ID: ${fileId}`);
        throw new BadRequestException('Could not access Google Drive file');
      }

      // Set headers for caching and CORS
      const headers = {
        'Content-Type': streamResponse.headers['content-type'] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Accept-Ranges': 'bytes',
        'Connection': 'keep-alive',
      };

      if (streamResponse.headers['content-length']) {
        headers['Content-Length'] = streamResponse.headers['content-length'];
      }

      headers['ETag'] = `"${fileId}-${Date.now()}"`;

      response.set(headers);

      console.log(`📦 Streaming Google Drive file: ${fileId}`);
      return new StreamableFile(streamResponse.data);

    } catch (error: any) {
      console.error('❌ Error in proxyDriveFile:', error);
      throw new BadRequestException(`Proxy error: ${error.message}`);
    }
  }

  @Get('proxy/:id')
  @Public()
  @ApiOperation({ summary: 'Stream media file through proxy to bypass CORS issues' })
  @ApiResponse({
    status: 200,
    description: 'Media file streamed successfully',
    content: {
      'application/octet-stream': {
        schema: { type: 'string', format: 'binary' }
      }
    }
  })
  async proxyMedia(
    @Param('id', ParseUUIDPipe) mediaId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    try {
      console.log(`🔗 Proxying media request for ID: ${mediaId}`);
      
      // Get media record from database
      const media = await this.mediaService.findOne(mediaId);
      if (!media) {
        throw new BadRequestException('Media not found');
      }

      console.log(`🔗 Found media: ${media.originalName}, URL: ${media.url}`);
      
      // Extract Google Drive file ID from URL - handle multiple URL formats
      let fileId: string | null = null;

      // First check if there's a googleDriveId in metadata
      if (media.metadata?.googleDriveId) {
        fileId = media.metadata.googleDriveId;
        console.log(`✅ Found file ID in metadata: ${fileId}`);
      }
      // URL format: https://drive.google.com/uc?export=view&id=XXX
      else if (media.url.includes('drive.google.com/uc')) {
        fileId = media.url.match(/[?&]id=([^&]+)/)?.[1] || null;
      }
      // URL format: https://drive.google.com/file/d/XXX/view
      else if (media.url.includes('drive.google.com/file/d/')) {
        fileId = media.url.match(/\/file\/d\/([^\/]+)/)?.[1] || null;
      }
      // URL format: https://drive.usercontent.google.com/download?id=XXX&export=download
      else if (media.url.includes('drive.usercontent.google.com')) {
        fileId = media.url.match(/[?&]id=([^&]+)/)?.[1] || null;
      }

      if (!fileId) {
        console.log(`⚠️ Could not extract file ID from URL: ${media.url}`);
        console.log(`⚠️ Media metadata: ${JSON.stringify(media.metadata)}`);
        throw new BadRequestException('Invalid Google Drive URL');
      }

      console.log(`✅ Extracted file ID: ${fileId}`);
      
      // Try multiple Google Drive URL strategies
      const urls = [
        `https://drive.google.com/uc?id=${fileId}&confirm=t`,
        `https://docs.google.com/uc?export=download&id=${fileId}`,
        `https://drive.usercontent.google.com/download?id=${fileId}&export=download`,
        `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
      ];

      let streamResponse = null;
      let workingUrl = null;

      // Try each URL strategy until one works
      for (const url of urls) {
        try {
          console.log(`🔄 Trying URL: ${url}`);
          streamResponse = await axios.get(url, {
            responseType: 'stream',
            timeout: 15000, // Increased timeout to 15 seconds for large video files
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': '*/*',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive'
            },
            // Add HTTP/2 support and connection pooling for better performance
            maxRedirects: 5,
            validateStatus: (status) => status < 400,
            // Enable streaming with better buffer management
            maxContentLength: 500 * 1024 * 1024, // 500MB max file size
            maxBodyLength: 500 * 1024 * 1024,
          });
          
          if (streamResponse.status === 200) {
            workingUrl = url;
            console.log(`✅ URL works: ${url}`);
            break;
          }
        } catch (urlError: any) {
          console.log(`❌ URL failed: ${url} - ${urlError.message}`);
          continue;
        }
      }

      if (!streamResponse || !workingUrl) {
        console.log(`❌ All URL strategies failed for file ID: ${fileId}`);
        throw new BadRequestException('Could not access Google Drive file');
      }

      // Clean filename to avoid header errors
      const cleanFilename = (media.originalName || 'media-file')
        .replace(/[^\w\-_.]/g, '_') // Replace invalid chars with underscore
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .substring(0, 100); // Limit filename length

      // Set optimized headers for faster video loading
      const headers = {
        'Content-Type': media.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${cleanFilename}"`,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable', // Cache for 24 hours with immutable flag
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Accept-Ranges': 'bytes', // Enable partial content requests for video seeking
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=5, max=1000'
      };

      // Add content length if available from source response
      if (streamResponse.headers['content-length']) {
        headers['Content-Length'] = streamResponse.headers['content-length'];
      }

      // Add ETag for better caching
      if (streamResponse.headers['etag']) {
        headers['ETag'] = streamResponse.headers['etag'];
      } else {
        // Generate ETag based on file ID and last modified date
        headers['ETag'] = `"${fileId}-${Date.now()}"`;
      }

      response.set(headers);
      
      console.log(`📦 Streaming file: ${media.originalName} (${media.mimeType})`);
      return new StreamableFile(streamResponse.data);
      
    } catch (error: any) {
      console.error('❌ Error in proxyMedia:', error);
      throw new BadRequestException(`Proxy error: ${error.message}`);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Media retrieved successfully', type: BlogMedia })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY)
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<BlogMedia> {
    return this.mediaService.findOne(id);
  }

  @Get('family')
  @ApiOperation({ summary: 'Get media for family users' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Media retrieved successfully for families', type: [BlogMedia] })
  @Roles(UserRole.FAMILY)
  async findAllForFamily(@CurrentUser() user: User): Promise<BlogMedia[]> {
    return this.mediaService.findMediaForFamily(user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all media - Admin and teachers only' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Media retrieved successfully', type: [BlogMedia] })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async findAll(): Promise<BlogMedia[]> {
    return this.mediaService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update media' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Media updated successfully', type: BlogMedia })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMediaDto: UpdateBlogMediaDto,
  ): Promise<BlogMedia> {
    return this.mediaService.update(id, updateMediaDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete media' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Media deleted successfully' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.mediaService.remove(id);
  }

  @Post('upload-with-google-drive')
  @ApiOperation({ summary: 'Upload media file directly to Google Drive' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Media uploaded to Google Drive successfully', type: BlogMedia })
  @UseInterceptors(FileInterceptor('file'))
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async uploadWithGoogleDrive(
    @UploadedFile() file: Express.Multer.File,
    @Body('mediaType') mediaType: MediaType,
    @Body('caption') caption: string,
    @Body('alt') alt: string,
    @CurrentUser() user: User,
  ): Promise<BlogMedia> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.mediaService.createWithGoogleDrive(
      file.buffer,
      file.originalname,
      file.mimetype,
      mediaType || MediaType.IMAGE,
      user,
      { caption, alt }
    );
  }

  @Post('create-upload-session')
  @ApiOperation({ summary: 'Create resumable upload session for Google Drive' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Upload session created successfully' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async createUploadSession(
    @Body() body: any,
    @CurrentUser() user: User,
  ): Promise<any> {
    const { fileName, fileSize, mimeType, mediaType } = body;
    return this.mediaService.createResumableUploadSession(
      fileName,
      fileSize,
      mimeType,
      mediaType,
      user
    );
  }

  @Post('upload-chunk')
  @ApiOperation({ summary: 'Upload file chunk for resumable upload' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Chunk uploaded successfully' })
  @UseInterceptors(
    FileInterceptor('chunk', {
      storage: require('multer').memoryStorage(), // CRITICAL FIX: Use memory storage for buffer access
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB por chunk para archivos grandes
        files: 1,
        fieldSize: 50 * 1024 * 1024, // 50MB para campos de formulario
        fieldNameSize: 500, // URLs largas de Google Drive
        fields: 20 // Metadata de chunks
      }
    })
  )
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async uploadChunk(
    @UploadedFile() chunk: Express.Multer.File,
    @Body('uploadUrl') uploadUrl: string,
    @Body('chunkIndex') chunkIndex: string,
    @Body('totalChunks') totalChunks: string,
    @Body('startByte') startByte: string,
    @Body('endByte') endByte: string,
    @Body('totalFileSize') totalFileSize: string,
    @CurrentUser() user: User,
  ): Promise<{
    success: boolean;
    progress: number;
    fileId?: string;
    completed: boolean;
  }> {
    // Debug logging completo para diagnosticar el problema
    console.log('🔍 [BlogMediaController] uploadChunk called with:');
    console.log('- chunk:', chunk ? `File(${chunk.originalname}, ${chunk.size} bytes, ${chunk.mimetype})` : 'null');
    console.log('- uploadUrl present:', !!uploadUrl);
    console.log('- chunkIndex:', chunkIndex);
    console.log('- totalChunks:', totalChunks);
    console.log('- startByte:', startByte);
    console.log('- endByte:', endByte);
    console.log('- totalFileSize:', totalFileSize);
    console.log('- calculated chunk size (endByte - startByte):', parseInt(endByte) - parseInt(startByte));
    console.log('- actual buffer size:', chunk?.buffer?.length);
    
    if (!chunk || !chunk.buffer) {
      throw new BadRequestException(`No chunk uploaded. Received chunk: ${chunk ? 'exists but no buffer' : 'null'}`);
    }
    
    if (!uploadUrl) {
      throw new BadRequestException('uploadUrl is required');
    }

    return this.mediaService.uploadChunk(
      uploadUrl,
      chunk.buffer,
      parseInt(chunkIndex),
      parseInt(totalChunks),
      parseInt(startByte),
      parseInt(endByte),
      parseInt(totalFileSize)
    );
  }

  @Post('complete-upload')
  @ApiOperation({ summary: 'Complete resumable upload and create database record' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Upload completed successfully', type: BlogMedia })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async completeUpload(
    @Body('fileId') fileId: string,
    @Body('fileName') fileName: string,
    @Body('originalFileName') originalFileName: string,
    @Body('fileSize') fileSize: number,
    @Body('mimeType') mimeType: string,
    @Body('mediaType') mediaType: MediaType,
    @Body('folderId') folderId: string,
    @Body('folderPath') folderPath: string[],
    @Body('metadata') metadata: any,
    @CurrentUser() user: User,
    @Body('caption') caption?: string,
    @Body('alt') alt?: string,
  ): Promise<BlogMedia> {
    // Debug logging para identificar el problema
    console.log('🔍 [BlogMediaController] completeUpload called with:');
    console.log('- fileId:', fileId);
    console.log('- fileName:', fileName);
    console.log('- originalFileName:', originalFileName);
    console.log('- fileSize:', fileSize);
    console.log('- mimeType:', mimeType);
    console.log('- mediaType:', mediaType);
    console.log('- folderId:', folderId);
    console.log('- folderPath:', folderPath);
    console.log('- metadata:', metadata);
    console.log('- caption:', caption);
    console.log('- alt:', alt);
    console.log('- user:', user?.id);
    // Combinar metadata con caption y alt
    const combinedMetadata = {
      ...metadata,
      caption: caption || metadata?.caption,
      alt: alt || metadata?.alt
    };

    return this.mediaService.completeResumableUpload(
      fileId,
      fileName,
      originalFileName,
      fileSize,
      mimeType,
      mediaType,
      user,
      folderId,
      folderPath,
      combinedMetadata
    );
  }

  @Post(':id/thumbnail')
  @UseInterceptors(FileInterceptor('thumbnail', { limits: { fileSize: 2 * 1024 * 1024 } }))
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Subir un fotograma como portada (poster) de un vídeo' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Portada actualizada', type: BlogMedia })
  async uploadVideoThumbnail(
    @Param('id', ParseUUIDPipe) videoMediaId: string,
    @UploadedFile() file: any,
    @CurrentUser() user: User,
  ): Promise<BlogMedia> {
    if (!file) {
      throw new BadRequestException('No se recibió archivo de portada');
    }
    return this.mediaService.replaceThumbnail(
      videoMediaId,
      file.buffer,
      file.mimetype,
      user,
    );
  }

  @Get('video-thumbnail/:id')
  @Public()
  @ApiOperation({ summary: 'Devuelve el fotograma de portada de un vídeo, autenticado contra Drive (proxy)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Imagen del fotograma' })
  async getVideoThumbnail(
    @Param('id', ParseUUIDPipe) mediaId: string,
    @Res() response: Response,
  ): Promise<void> {
    try {
      const buf = await this.mediaService.getVideoThumbnailBytes(mediaId);
      response.set({
        'Content-Type': buf.contentType,
        'Content-Length': String(buf.buffer.length),
        'Cache-Control': 'public, max-age=86400, immutable',
        'ETag': `"video-thumb-${mediaId}"`,
        'Access-Control-Allow-Origin': '*',
      });
      response.status(HttpStatus.OK).send(buf.buffer);
    } catch (err: any) {
      console.error(`[video-thumbnail/${mediaId}] failed:`, err?.message || err);
      response.status(HttpStatus.NOT_FOUND).send();
    }
  }

}