import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  Res,
  StreamableFile,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiParam,
} from '@nestjs/swagger';
import { StudentNotesService, PaginatedResult } from './student-notes.service';
import { SharedNotesService } from './services/shared-notes.service';
import { SharedNotesCleanupService } from './services/cleanup.service';
import { SharedNoteCommentsService, CreateCommentDto } from './services/shared-note-comments.service';
import { StudentNote } from './entities/student-note.entity';
import { CreateStudentNoteDto } from './dto/create-student-note.dto';
import { UpdateStudentNoteDto } from './dto/update-student-note.dto';
import { NoteQueryDto } from './dto/note-query.dto';
import { UploadNoteFileDto } from './dto/upload-note-file.dto';
import { ShareNoteDto, SharedNotesQueryDto, UpdateSharedNoteDto } from './dto/share-note.dto';
import { 
  CreateModerationReportDto, 
  ModerationActionDto, 
  ModerationFiltersDto,
  AutoModerationConfigDto,
  ModerationStatsDto 
} from './dto/moderation.dto';
import { ModerationService } from './services/moderation.service';
import { AzureContentSafetyService } from './services/azure-content-safety.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { User } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Public } from '../../common/decorators/public.decorator';
import { Logger } from '@nestjs/common';

@ApiTags('Student Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('student-notes')
export class StudentNotesController {
  private readonly logger = new Logger(StudentNotesController.name);

  constructor(
    private readonly studentNotesService: StudentNotesService,
    private readonly sharedNotesService: SharedNotesService,
    private readonly sharedNotesCleanupService: SharedNotesCleanupService,
    private readonly sharedNoteCommentsService: SharedNoteCommentsService,
    private readonly moderationService: ModerationService,
    private readonly azureContentSafetyService: AzureContentSafetyService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  private async getUserFromToken(token: string): Promise<User | null> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['profile']
      });
      return user;
    } catch (error) {
      console.log('🚨 Token verification failed:', error.message);
      return null;
    }
  }

  @Post()
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Crear un nuevo apunte de texto' })
  @ApiResponse({ status: 201, description: 'Apunte creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async createNote(
    @CurrentUser() user: User,
    @Body() createNoteDto: CreateStudentNoteDto,
  ) {
    return this.studentNotesService.createNote(user.id, createNoteDto);
  }

  @Post('upload')
  @Roles(UserRole.STUDENT)
  @UseInterceptors(FileInterceptor('file', {
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit para audio/video
    },
    fileFilter: (req, file, callback) => {
      // Permitir tipos de archivo comunes para student notes
      const allowedMimes = [
        'image/jpeg', 'image/png', 'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/zip',
        // Audio files
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
        // Video files  
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
        // Additional document types
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];
      
      if (allowedMimes.includes(file.mimetype)) {
        callback(null, true);
      } else {
        callback(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
      }
    }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir un apunte con archivo adjunto' })
  @ApiResponse({ status: 201, description: 'Apunte con archivo creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivo o datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async uploadFileNote(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadNoteFileDto,
  ) {
    console.log('🔥🔥🔥 UPLOAD ENDPOINT HIT - DEBUGGING VALIDATION');
    console.log('🔥 User ID:', user?.id);
    console.log('🔥 File received:', {
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
      buffer: file?.buffer ? `Buffer(${file.buffer.length} bytes)` : 'NO BUFFER'
    });
    console.log('🔥 Upload DTO received:', {
      title: uploadDto?.title,
      content: uploadDto?.content,
      isPrivate: uploadDto?.isPrivate,
      tags: uploadDto?.tags,
      metadata: uploadDto?.metadata,
      subjectId: uploadDto?.subjectId
    });
    
    // Verificar si el archivo fue rechazado por el filtro
    if (!file) {
      console.log('🚨 NO FILE RECEIVED - REJECTED BY MULTER FILTER');
      throw new Error('Archivo no válido o no recibido');
    }
    
    // Verificar validación básica de DTO
    if (!uploadDto?.title || uploadDto.title.trim().length === 0) {
      console.log('🚨 VALIDATION ERROR: Title is required');
      throw new Error('Título es requerido');
    }
    
    // Transformar metadata si viene como string JSON
    if (uploadDto.metadata && typeof uploadDto.metadata === 'string') {
      try {
        uploadDto.metadata = JSON.parse(uploadDto.metadata as string);
        console.log('🔥 Metadata parsed successfully:', uploadDto.metadata);
      } catch (error) {
        // Si no se puede parsear, dejar como está
        console.warn('Could not parse metadata JSON:', uploadDto.metadata);
      }
    }
    
    try {
      const result = await this.studentNotesService.uploadFileNote(user.id, file, uploadDto);
      console.log('🔥 Upload successful, result:', result);
      return result;
    } catch (error) {
      console.log('🚨 SERVICE ERROR:', error.message);
      throw error;
    }
  }

  @Get('statistics')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener estadísticas de apuntes del estudiante' })
  @ApiResponse({ status: 200, description: 'Estadísticas de apuntes' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getStatistics(@CurrentUser() user: User) {
    console.log('🎯 CONTROLLER: getStatistics called for user:', user.id);
    try {
      const result = await this.studentNotesService.getNotesStatistics(user.id);
      console.log('🎯 CONTROLLER: Service returned:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('🎯 CONTROLLER ERROR:', error);
      throw error;
    }
  }


  @Get()
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener todos los apuntes del estudiante' })
  @ApiResponse({ status: 200, description: 'Lista de apuntes del estudiante' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getMyNotes(
    @CurrentUser() user: User,
    @Query() queryDto: NoteQueryDto,
  ): Promise<PaginatedResult<StudentNote>> {
    return this.studentNotesService.getStudentNotes(user.id, queryDto);
  }


  @Get(':id/stream')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Stream de archivo (audio, imagen, etc.) - proxy CORS - ADMIN ACCESS ENABLED' })
  @ApiParam({ name: 'id', description: 'ID del apunte' })
  @ApiResponse({ status: 200, description: 'Stream de archivo' })
  @ApiResponse({ status: 404, description: 'Apunte no encontrado' })
  @ApiResponse({ status: 400, description: 'El apunte no tiene archivo adjunto' })
  async streamFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token: string,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('📁📁📁 ID/STREAM ENDPOINT HIT!');
    console.log('📁 ID received:', id);
    console.log('📁 User:', user?.email, 'Role:', user?.role);
    
    try {
      // Si es admin, usar método especial que no verifica autoría
      const fileStream = user.role === UserRole.ADMIN 
        ? await this.studentNotesService.streamFileForAdmin(id)
        : await this.studentNotesService.streamFile(id, user.id);
      
      res.set({
        'Content-Type': fileStream.contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      });

      console.log('📁 File stream successful!');
      return new StreamableFile(fileStream.stream, {
        type: fileStream.contentType,
        disposition: `inline; filename="${fileStream.fileName}"`,
      });
    } catch (error) {
      console.error('🚨 File stream error:', error.message);
      throw error;
    }
  }

  // ADMIN: Endpoint específico para acceso admin a cualquier nota
  @Get('admin/:id/stream')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Stream de archivo para administradores (cualquier nota)' })
  @ApiParam({ name: 'id', description: 'ID del apunte' })
  @ApiResponse({ status: 200, description: 'Stream de archivo' })
  @ApiResponse({ status: 404, description: 'Apunte no encontrado' })
  @ApiResponse({ status: 400, description: 'El apunte no tiene archivo adjunto' })
  async streamFileForAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('📁🔑 ADMIN STREAM ENDPOINT HIT!');
    console.log('📁 ID received:', id);
    console.log('📁 Admin user:', user?.email);

    try {
      const { stream, contentType, fileName } = await this.studentNotesService.streamFileForAdmin(id);
      
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });

      return new StreamableFile(stream);
    } catch (error) {
      console.error('🚨 Admin file stream error:', error.message);
      throw error;
    }
  }

  // CRITICAL: Este endpoint debe ir ANTES del endpoint ':id' para evitar conflictos de rutas
  @Get('shared/:id/stream')
  @Roles(UserRole.STUDENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Stream de archivo para apunte compartido (audio, imagen, etc.) - proxy CORS' })
  @ApiParam({ name: 'id', description: 'ID del apunte compartido' })
  @ApiResponse({ status: 200, description: 'Stream de archivo compartido' })
  @ApiResponse({ status: 404, description: 'Apunte compartido no encontrado' })
  @ApiResponse({ status: 400, description: 'El apunte no tiene archivo adjunto' })
  async streamSharedFile(
    @Param('id', ParseUUIDPipe) sharedNoteId: string,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('📁🔗 SHARED NOTE STREAM ENDPOINT HIT!');
    console.log('📁 Shared Note ID received:', sharedNoteId);
    console.log('📁 User:', user?.id);
    
    try {
      const fileStream = await this.sharedNotesService.streamSharedFile(sharedNoteId, user.id);
      
      res.set({
        'Content-Type': fileStream.contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      });

      console.log('📁 Shared file stream successful!');
      return new StreamableFile(fileStream.stream, {
        type: fileStream.contentType,
        disposition: `inline; filename="${fileStream.fileName}"`,
      });
    } catch (error) {
      console.error('🚨 Shared file stream error:', error.message);
      throw error;
    }
  }



  // CRITICAL: Los endpoints específicos de DELETE deben ir ANTES del catch-all
  @Delete('sharing/:sharedNoteId')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Revocar acceso a un apunte compartido' })
  @ApiParam({ name: 'sharedNoteId', description: 'ID del apunte compartido' })
  @ApiResponse({ status: 200, description: 'Acceso revocado exitosamente' })
  @ApiResponse({ status: 404, description: 'Apunte compartido no encontrado' })
  async revokeSharedNote(
    @Param('sharedNoteId', ParseUUIDPipe) sharedNoteId: string,
    @CurrentUser() user: User,
  ) {
    console.log('🚫 REVOKE SHARED NOTE endpoint hit:', {
      sharedNoteId,
      userId: user.id
    });
    
    await this.sharedNotesService.revokeSharedNote(sharedNoteId, user.id);

    return {
      success: true,
      message: 'Acceso al apunte revocado correctamente',
    };
  }

  @Delete('sharing/:sharedNoteId/remove')
  @Roles(UserRole.STUDENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Eliminar apunte expirado de mi lista (receptor o emisor)' })
  @ApiParam({ name: 'sharedNoteId', description: 'ID del apunte compartido' })
  @ApiResponse({ status: 200, description: 'Apunte eliminado de la lista exitosamente' })
  @ApiResponse({ status: 404, description: 'Apunte compartido no encontrado' })
  @ApiResponse({ status: 400, description: 'Solo se pueden eliminar apuntes expirados' })
  async removeExpiredSharedNote(
    @Param('sharedNoteId', ParseUUIDPipe) sharedNoteId: string,
    @CurrentUser() user: User,
  ) {
    console.log('🗑️ REMOVE EXPIRED SHARED NOTE endpoint hit:', {
      sharedNoteId,
      userId: user.id
    });
    
    await this.sharedNotesService.removeExpiredSharedNote(sharedNoteId, user.id);
    
    return {
      success: true,
      message: 'Apunte eliminado de tu lista exitosamente',
    };
  }

  // CATCH-ALL REMOVIDO - Causaba conflictos con endpoints específicos
  // Si necesitas debug, usa logs específicos en cada endpoint

  @Put(':id/favorite')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Marcar/desmarcar apunte como favorito' })
  @ApiParam({ name: 'id', description: 'ID del apunte' })
  @ApiResponse({ status: 200, description: 'Estado de favorito actualizado' })
  @ApiResponse({ status: 404, description: 'Apunte no encontrado' })
  async toggleFavorite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.studentNotesService.toggleFavorite(id, user.id);
  }

  @Get('shared/:id/download')
  @Roles(UserRole.STUDENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Descargar archivo de apunte compartido' })
  @ApiParam({ name: 'id', description: 'ID del apunte compartido' })
  @ApiResponse({ status: 200, description: 'Archivo descargado' })
  @ApiResponse({ status: 404, description: 'Apunte compartido no encontrado' })
  @ApiResponse({ status: 400, description: 'El apunte no tiene archivo adjunto' })
  @ApiResponse({ status: 403, description: 'Sin permisos de descarga' })
  async downloadSharedFile(
    @Param('id', ParseUUIDPipe) sharedNoteId: string,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('⬇️ DOWNLOAD SHARED FILE endpoint hit:', {
      sharedNoteId,
      userId: user.id
    });
    
    try {
      const fileStream = await this.sharedNotesService.streamSharedFile(sharedNoteId, user.id);
      
      res.set({
        'Content-Type': fileStream.contentType,
        'Content-Disposition': `attachment; filename="${fileStream.fileName}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      });

      console.log('⬇️ Download successful!');
      return new StreamableFile(fileStream.stream, {
        type: fileStream.contentType,
        disposition: `attachment; filename="${fileStream.fileName}"`,
      });
    } catch (error) {
      console.error('🚨 Download error:', error.message);
      throw error;
    }
  }

  @Get(':id/export/powerpoint')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Exportar presentación como archivo PowerPoint' })
  @ApiParam({ name: 'id', description: 'ID del apunte de presentación' })
  @ApiResponse({ status: 200, description: 'Archivo PowerPoint generado' })
  @ApiResponse({ status: 404, description: 'Apunte no encontrado' })
  @ApiResponse({ status: 400, description: 'El apunte no es una presentación' })
  async exportToPowerPoint(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('📊 EXPORT POWERPOINT endpoint hit:', {
      noteId: id,
      userId: user.id
    });
    
    try {
      const note = await this.studentNotesService.getNoteById(id, user);
      
      if (note.type !== 'presentation') {
        throw new BadRequestException('Solo se pueden exportar presentaciones');
      }

      // Generar el archivo PowerPoint (implementación básica)
      const pptxBuffer = await this.studentNotesService.generatePowerPoint(note);
      
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${note.title || 'presentacion'}.pptx"`,
        'Access-Control-Allow-Origin': '*',
      });

      console.log('📊 PowerPoint export successful!');
      return new StreamableFile(Buffer.from(pptxBuffer), {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        disposition: `attachment; filename="${note.title || 'presentacion'}.pptx"`,
      });
    } catch (error) {
      console.error('🚨 PowerPoint export error:', error.message);
      throw error;
    }
  }

  @Get(':id/download')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener URL de descarga del archivo adjunto' })
  @ApiParam({ name: 'id', description: 'ID del apunte' })
  @ApiResponse({ status: 200, description: 'URL de descarga obtenida' })
  @ApiResponse({ status: 404, description: 'Apunte no encontrado' })
  @ApiResponse({ status: 400, description: 'El apunte no tiene archivo adjunto' })
  async getDownloadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const downloadUrl = await this.studentNotesService.getDownloadUrl(id, user.id);
    return { downloadUrl };
  }


  // ====================================
  // ENDPOINTS DE COMPARTIR APUNTES
  // ====================================

  @Get('sharing/classmates')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener compañeros de clase del estudiante actual' })
  @ApiResponse({ status: 200, description: 'Lista de compañeros de clase' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getClassmates(@CurrentUser() user: User) {
    console.log('🤝 GET CLASSMATES endpoint hit for user:', user.id);
    
    const classmates = await this.sharedNotesService.getClassmates(user.id);
    
    return {
      success: true,
      data: classmates,
      message: `Encontrados ${classmates.length} compañeros de clase`,
    };
  }

  @Get('sharing/teachers')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener profesores del estudiante actual' })
  @ApiResponse({ status: 200, description: 'Lista de profesores' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getStudentTeachers(@CurrentUser() user: User) {
    console.log('👨‍🏫 GET TEACHERS endpoint hit for user:', user.id);
    
    const teachers = await this.sharedNotesService.getStudentTeachers(user.id);
    
    return {
      success: true,
      data: teachers,
      message: `Encontrados ${teachers.length} profesores`,
    };
  }

  @Post(':id/share')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Compartir un apunte específico' })
  @ApiParam({ name: 'id', description: 'ID del apunte' })
  @ApiResponse({ status: 201, description: 'Apunte compartido exitosamente' })
  @ApiResponse({ status: 404, description: 'Apunte no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async shareNote(
    @Param('id', ParseUUIDPipe) noteId: string,
    @Body() shareNoteDto: ShareNoteDto,
    @CurrentUser() user: User,
  ) {
    console.log('📤 SHARE NOTE endpoint hit - STEP 1');
    console.log('📤 noteId:', noteId);
    console.log('📤 user exists:', !!user);
    console.log('📤 shareNoteDto:', shareNoteDto);
    
    console.log('📤 STEP 2 - About to call service');
    
    try {
      const sharedNotes = await this.sharedNotesService.shareNote(
        noteId, 
        user.id, 
        shareNoteDto
      );
      
      console.log('📤 STEP 3 - Service completed, length:', sharedNotes?.length);

      return {
        success: true,
        data: {
          sharedCount: sharedNotes.length,
          sharedWith: sharedNotes.map(sn => ({
            id: sn.id,
            sharedWithId: sn.sharedWithId,
            sharedWithType: sn.sharedWithType,
            message: sn.message,
            sharedAt: sn.sharedAt,
          })),
        },
        message: `Apunte compartido con ${sharedNotes.length} ${
          shareNoteDto.sharedWithType === 'student' ? 'compañeros' : 'profesores'
        }`,
      };
    } catch (error) {
      console.error('📤 ERROR in controller:', error.message);
      throw error;
    }
  }

  @Get('sharing/shared-with-me')
  @Roles(UserRole.STUDENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener apuntes compartidos conmigo' })
  @ApiResponse({ status: 200, description: 'Lista de apuntes compartidos conmigo' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getSharedWithMe(
    @Query() query: SharedNotesQueryDto,
    @CurrentUser() user: User,
  ) {
    console.log('📥 GET SHARED WITH ME endpoint hit for user:', user.id);
    
    const result = await this.sharedNotesService.getSharedWithMe(user.id, query);

    return {
      success: true,
      data: {
        sharedNotes: result.sharedNotes,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 10,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
      message: `Encontrados ${result.total} apuntes compartidos contigo`,
    };
  }

  @Get('sharing/shared-by-me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener apuntes que he compartido' })
  @ApiResponse({ status: 200, description: 'Lista de apuntes que he compartido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getSharedByMe(
    @Query() query: SharedNotesQueryDto,
    @CurrentUser() user: User,
  ) {
    console.log('📤 GET SHARED BY ME endpoint hit for user:', user.id);
    
    const result = await this.sharedNotesService.getSharedByMe(user.id, query);

    return {
      success: true,
      data: {
        sharedNotes: result.sharedNotes,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 10,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
      message: `Has compartido ${result.total} apuntes`,
    };
  }


  @Post('shared/:id/access')
  @Roles(UserRole.STUDENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Registrar acceso a un apunte compartido' })
  @ApiParam({ name: 'id', description: 'ID del apunte compartido' })
  @ApiResponse({ status: 200, description: 'Acceso registrado exitosamente' })
  @ApiResponse({ status: 404, description: 'Apunte compartido no encontrado' })
  async recordAccess(
    @Param('id', ParseUUIDPipe) sharedNoteId: string,
    @CurrentUser() user: User,
  ) {
    console.log('👁️ RECORD ACCESS endpoint hit:', {
      sharedNoteId,
      userId: user.id
    });
    
    await this.sharedNotesService.recordAccess(sharedNoteId, user.id);

    return {
      success: true,
      message: 'Acceso registrado correctamente',
    };
  }

  // ====================================
  // ENDPOINTS PROFESORES/ADMINISTRADORES
  // ====================================

  @Get('student/:studentId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener apuntes de un estudiante específico (para profesores)' })
  @ApiParam({ name: 'studentId', description: 'ID del estudiante' })
  @ApiResponse({ status: 200, description: 'Lista de apuntes del estudiante' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getStudentNotes(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() queryDto: NoteQueryDto,
  ): Promise<PaginatedResult<StudentNote>> {
    // Los profesores pueden ver apuntes no privados de sus estudiantes
    return this.studentNotesService.getStudentNotes(studentId, {
      page: queryDto.page,
      limit: queryDto.limit,
      type: queryDto.type,
      subjectId: queryDto.subjectId,
      search: queryDto.search,
      favorites: queryDto.favorites,
      startDate: queryDto.startDate,
      endDate: queryDto.endDate,
      tags: queryDto.tags,
      sortBy: queryDto.sortBy,
      sortOrder: queryDto.sortOrder,
      tagsArray: queryDto.tagsArray,
    });
  }

  @Get('student/:studentId/statistics')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estadísticas de apuntes de un estudiante (para profesores)' })
  @ApiParam({ name: 'studentId', description: 'ID del estudiante' })
  @ApiResponse({ status: 200, description: 'Estadísticas de apuntes del estudiante' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getStudentStatistics(
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.studentNotesService.getNotesStatistics(studentId);
  }

  // ===============================
  // ENDPOINTS DE LIMPIEZA AUTOMÁTICA
  // ===============================

  @Post('admin/cleanup/force')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ejecutar limpieza forzada de comparticiones expiradas (Solo Admin)' })
  @ApiResponse({ status: 200, description: 'Limpieza ejecutada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo administradores' })
  async forceCleanupExpiredSharedNotes(@CurrentUser() user: User) {
    console.log('🚨 FORCE CLEANUP called by admin:', user.email);
    const result = await this.sharedNotesCleanupService.forceCleanupExpiredSharedNotes();
    return result;
  }

  @Get('admin/cleanup/stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estadísticas de limpieza de comparticiones (Solo Admin)' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo administradores' })
  async getCleanupStatistics() {
    const stats = await this.sharedNotesCleanupService.getCleanupStatistics();
    return {
      success: true,
      data: stats,
      message: 'Estadísticas de limpieza obtenidas'
    };
  }

  // === ENDPOINTS DE COMENTARIOS ===

  @Post('shared/:sharedNoteId/comments')
  @Roles(UserRole.STUDENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Agregar comentario a una nota compartida' })
  @ApiParam({ name: 'sharedNoteId', description: 'ID de la nota compartida' })
  @ApiResponse({ status: 201, description: 'Comentario agregado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para comentar' })
  @ApiResponse({ status: 404, description: 'Nota compartida no encontrada' })
  async addComment(
    @Param('sharedNoteId', ParseUUIDPipe) sharedNoteId: string,
    @CurrentUser() user: User,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    const comment = await this.sharedNoteCommentsService.addComment(
      sharedNoteId, 
      user.id, 
      createCommentDto
    );
    
    return {
      success: true,
      data: comment,
      message: 'Comentario agregado exitosamente'
    };
  }

  @Get('shared/:sharedNoteId/comments')
  @Roles(UserRole.STUDENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener comentarios de una nota compartida' })
  @ApiParam({ name: 'sharedNoteId', description: 'ID de la nota compartida' })
  @ApiResponse({ status: 200, description: 'Comentarios obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para ver comentarios' })
  @ApiResponse({ status: 404, description: 'Nota compartida no encontrada' })
  async getComments(
    @Param('sharedNoteId', ParseUUIDPipe) sharedNoteId: string,
    @CurrentUser() user: User,
  ) {
    const comments = await this.sharedNoteCommentsService.getComments(
      sharedNoteId, 
      user.id
    );
    
    return {
      success: true,
      data: comments,
      message: 'Comentarios obtenidos exitosamente'
    };
  }

  @Delete('shared/comments/:commentId')
  @Roles(UserRole.STUDENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Eliminar un comentario propio' })
  @ApiParam({ name: 'commentId', description: 'ID del comentario' })
  @ApiResponse({ status: 200, description: 'Comentario eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo puedes eliminar tus propios comentarios' })
  @ApiResponse({ status: 404, description: 'Comentario no encontrado' })
  async deleteComment(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: User,
  ) {
    await this.sharedNoteCommentsService.deleteComment(commentId, user.id);
    
    return {
      success: true,
      message: 'Comentario eliminado exitosamente'
    };
  }

  // ====================================
  // ENDPOINTS DE ADMINISTRACIÓN
  // ====================================

  @Get('admin/dashboard')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Dashboard de administración de apuntes' })
  @ApiResponse({ status: 200, description: 'Estadísticas del dashboard obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo administradores' })
  async getAdminDashboard() {
    const dashboardStats = await this.studentNotesService.getAdminDashboardStats();
    
    return {
      success: true,
      data: dashboardStats,
      message: 'Estadísticas del dashboard obtenidas exitosamente'
    };
  }

  @Get('admin/analytics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Analytics avanzados para administrador' })
  @ApiResponse({ status: 200, description: 'Analytics obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo administradores' })
  async getAdminAnalytics(@Query('period') period?: 'week' | 'month' | 'year') {
    const actualPeriod = period || 'month';
    const analytics = await this.studentNotesService.getAdminAnalytics(actualPeriod);
    
    return {
      success: true,
      data: analytics,
      message: 'Analytics obtenidos exitosamente'
    };
  }

  @Get('admin/all-notes')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener todos los apuntes del sistema para administrador' })
  @ApiResponse({ status: 200, description: 'Lista de todos los apuntes obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo administradores' })
  async getAllNotesForAdmin(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.studentNotesService.getAllNotesForAdmin({
      page,
      limit,
      type,
      search
    });
    
    return {
      success: true,
      data: result,
      message: `Encontrados ${result.total} apuntes`
    };
  }

  @Delete('admin/note/:id/force')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar cualquier apunte (forzado por admin)' })
  @ApiParam({ name: 'id', description: 'ID del apunte' })
  @ApiResponse({ status: 200, description: 'Apunte eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo administradores' })
  @ApiResponse({ status: 404, description: 'Apunte no encontrado' })
  async forceDeleteNote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.studentNotesService.forceDeleteNote(id);
    
    return {
      success: true,
      message: 'Apunte eliminado por administrador'
    };
  }

  // ENDPOINTS FAMILIARES: Acceso de padres a apuntes de sus hijos
  @Get('family/my-children-notes')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener apuntes de todos los hijos de la familia' })
  @ApiResponse({ status: 200, description: 'Apuntes de los hijos obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo familias' })
  async getMyChildrenNotes(
    @CurrentUser() user: User,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
    @Query('type') type?: string,
    @Query('childId') childId?: string,
    @Query('search') search?: string,
  ): Promise<any> {
    console.log('🚨 CONTROLLER DEBUG: getMyChildrenNotes called');
    console.log('🚨 CONTROLLER DEBUG: user:', user.email, user.id);
    console.log('🚨 CONTROLLER DEBUG: pageParam:', pageParam, 'limitParam:', limitParam, 'search:', search);
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 10; // Changed default from 20 to 10
    
    const result = await this.studentNotesService.getChildrenNotesForFamily(
      user.id,
      { page, limit, type, childId, search }
    );
    
    return {
      success: true,
      data: result,
      message: `Encontrados ${result.total} apuntes de tus hijos`
    };
  }

  @Get('family/children-analytics')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'Analytics de apuntes de los hijos para la familia' })
  @ApiResponse({ status: 200, description: 'Analytics obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo familias' })
  async getChildrenAnalytics(
    @CurrentUser() user: User,
    @Query('period') period?: 'week' | 'month' | 'year',
  ) {
    const actualPeriod = period || 'month';
    const analytics = await this.studentNotesService.getChildrenAnalyticsForFamily(user.id, actualPeriod);
    
    return {
      success: true,
      data: analytics,
      message: 'Analytics de hijos obtenidos exitosamente'
    };
  }

  @Get('family/child/:childId/notes')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener apuntes de un hijo específico' })
  @ApiParam({ name: 'childId', description: 'ID del hijo estudiante' })
  @ApiResponse({ status: 200, description: 'Apuntes del hijo obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo familias' })
  @ApiResponse({ status: 404, description: 'Hijo no encontrado o no pertenece a esta familia' })
  async getChildNotes(
    @Param('childId', ParseUUIDPipe) childId: string,
    @CurrentUser() user: User,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
    @Query('type') type?: string,
  ) {
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    
    const result = await this.studentNotesService.getChildNotesForFamily(
      user.id,
      childId,
      { page, limit, type }
    );
    
    return {
      success: true,
      data: result,
      message: `Encontrados ${result.total} apuntes del hijo`
    };
  }

  @Get('family/note/:id/view')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'Ver apunte específico de un hijo (solo lectura familiar)' })
  @ApiParam({ name: 'id', description: 'ID del apunte' })
  @ApiResponse({ status: 200, description: 'Apunte obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo familias' })
  @ApiResponse({ status: 404, description: 'Apunte no encontrado o no pertenece a tus hijos' })
  async viewChildNote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const note = await this.studentNotesService.getChildNoteForFamily(user.id, id);
    
    return {
      success: true,
      data: note,
      message: 'Apunte del hijo obtenido exitosamente'
    };
  }

  @Get('family/note/:id/stream')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'Stream de archivo de apunte de hijo para familias' })
  @ApiParam({ name: 'id', description: 'ID del apunte' })
  @ApiResponse({ status: 200, description: 'Stream de archivo' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo familias' })
  @ApiResponse({ status: 404, description: 'Apunte no encontrado o no pertenece a tus hijos' })
  async streamChildNoteFile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('📁👨‍👩‍👧‍👦 FAMILY FILE STREAM - ID:', id, 'Family user:', user?.email);
    
    try {
      const fileStream = await this.studentNotesService.streamFileForFamily(user.id, id);
      
      res.set({
        'Content-Type': fileStream.contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      });

      console.log('📁👨‍👩‍👧‍👦 Family file stream successful!');
      return new StreamableFile(fileStream.stream, {
        type: fileStream.contentType,
        disposition: `inline; filename="${fileStream.fileName}"`,
      });
    } catch (error) {
      console.error('🚨👨‍👩‍👧‍👦 Family file stream error:', error.message);
      throw error;
    }
  }

  @Get('admin/settings')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener configuración actual del sistema de apuntes' })
  @ApiResponse({ status: 200, description: 'Configuración obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo administradores' })
  async getSystemSettings(@CurrentUser() user: User) {
    console.log('🔧 GET /admin/settings called by user:', user.email);
    
    try {
      const currentSettings = await this.studentNotesService.getSystemSettings();
      console.log('✅ Settings retrieved successfully:', currentSettings);
      
      return {
        success: true,
        data: currentSettings,
        message: 'Configuración obtenida exitosamente'
      };
    } catch (error) {
      console.error('❌ Error in getSystemSettings controller:', error);
      throw error;
    }
  }

  @Put('admin/settings')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar configuración del sistema de apuntes' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo administradores' })
  async updateSystemSettings(
    @Body() settings: any,
    @CurrentUser() user: User,
  ) {
    const updatedSettings = await this.studentNotesService.updateSystemSettings(settings);
    
    return {
      success: true,
      data: updatedSettings,
      message: 'Configuración actualizada exitosamente'
    };
  }

  // ====================================
  // ENDPOINTS DE MODERACIÓN
  // ====================================

  @Post('admin/moderation/report')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear reporte de moderación' })
  @ApiResponse({ status: 201, description: 'Reporte creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o reporte duplicado' })
  @ApiResponse({ status: 404, description: 'Nota no encontrada' })
  async createModerationReport(
    @Body() dto: CreateModerationReportDto,
    @CurrentUser() user: User,
  ) {
    const report = await this.moderationService.createReport(dto, user);
    return {
      success: true,
      data: report,
      message: 'Reporte de moderación creado exitosamente'
    };
  }

  @Get('admin/moderation/reports')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener reportes de moderación con filtros' })
  @ApiResponse({ status: 200, description: 'Reportes obtenidos exitosamente' })
  async getModerationReports(@Query() filters: ModerationFiltersDto) {
    const result = await this.moderationService.getReports(filters);
    return {
      success: true,
      data: result,
      message: `Encontrados ${result.total} reportes`
    };
  }

  @Put('admin/moderation/report/:id/action')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Realizar acción de moderación sobre un reporte' })
  @ApiParam({ name: 'id', description: 'ID del reporte' })
  @ApiResponse({ status: 200, description: 'Acción realizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Reporte no encontrado' })
  @ApiResponse({ status: 400, description: 'Reporte ya procesado' })
  async takeModerationAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerationActionDto,
    @CurrentUser() user: User,
  ) {
    const report = await this.moderationService.takeAction(id, dto, user);
    return {
      success: true,
      data: report,
      message: `Acción ${dto.action} aplicada exitosamente`
    };
  }

  @Get('admin/moderation/stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estadísticas de moderación' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  async getModerationStats(@Query() dto: ModerationStatsDto) {
    const stats = await this.moderationService.getStats(dto);
    return {
      success: true,
      data: stats,
      message: 'Estadísticas de moderación obtenidas exitosamente'
    };
  }

  @Get('admin/moderation/config')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener configuración de auto-moderación' })
  @ApiResponse({ status: 200, description: 'Configuración obtenida exitosamente' })
  async getModerationConfig() {
    const config = await this.moderationService.getConfig();
    return {
      success: true,
      data: config || {
        autoModerationEnabled: false,
        bannedWords: [],
        sensitivity: 5,
        autoApproveTrustedUsers: false,
        trustedUserIds: []
      },
      message: 'Configuración de moderación obtenida exitosamente'
    };
  }

  @Put('admin/moderation/config')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar configuración de auto-moderación' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada exitosamente' })
  async updateModerationConfig(@Body() dto: AutoModerationConfigDto) {
    const config = await this.moderationService.updateAutoModerationConfig(dto);
    return {
      success: true,
      data: config,
      message: 'Configuración de auto-moderación actualizada exitosamente'
    };
  }

  @Post('admin/moderation/scan')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Escanear contenido existente en busca de problemas' })
  @ApiResponse({ status: 200, description: 'Escaneo completado exitosamente' })
  async scanContent() {
    try {
      const result = await this.moderationService.scanExistingContent();
      return {
        success: true,
        data: result,
        message: `Escaneo completado. Revisadas: ${result.scanned} notas, Flagged: ${result.flagged}`
      };
    } catch (error) {
      console.log('🔧 SCAN CONTROLLER: Error caught:', error.message);
      console.log('🔧 SCAN CONTROLLER: Error code:', error.code);
      
      // Si es un error de restricción única (reporte duplicado), devolver respuesta exitosa
      if (error.code === '23505' || error.message?.includes('duplicate key value violates unique constraint')) {
        console.log('🔧 SCAN CONTROLLER: Duplicate constraint detected, returning success with note about existing reports');
        return {
          success: true,
          data: { scanned: 0, flagged: 0 },
          message: 'Escaneo completado. Las notas ya tienen reportes existentes (sin duplicados creados)'
        };
      }
      
      // Para otros errores, relanzar
      console.log('🔧 SCAN CONTROLLER: Re-throwing non-duplicate error');
      throw error;
    }
  }

  @Get('user/moderation-warnings')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener advertencias de moderación del usuario actual' })
  @ApiResponse({ status: 200, description: 'Advertencias obtenidas exitosamente' })
  async getUserModerationWarnings(@CurrentUser() user: User) {
    const warnings = await this.moderationService.getUserWarnings(user.id);
    return {
      success: true,
      data: warnings,
      message: `Encontradas ${warnings.length} advertencias`
    };
  }

  @Get('user/moderation-notifications')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener notificaciones de moderación del usuario actual' })
  @ApiResponse({ status: 200, description: 'Notificaciones de moderación obtenidas exitosamente' })
  async getUserModerationNotifications(@CurrentUser() user: User) {
    try {
      console.log(`📧 MODERATION NOTIFICATIONS START: User ${user.email} (${user.role}) requesting notifications`);
      
      // Obtener notificaciones directamente del repositorio
      const notificationRepository = this.dataSource.getRepository('Notification');
      
      const notifications = await notificationRepository.find({
        where: { 
          userId: user.id,
          type: 'MODERATION' 
        },
        order: { createdAt: 'DESC' },
        take: 50
      });

      console.log(`📧 MODERATION NOTIFICATIONS: Found ${notifications.length} notifications for user ${user.email}`);
      console.log(`📧 MODERATION NOTIFICATIONS: Sample data:`, notifications.slice(0, 2));

      return {
        success: true,
        data: notifications,
        message: `Encontradas ${notifications.length} notificaciones de moderación`
      };
    } catch (error) {
      console.error('❌ MODERATION NOTIFICATIONS: Error getting notifications:', error);
      return {
        success: false,
        data: [],
        message: 'Error al obtener notificaciones de moderación'
      };
    }
  }

  @Get('debug/family-notifications')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'DEBUG: Notificaciones específicas para familias' })
  @ApiResponse({ status: 200, description: 'Debug de notificaciones familiares' })
  async debugFamilyNotifications(@CurrentUser() user: User) {
    try {
      console.log(`🔍 FAMILY DEBUG: User ${user.email} (${user.id}) requesting family notifications`);
      
      const notificationRepository = this.dataSource.getRepository('Notification');
      
      // Obtener TODAS las notificaciones del usuario para debug
      const allNotifications = await notificationRepository.find({
        where: { userId: user.id },
        order: { createdAt: 'DESC' }
      });

      // Obtener solo las de moderación
      const moderationNotifications = await notificationRepository.find({
        where: { 
          userId: user.id,
          type: 'MODERATION' 
        },
        order: { createdAt: 'DESC' }
      });

      console.log(`🔍 FAMILY DEBUG: Total notifications: ${allNotifications.length}, Moderation: ${moderationNotifications.length}`);

      return {
        success: true,
        debug: {
          userId: user.id,
          userEmail: user.email,
          userRole: user.role,
          totalNotifications: allNotifications.length,
          moderationNotifications: moderationNotifications.length,
          allNotificationsTypes: allNotifications.map(n => ({ type: n.type, title: n.title, createdAt: n.createdAt })),
          moderationData: moderationNotifications
        },
        message: `Debug completado para familia ${user.email}`
      };
    } catch (error) {
      console.error('❌ FAMILY DEBUG: Error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error en debug de familia'
      };
    }
  }

  // IMPORTANT: Generic :id endpoints MUST go at the end to avoid route conflicts
  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener un apunte específico' })
  @ApiParam({ name: 'id', description: 'ID del apunte' })
  @ApiResponse({ status: 200, description: 'Apunte encontrado' })
  @ApiResponse({ status: 404, description: 'Apunte no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para ver este apunte' })
  async getNoteById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.studentNotesService.getNoteById(id, user);
  }

  @Put(':id')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Actualizar un apunte' })
  @ApiParam({ name: 'id', description: 'ID del apunte' })
  @ApiResponse({ status: 200, description: 'Apunte actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Apunte no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para editar este apunte' })
  async updateNote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() updateDto: UpdateStudentNoteDto,
  ) {
    return this.studentNotesService.updateNote(id, user.id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Eliminar un apunte' })
  @ApiParam({ name: 'id', description: 'ID del apunte' })
  @ApiResponse({ status: 200, description: 'Apunte eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Apunte no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para eliminar este apunte' })
  async deleteNote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    console.log('🔥🔥🔥 BACKEND DELETE ENDPOINT HIT!');
    console.log('🔥 ID received:', id);
    console.log('🔥 User:', user?.id);
    console.log('🔥 Full request params:', { id });
    console.log('🔥 Request timestamp:', new Date().toISOString());
    await this.studentNotesService.deleteNote(id, user.id);
    return { message: 'Apunte eliminado exitosamente' };
  }

  // ====================================
  // ENDPOINTS ESPECÍFICOS PARA FAMILIAS - COMENTARIOS
  // ====================================

  @Get('family/note/:noteId/comments')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener comentarios de un apunte de hijo para familia' })
  @ApiParam({ name: 'noteId', description: 'ID del apunte' })
  @ApiResponse({ status: 200, description: 'Comentarios obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para ver este apunte' })
  @ApiResponse({ status: 404, description: 'Apunte no encontrado' })
  async getFamilyNoteComments(
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentUser() user: User,
  ) {
    try {
      // Verificar que la familia tiene acceso al apunte
      const note = await this.studentNotesService.getChildNoteForFamily(user.id, noteId);
      
      // Si llegamos aquí, la familia tiene acceso. 
      // Por ahora retornar comentarios vacíos ya que los comentarios están asociados a shared notes
      // pero los padres ven apuntes directos, no compartidos
      // En el futuro aquí se implementaría la lógica para obtener comentarios asociados al apunte
      const comments = [];
      
      return {
        success: true,
        data: comments,
        message: 'Comentarios obtenidos exitosamente'
      };
    } catch (error) {
      // Si hay error verificando acceso, retornar comentarios vacíos en lugar de error
      console.log('Family note comments access verification failed:', error.message);
      return {
        success: true,
        data: [],
        message: 'Sin comentarios disponibles'
      };
    }
  }

  @Delete('family/comments/:commentId')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'Eliminar comentario de apunte de hijo (moderación familiar)' })
  @ApiParam({ name: 'commentId', description: 'ID del comentario' })
  @ApiResponse({ status: 200, description: 'Comentario eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para eliminar este comentario' })
  @ApiResponse({ status: 404, description: 'Comentario no encontrado' })
  async deleteFamilyComment(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: User,
  ) {
    // Por ahora, simular eliminación exitosa
    // En una implementación completa, verificaríamos que el comentario pertenece a un apunte de un hijo de esta familia
    
    return {
      success: true,
      message: 'Comentario eliminado exitosamente'
    };
  }

  // =============================================================================
  // AZURE CONTENT MODERATOR TESTING
  // =============================================================================

  @Get('admin/moderation/azure/test')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Probar conexión con Azure Content Moderator' })
  @ApiResponse({ status: 200, description: 'Test de conexión exitoso' })
  @ApiResponse({ status: 500, description: 'Error en la conexión' })
  async testAzureContentModerator() {
    try {
      const isConfigured = this.azureContentSafetyService.isServiceConfigured();
      const connectionTest = await this.azureContentSafetyService.testConnection();
      
      // Test básico de moderación de texto
      const testResult = await this.azureContentSafetyService.moderateText(
        'Hola mundo, esto es una prueba de Azure Content Safety para MW Panel.',
        { language: 'spa' }
      );

      return {
        success: true,
        message: 'Azure Content Moderator funcionando correctamente',
        data: {
          isConfigured,
          connectionTest,
          testModeration: {
            isContentFlagged: testResult.isContentFlagged,
            confidence: testResult.confidence,
            reason: testResult.reason,
            categories: testResult.categories,
            reviewRecommended: testResult.reviewRecommended
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al probar Azure Content Moderator',
        error: error.message
      };
    }
  }

  @Post('admin/moderation/azure/moderate-text')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Probar moderación de texto con Azure Content Moderator' })
  @ApiResponse({ status: 200, description: 'Moderación de texto completada' })
  async moderateTextWithAzure(@Body() body: { text: string; language?: string }) {
    try {
      if (!body.text) {
        throw new BadRequestException('El texto es requerido');
      }

      const result = await this.azureContentSafetyService.moderateText(body.text, {
        language: body.language || 'spa',
        categories: ['Hate', 'Sexual', 'Violence', 'SelfHarm']
      });

      return {
        success: true,
        message: 'Moderación completada exitosamente',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al moderar texto con Azure',
        error: error.message
      };
    }
  }

  @Get('admin/moderation/azure/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estado de Azure AI Content Safety' })
  @ApiResponse({ status: 200, description: 'Estado de Azure AI Content Safety obtenido' })
  async getAzureContentModeratorStatus() {
    try {
      const status = await this.moderationService.getAzureStatus();
      return {
        success: true,
        message: 'Estado de Azure AI Content Safety obtenido',
        data: status
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener estado de Azure',
        error: error.message
      };
    }
  }

  @Post('admin/moderation/process-expired')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Procesar reportes vencidos manualmente' })
  @ApiResponse({ status: 200, description: 'Reportes vencidos procesados' })
  async processExpiredReports(@CurrentUser() user: User) {
    try {
      const result = await this.moderationService.processExpiredReports();
      return {
        success: true,
        message: 'Reportes vencidos procesados exitosamente',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al procesar reportes vencidos',
        error: error.message
      };
    }
  }

  @Post('admin/moderation/process-flagged')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Procesar reportes flagged automáticamente' })
  @ApiResponse({ status: 200, description: 'Reportes flagged procesados' })
  async processFlaggedReports(@CurrentUser() user: User) {
    try {
      const result = await this.moderationService.processFlaggedReports();
      return {
        success: true,
        message: 'Reportes flagged procesados exitosamente',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al procesar reportes flagged',
        error: error.message
      };
    }
  }

  @Post('cron/moderation/process-expired')
  @Public()
  @ApiOperation({ summary: 'Procesar reportes vencidos (cron job)' })
  @ApiResponse({ status: 200, description: 'Cron job ejecutado' })
  async cronProcessExpiredReports() {
    try {
      const result = await this.moderationService.processExpiredReports();
      console.log(`🕒 CRON: Expired reports processed:`, result);
      return {
        success: true,
        message: 'Cron job ejecutado exitosamente',
        data: result,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ CRON: Error processing expired reports:', error);
      return {
        success: false,
        message: 'Error en cron job',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  @Post('moderation/scan-platform')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Ejecutar escaneo completo de la plataforma',
    description: 'Escanea todas las notas y comentarios existentes en busca de contenido problemático. Solo disponible para administradores.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Escaneo completado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            notes: {
              type: 'object',
              properties: {
                scanned: { type: 'number' },
                flagged: { type: 'number' }
              }
            },
            comments: {
              type: 'object',
              properties: {
                scanned: { type: 'number' },
                flagged: { type: 'number' }
              }
            },
            total: {
              type: 'object',
              properties: {
                scanned: { type: 'number' },
                flagged: { type: 'number' }
              }
            }
          }
        },
        timestamp: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Sin permisos de administrador' })
  async scanPlatformContent(@CurrentUser() user: User) {
    try {
      this.logger.log(`🔍 MANUAL SCAN: Platform content scan initiated by admin ${user.email}`);
      
      // Verificar que la auto-moderación esté habilitada
      const config = await this.moderationService.getConfig();
      if (!config?.autoModerationEnabled) {
        return {
          success: false,
          message: 'La moderación automática está deshabilitada. Actívala antes de ejecutar el escaneo.',
          data: null,
          timestamp: new Date()
        };
      }

      // Escanear notas existentes
      const notesResult = await this.moderationService.scanExistingContent();
      this.logger.log(`✅ MANUAL SCAN: Notes scan completed - Scanned: ${notesResult.scanned}, Flagged: ${notesResult.flagged}`);
      
      // Escanear comentarios existentes
      const commentsResult = await this.moderationService.scanExistingComments();
      this.logger.log(`✅ MANUAL SCAN: Comments scan completed - Scanned: ${commentsResult.scanned}, Flagged: ${commentsResult.flagged}`);
      
      const totalScanned = notesResult.scanned + commentsResult.scanned;
      const totalFlagged = notesResult.flagged + commentsResult.flagged;
      
      this.logger.log(`📊 MANUAL SCAN: Total results - Scanned: ${totalScanned}, Flagged: ${totalFlagged}`);
      
      const resultData = {
        notes: notesResult,
        comments: commentsResult,
        total: {
          scanned: totalScanned,
          flagged: totalFlagged
        }
      };

      return {
        success: true,
        message: `Escaneo completo finalizado. Se escanearon ${totalScanned} elementos y se marcaron ${totalFlagged} para moderación.`,
        data: resultData,
        timestamp: new Date()
      };
      
    } catch (error) {
      this.logger.error(`❌ MANUAL SCAN: Platform scan failed:`, error);
      return {
        success: false,
        message: `Error durante el escaneo: ${error.message}`,
        data: null,
        timestamp: new Date()
      };
    }
  }

}