import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  Response,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CommunicationsService } from './communications.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ForbiddenException } from '@nestjs/common';
import { TeacherAccessService } from '../../common/teacher-access/teacher-access.service';
import { UserRole } from '../users/entities/user.entity';

// Configuración de Multer para archivos adjuntos
const multerConfig = {
  storage: diskStorage({
    destination: '/app/uploads/message-attachments',
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = extname(file.originalname);
      const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
      callback(null, filename);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB por archivo
    files: 10, // Máximo 10 archivos por mensaje
  },
  fileFilter: (req, file, callback) => {
    // Permitir todos los tipos de archivos
    // Tipos comunes: documentos, imágenes, audio, video, PDF
    const allowedMimes = [
      // Documentos
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      // Imágenes
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // Audio
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/webm',
      'audio/x-m4a',
      // Video
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/webm',
      // Archivos comprimidos
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
    }
  },
};

@ApiTags('communications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('communications')
export class CommunicationsController {
  constructor(
    private readonly communicationsService: CommunicationsService,
    private readonly teacherAccess: TeacherAccessService,
  ) {}

  /** RGPD: un profesor solo accede a grupos donde es tutor o imparte asignatura. */
  private async assertTeacherGroupAccess(req: any, classGroupId: string): Promise<void> {
    if (req.user?.role === UserRole.TEACHER) {
      const userId = req.user?.sub || req.user?.userId || req.user?.id;
      if (!classGroupId || !(await this.teacherAccess.canTeacherAccessClassGroup(userId, classGroupId))) {
        throw new ForbiddenException('No tienes acceso a este grupo');
      }
    }
  }

  /** RGPD: valida que los destinatarios estén dentro del conjunto accesible del profesor. */
  private async assertTeacherRecipients(req: any, recipientIds: string[]): Promise<void> {
    if (req.user?.role !== UserRole.TEACHER || !recipientIds?.length) return;
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const allowed = await this.communicationsService.getAvailableRecipients(userId);
    const allowedIds = new Set(allowed.map((r: any) => r.id));
    const invalid = recipientIds.filter((id) => !allowedIds.has(id));
    if (invalid.length) {
      throw new ForbiddenException('No tienes acceso a uno o más destinatarios');
    }
  }

  // ==================== MESSAGES ====================

  @Post('messages')
  @ApiOperation({ summary: 'Enviar nuevo mensaje o guardar como borrador' })
  @ApiResponse({ status: 201, description: 'Mensaje enviado/borrador guardado exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async createMessage(@Request() req: any, @Body() createMessageDto: CreateMessageDto) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.communicationsService.createMessage(userId, createMessageDto);
  }

  // ==================== DRAFTS ====================

  @Get('drafts')
  @ApiOperation({ summary: 'Obtener borradores del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de borradores obtenida exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async getUserDrafts(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.communicationsService.getUserDrafts(userId);
  }

  @Get('drafts/count')
  @ApiOperation({ summary: 'Obtener número de borradores' })
  @ApiResponse({ status: 200, description: 'Contador obtenido exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async getDraftsCount(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const count = await this.communicationsService.getDraftsCount(userId);
    return { count };
  }

  @Get('drafts/:id')
  @ApiOperation({ summary: 'Obtener un borrador específico' })
  @ApiResponse({ status: 200, description: 'Borrador obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Borrador no encontrado' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async getDraft(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.communicationsService.getDraft(id, userId);
  }

  @Patch('drafts/:id')
  @ApiOperation({ summary: 'Actualizar un borrador' })
  @ApiResponse({ status: 200, description: 'Borrador actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Borrador no encontrado' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async updateDraft(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updateMessageDto: UpdateMessageDto,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.communicationsService.updateDraft(id, userId, updateMessageDto);
  }

  @Post('drafts/:id/send')
  @ApiOperation({ summary: 'Enviar un borrador (convertir a mensaje enviado)' })
  @ApiResponse({ status: 200, description: 'Borrador enviado exitosamente' })
  @ApiResponse({ status: 404, description: 'Borrador no encontrado' })
  @ApiResponse({ status: 400, description: 'El borrador no tiene destinatario o contenido válido' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async sendDraft(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.communicationsService.sendDraft(id, userId);
  }

  @Delete('drafts/:id')
  @ApiOperation({ summary: 'Eliminar un borrador' })
  @ApiResponse({ status: 204, description: 'Borrador eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Borrador no encontrado' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async deleteDraft(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.communicationsService.deleteDraft(id, userId);
  }

  @Post('messages/with-attachments')
  @ApiOperation({ summary: 'Enviar mensaje con archivos adjuntos (múltiples archivos soportados)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Mensaje enviado exitosamente con archivos adjuntos' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  @UseInterceptors(FilesInterceptor('attachments', 10, multerConfig))
  async createMessageWithAttachments(
    @Request() req: any,
    @Body() createMessageDto: CreateMessageDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;

    // Crear el mensaje primero
    const message = await this.communicationsService.createMessage(userId, createMessageDto);

    // Si hay archivos, procesarlos y asociarlos al mensaje
    if (files && files.length > 0) {
      await this.communicationsService.addAttachmentsToMessage(message.id, files);
    }

    // Retornar el mensaje con los adjuntos
    return this.communicationsService.findOneMessage(message.id);
  }

  @Get('admin/messages')
  @ApiOperation({ summary: 'Obtener mensajes para panel de administración (separados por tipo)' })
  @ApiResponse({ status: 200, description: 'Mensajes obtenidos exitosamente' })
  @ApiQuery({ name: 'mode', required: true, enum: ['direct', 'supervision'], description: 'direct=mensajes para admin, supervision=todos los mensajes de la plataforma' })
  @ApiQuery({ name: 'type', required: false, description: 'Filtrar por tipo de mensaje' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filtrar por prioridad' })
  @ApiQuery({ name: 'isRead', required: false, description: 'Filtrar por estado de lectura' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar en asunto o contenido' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página 1-based. Defecto 1.' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Tamaño de página (1-100). Defecto 25.' })
  @Roles(UserRole.ADMIN)
  async findAdminMessages(@Request() req: any, @Query() filters: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.communicationsService.findAdminMessages(userId, filters);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Obtener mensajes del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de mensajes obtenida exitosamente' })
  @ApiQuery({ name: 'type', required: false, description: 'Filtrar por tipo de mensaje' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filtrar por prioridad' })
  @ApiQuery({ name: 'isRead', required: false, description: 'Filtrar por estado de lectura' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar en asunto o contenido (ILIKE)' })
  @ApiQuery({ name: 'partnerId', required: false, description: 'Restringe a mensajes del hilo 1:1 con este usuario (sender/recipient en ambas direcciones)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página 1-based. Si está presente, activa respuesta paginada {data,total,page,limit,hasMore}. Sin page, devuelve array plano.' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Tamaño de página (1-100). Defecto 25 cuando page está presente. Sin page, trunca el array plano.' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async findAllMessages(@Request() req: any, @Query() filters: any) {
    console.log('Controller: findAllMessages called');
    console.log('Controller: User:', req.user);
    
    // Debug info
    try {
      const userId = req.user?.sub || req.user?.userId || req.user?.id;
      const result: any = await this.communicationsService.findAllMessages(userId, filters);
      console.log('Controller: Messages returned:', Array.isArray(result) ? result.length : result?.total);
      return result;
    } catch (error) {
      console.error('Controller: Error in findAllMessages:', error);
      throw error;
    }
  }

  @Get('messages/unread-count')
  @ApiOperation({ summary: 'Obtener número de mensajes no leídos' })
  @ApiResponse({ status: 200, description: 'Contador obtenido exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async getUnreadMessagesCount(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const count = await this.communicationsService.getUnreadMessagesCount(userId);
    return { count };
  }

  /**
   * GET /communications/badges
   * Devuelve mensajes + notificaciones no leídas en una sola llamada.
   * Fuente: Redis (< 5ms). Reemplaza los dos endpoints separados para
   * el polling del header de la aplicación.
   */
  @Get('badges')
  @ApiOperation({ summary: 'Obtener contadores de mensajes y notificaciones no leídos' })
  @ApiResponse({ status: 200, description: '{ messages: number, notifications: number }' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async getBadges(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.communicationsService.getBadges(userId);
  }

  @Get('messages/:id')
  @ApiOperation({ summary: 'Obtener mensaje específico con archivos adjuntos' })
  @ApiResponse({ status: 200, description: 'Mensaje obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Mensaje no encontrado' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async findOneMessage(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.communicationsService.findOneMessageForUser(id, userId);
  }

  @Get('attachments/:attachmentId/download')
  @ApiOperation({ summary: 'Descargar archivo adjunto' })
  @ApiResponse({ status: 200, description: 'Archivo descargado exitosamente' })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async downloadAttachment(@Param('attachmentId') attachmentId: string, @Response() res: any, @Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const file = await this.communicationsService.downloadAttachment(attachmentId, userId);

    if (file.path?.startsWith('https://')) {
      return res.redirect(file.path);
    }
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    const relativePath = file.path.startsWith('/app/') ? file.path.slice(5) : file.path;
    res.sendFile(relativePath, { root: '/app' });
  }

  @Get('attachments/:attachmentId/view')
  @ApiOperation({ summary: 'Visualizar archivo adjunto inline (para imágenes)' })
  @ApiResponse({ status: 200, description: 'Archivo visualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async viewAttachment(@Param('attachmentId') attachmentId: string, @Response() res: any, @Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const file = await this.communicationsService.downloadAttachment(attachmentId, userId);

    if (file.path?.startsWith('https://')) {
      return res.redirect(file.path);
    }
    // Para imágenes, mostrar inline sin forzar descarga
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 1 día
    const relativePath = file.path.startsWith('/app/') ? file.path.slice(5) : file.path;
    res.sendFile(relativePath, { root: '/app' });
  }

  /**
   * Proxy endpoint for audio attachments stored on Google Drive.
   * The browser's <audio> element cannot follow Drive's cross-origin redirects,
   * so we download the bytes server-side and stream them back with the correct
   * Content-Type, Accept-Ranges, and (partial-content) Range support.
   */
  @Get('attachments/:attachmentId/stream')
  @ApiOperation({ summary: 'Stream audio/voice note through backend proxy' })
  @ApiResponse({ status: 200, description: 'Audio streamed successfully' })
  @ApiResponse({ status: 206, description: 'Partial content (Range request)' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async streamAttachment(
    @Param('attachmentId') attachmentId: string,
    @Response() res: any,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const { buffer, mimeType, filename } =
      await this.communicationsService.streamAttachment(attachmentId, userId);

    const totalSize = buffer.length;
    const rangeHeader: string | undefined = req.headers['range'];

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    if (rangeHeader) {
      // Parse "bytes=START-END"
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
      const chunkSize = end - start + 1;

      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      res.setHeader('Content-Length', chunkSize);
      res.status(206).send(buffer.subarray(start, end + 1));
    } else {
      res.setHeader('Content-Length', totalSize);
      res.status(200).send(buffer);
    }
  }

  @Patch('messages/:id')
  @ApiOperation({ summary: 'Actualizar mensaje' })
  @ApiResponse({ status: 200, description: 'Mensaje actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Mensaje no encontrado' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async updateMessage(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updateMessageDto: UpdateMessageDto,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.communicationsService.updateMessage(id, userId, updateMessageDto);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Eliminar mensaje' })
  @ApiResponse({ status: 204, description: 'Mensaje eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Mensaje no encontrado' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async deleteMessage(@Param('id') id: string, @Request() req: any) {
    console.log('=== DELETE CONTROLLER DEBUG ===');
    console.log('Request user:', req.user);
    console.log('User sub:', req.user?.sub);
    console.log('User ID:', req.user?.userId);
    console.log('Message ID to delete:', id);
    console.log('=== END DELETE CONTROLLER DEBUG ===');
    
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.communicationsService.deleteMessage(id, userId);
  }

  @Post('messages/mark-all-read')
  @ApiOperation({ summary: 'Marcar todos los mensajes como leídos' })
  @ApiResponse({ status: 200, description: 'Mensajes marcados como leídos' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async markAllMessagesAsRead(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.communicationsService.markAllMessagesAsRead(userId);
    return { message: 'Todos los mensajes han sido marcados como leídos' };
  }

  @Post('messages/:id/mark-unread')
  @ApiOperation({ summary: 'Marcar mensaje como no leído' })
  @ApiResponse({ status: 200, description: 'Mensaje marcado como no leído exitosamente' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async markMessageAsUnread(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.communicationsService.markMessageAsUnread(id, userId);
    return { message: 'Mensaje marcado como no leído' };
  }

  @Delete('messages/bulk/delete-all')
  @ApiOperation({ summary: 'Eliminar todos los mensajes del usuario' })
  @ApiResponse({ status: 200, description: 'Mensajes eliminados exitosamente' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async deleteAllMessages(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const count = await this.communicationsService.deleteAllMessages(userId);
    return { message: 'Todos los mensajes han sido eliminados', deletedCount: count };
  }

  // ==================== NOTIFICATIONS ====================

  @Post('notifications')
  @ApiOperation({ summary: 'Crear nueva notificación' })
  @ApiResponse({ status: 201, description: 'Notificación creada exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async createNotification(@Body() createNotificationDto: CreateNotificationDto) {
    return this.communicationsService.createNotification(createNotificationDto);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Obtener notificaciones del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de notificaciones obtenida exitosamente' })
  @ApiQuery({ name: 'type', required: false, description: 'Filtrar por tipo de notificación' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por estado' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async findUserNotifications(@Request() req: any, @Query() filters: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.communicationsService.findUserNotifications(userId, filters);
  }

  @Patch('notifications/:id')
  @ApiOperation({ summary: 'Actualizar notificación' })
  @ApiResponse({ status: 200, description: 'Notificación actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Notificación no encontrada' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async updateNotification(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.communicationsService.updateNotification(id, userId, updateNotificationDto);
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Obtener número de notificaciones no leídas' })
  @ApiResponse({ status: 200, description: 'Contador obtenido exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async getUnreadNotificationsCount(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const count = await this.communicationsService.getUnreadNotificationsCount(userId);
    return { count };
  }

  @Post('notifications/mark-all-read')
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  @ApiResponse({ status: 200, description: 'Notificaciones marcadas como leídas' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async markAllNotificationsAsRead(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.communicationsService.markAllNotificationsAsRead(userId);
    return { message: 'Todas las notificaciones han sido marcadas como leídas' };
  }

  @Delete('notifications/:id')
  @ApiOperation({ summary: 'Eliminar notificación permanentemente' })
  @ApiResponse({ status: 200, description: 'Notificación eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Notificación no encontrada' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async deleteNotification(@Param('id') id: string, @Request() req: any) {
    try {
      console.log('🗑️ DELETE notification attempt:', {
        notificationId: id,
        userId: req.user?.sub || req.user?.userId || req.user?.id,
        userObject: req.user
      });
      
      const userId = req.user?.sub || req.user?.userId || req.user?.id;
      await this.communicationsService.deleteNotification(id, userId);
      
      console.log('🗑️ DELETE notification success:', id);
      return { message: 'Notificación eliminada exitosamente' };
    } catch (error) {
      console.error('🗑️ DELETE notification error:', {
        notificationId: id,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  @Delete('notifications/bulk/delete-all')
  @ApiOperation({ summary: 'Eliminar todas las notificaciones del usuario' })
  @ApiResponse({ status: 200, description: 'Notificaciones eliminadas exitosamente' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async deleteAllNotifications(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const count = await this.communicationsService.deleteAllNotifications(userId);
    return { message: 'Todas las notificaciones han sido eliminadas', deletedCount: count };
  }

  // ==================== STATISTICS ====================

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de mensajería del usuario' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async getUserMessagingStats(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.communicationsService.getUserMessagingStats(userId);
  }

  // ==================== AVAILABLE RECIPIENTS ====================

  @Get('available-recipients')
  @ApiOperation({ summary: 'Obtener usuarios disponibles para enviar mensajes' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios disponibles según permisos' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async getAvailableRecipients(@Request() req: any, @Response() res: any) {
    console.log('🔥🔥🔥 AVAILABLE-RECIPIENTS CONTROLLER CALLED! 🔥🔥🔥');
    console.log('🔥 User in request:', req.user);
    console.log('🔥 Headers:', req.headers?.authorization ? 'Bearer token present' : 'No Authorization header');
    console.log('🔥 Route path:', req.route?.path);
    console.log('🔥 HTTP method:', req.method);
    let userId = req.user?.sub || req.user?.userId || req.user?.id;

    // TEMPORARY: Force testing with specific family user when admin calls
    const FAMILY_TEST_USER_ID = '7a741cf7-f0e9-4e48-88fb-2f9c6802fda4'; // adrimatus@gmail.com
    const isAdmin = req.user?.role === 'admin';

    if (isAdmin && req.headers['x-test-family-user'] === 'true') {
      console.log('🧪 CONTROLLER: Admin testing family user - switching userId');
      userId = FAMILY_TEST_USER_ID;
    }

    console.log('🔍 CONTROLLER: getAvailableRecipients called for user:', userId);
    const result = await this.communicationsService.getAvailableRecipients(userId);
    console.log('🔍 CONTROLLER: Returning', result.length, 'recipients');

    // Add custom header to verify this method is executing
    res.setHeader('X-Custom-Method', 'REAL_DATA_EXECUTED');
    res.setHeader('X-Timestamp', new Date().toISOString());
    res.setHeader('X-Test-Mode', isAdmin && req.headers['x-test-family-user'] === 'true' ? 'FAMILY_TEST' : 'NORMAL');

    return res.json(result);
  }

  @Get('available-groups')
  @ApiOperation({ summary: 'Obtener grupos disponibles para enviar mensajes' })
  @ApiResponse({ status: 200, description: 'Lista de grupos disponibles según permisos' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getAvailableGroups(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.communicationsService.getAvailableGroups(userId);
  }

  @Get('available-recipients-bulk')
  @ApiOperation({ summary: 'Obtener usuarios disponibles para mensajes bulk con filtros' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios disponibles con opciones de filtrado' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY)
  async getAvailableRecipientsForBulk(
    @Request() req: any,
    @Query('roles') roles?: string,
    @Query('classGroups') classGroups?: string,
    @Query('subjects') subjects?: string
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;

    const filters = {
      roles: roles ? roles.split(',') as UserRole[] : undefined,
      classGroups: classGroups ? classGroups.split(',') : undefined,
      subjects: subjects ? subjects.split(',') : undefined
    };

    return this.communicationsService.getAvailableRecipientsForBulk(userId, filters);
  }

  @Get('parents-by-class-groups')
  @ApiOperation({ summary: 'Obtener padres cuyos hijos están en los grupos de clase especificados' })
  @ApiResponse({ status: 200, description: 'Lista de padres únicos de los grupos seleccionados' })
  @ApiQuery({ name: 'classGroupIds', required: true, type: String, description: 'IDs de grupos separados por comas' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getParentsByClassGroups(
    @Query('classGroupIds') classGroupIds: string,
    @Request() req: any,
  ) {
    if (!classGroupIds) {
      throw new BadRequestException('Se requiere al menos un grupo de clase');
    }

    const classGroupIdsArray = classGroupIds.split(',').filter(id => id.trim());

    if (classGroupIdsArray.length === 0) {
      throw new BadRequestException('Se requiere al menos un grupo de clase válido');
    }

    // RGPD: un profesor solo puede consultar padres de SUS grupos
    for (const groupId of classGroupIdsArray) {
      await this.assertTeacherGroupAccess(req, groupId);
    }

    return this.communicationsService.getParentsByClassGroups(classGroupIdsArray);
  }

  // ==================== BULK OPERATIONS ====================

  @Post('messages/bulk')
  @ApiOperation({ summary: 'Enviar mensaje a múltiples destinatarios' })
  @ApiResponse({ status: 201, description: 'Mensajes enviados exitosamente a todos los destinatarios' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async sendBulkMessage(@Request() req: any, @Body() createMessageDto: CreateMessageDto) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;

    if (!createMessageDto.recipientIds || createMessageDto.recipientIds.length === 0) {
      throw new BadRequestException('Se requiere al menos un destinatario para mensajes bulk');
    }

    // RGPD: un profesor solo envía a destinatarios dentro de su conjunto accesible
    await this.assertTeacherRecipients(req, createMessageDto.recipientIds);

    if (createMessageDto.recipientIds.length === 1) {
      // Si solo hay un destinatario, usar el método normal
      const singleMessageDto = {
        ...createMessageDto,
        recipientId: createMessageDto.recipientIds[0],
        recipientIds: undefined
      };
      return this.communicationsService.createMessage(userId, singleMessageDto);
    }

    // Para múltiples destinatarios, usar la función de mensajes múltiples
    const result = await this.communicationsService.createMultipleMessages(userId, createMessageDto);
    return {
      success: true,
      message: `Mensaje enviado exitosamente a ${createMessageDto.recipientIds.length} destinatarios`,
      recipientCount: createMessageDto.recipientIds.length,
      firstMessageId: result.id
    };
  }

  @Post('messages/group/:groupId')
  @ApiOperation({ summary: 'Enviar mensaje a grupo de clase' })
  @ApiResponse({ status: 201, description: 'Mensaje grupal enviado exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async sendGroupMessage(
    @Request() req: any,
    @Param('groupId') groupId: string,
    @Body() createMessageDto: Omit<CreateMessageDto, 'targetGroupId'>,
  ) {
    // RGPD: un profesor solo envía a grupos donde es tutor o imparte asignatura
    await this.assertTeacherGroupAccess(req, groupId);
    const messageDto = { ...createMessageDto, targetGroupId: groupId };
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.communicationsService.createMessage(userId, messageDto);
  }

  @Post('messages/my-students')
  @ApiOperation({ summary: 'Enviar mensaje a todos los estudiantes de las clases del profesor' })
  @ApiResponse({ status: 201, description: 'Mensaje enviado exitosamente a todos los estudiantes de las clases' })
  @Roles(UserRole.TEACHER)
  async sendMessageToMyStudents(
    @Request() req: any,
    @Body() createMessageDto: Omit<CreateMessageDto, 'recipientIds' | 'targetGroupId'>,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.communicationsService.sendMessageToTeacherStudents(userId, createMessageDto);
  }

  @Get('my-students')
  @ApiOperation({ summary: 'Obtener todos los estudiantes de las clases del profesor' })
  @ApiResponse({ status: 200, description: 'Lista de estudiantes de las clases del profesor' })
  @Roles(UserRole.TEACHER)
  async getMyStudents(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.communicationsService.getTeacherStudents(userId);
  }

  @Post('notifications/bulk')
  @ApiOperation({ summary: 'Crear notificaciones masivas' })
  @ApiResponse({ status: 201, description: 'Notificaciones masivas creadas exitosamente' })
  @Roles(UserRole.ADMIN)
  async createBulkNotifications(@Body() data: { userIds: string[], notification: Omit<CreateNotificationDto, 'userId'> }) {
    const { userIds, notification } = data;
    const results = [];

    for (const userId of userIds) {
      try {
        const result = await this.communicationsService.createNotification({
          ...notification,
          userId,
        });
        results.push({ userId, success: true, notificationId: result.id });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }

    return {
      total: userIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  // TEMPORARY TESTING ENDPOINT - REMOVE AFTER FIXING FAMILY FILTERING
  @Get('test-family-filtering/:familyUserId')
  @ApiOperation({ summary: 'TEMP: Test family filtering directly' })
  @Roles(UserRole.ADMIN)
  async testFamilyFiltering(@Param('familyUserId') familyUserId: string) {
    console.log('🧪 TESTING: Direct call to family filtering for:', familyUserId);
    const result = await this.communicationsService.testFamilyFiltering(familyUserId);
    return {
      familyUserId,
      recipientCount: result.length,
      recipients: result
    };
  }
}