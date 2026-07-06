import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { GroupChatsService } from '../services/group-chats.service';
import {
  CreateGroupChatDto,
  UpdateGroupChatDto,
  ManageGroupMembersDto,
  SendGroupMessageDto,
  GroupChatSummaryDto,
  GroupChatDetailDto,
  GroupMessageDto,
} from '../dto/group-chat.dto';

@ApiTags('group-chats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('communications/groups')
export class GroupChatsController {
  constructor(private readonly groupChatsService: GroupChatsService) {}

  // ==================== CREAR GRUPO ====================

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo grupo de chat' })
  @ApiResponse({
    status: 201,
    description: 'Grupo creado exitosamente',
    type: GroupChatDetailDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'Sin permisos para crear grupos' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER) // Administradores y profesores pueden crear grupos
  async createGroup(
    @Request() req: any,
    @Body() createGroupDto: CreateGroupChatDto,
  ): Promise<GroupChatDetailDto> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.groupChatsService.createGroupChat(userId, createGroupDto);
  }

  // ==================== LISTAR GRUPOS ====================

  @Get()
  @ApiOperation({ summary: 'Obtener todos los grupos donde soy participante' })
  @ApiResponse({
    status: 200,
    description: 'Lista de grupos obtenida exitosamente',
    type: [GroupChatSummaryDto],
  })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  async getMyGroups(@Request() req: any): Promise<GroupChatSummaryDto[]> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.groupChatsService.getGroupsForUser(userId);
  }

  // ==================== USUARIOS DISPONIBLES ====================

  @Get('available-users')
  @ApiOperation({ summary: 'Obtener usuarios disponibles para agregar a grupos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios disponibles',
  })
  @Roles(UserRole.ADMIN, UserRole.TEACHER) // Administradores y profesores pueden ver usuarios disponibles
  async getAvailableUsers(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.groupChatsService.getAvailableUsersForGroup(userId);
  }

  // ==================== CONTEO NO LEÍDOS ====================

  @Get('unread-count')
  @ApiOperation({ summary: 'Obtener conteo total de mensajes no leídos en grupos' })
  @ApiResponse({
    status: 200,
    description: 'Conteo de mensajes no leídos por grupo',
  })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  async getUnreadCount(@Request() req: any): Promise<{ count: number; groups: { groupId: string; groupTitle: string; unreadCount: number }[] }> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.groupChatsService.getTotalUnreadCount(userId);
  }

  // ==================== DATOS RETROACTIVOS ====================
  // IMPORTANTE: Este endpoint debe estar ANTES de las rutas con :id para que no sea capturado como parámetro

  @Post('backfill-read-status')
  @ApiOperation({ summary: 'Generar datos retroactivos de lectura para mensajes históricos' })
  @ApiResponse({
    status: 200,
    description: 'Datos retroactivos generados exitosamente',
  })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  async backfillReadStatus(): Promise<{ message: string; processed: number }> {
    const count = await this.groupChatsService.backfillMessageReadStatuses();
    return {
      message: 'Datos retroactivos de lectura generados exitosamente',
      processed: count,
    };
  }

  // ==================== DETALLE DE GRUPO ====================

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({
    status: 200,
    description: 'Detalle del grupo',
    type: GroupChatDetailDto,
  })
  @ApiResponse({ status: 403, description: 'Sin acceso a este grupo' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  async getGroupDetail(
    @Request() req: any,
    @Param('id') groupId: string,
  ): Promise<GroupChatDetailDto> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.groupChatsService.getGroupDetail(userId, groupId);
  }

  // ==================== ACTUALIZAR GRUPO ====================

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar nombre o descripción del grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({
    status: 200,
    description: 'Grupo actualizado exitosamente',
    type: GroupChatDetailDto,
  })
  @ApiResponse({ status: 403, description: 'Sin permisos para modificar este grupo' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER) // Admin y profesores (creadores) pueden modificar grupos
  async updateGroup(
    @Request() req: any,
    @Param('id') groupId: string,
    @Body() updateGroupDto: UpdateGroupChatDto,
  ): Promise<GroupChatDetailDto> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.groupChatsService.updateGroup(userId, groupId, updateGroupDto);
  }

  // ==================== GESTIÓN DE MIEMBROS ====================

  @Post(':id/admins')
  @ApiOperation({ summary: 'Promover un miembro a administrador del grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({ status: 200, description: 'Miembro promovido a administrador' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async promoteToAdmin(
    @Request() req: any,
    @Param('id') groupId: string,
    @Body() body: { memberId: string },
  ): Promise<GroupChatDetailDto> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.groupChatsService.promoteToAdmin(userId, groupId, body.memberId);
  }

  @Delete(':id/admins/:memberId')
  @ApiOperation({ summary: 'Revocar administrador a un miembro del grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiParam({ name: 'memberId', description: 'ID del miembro a revocar' })
  @ApiResponse({ status: 200, description: 'Administrador revocado' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async demoteAdmin(
    @Request() req: any,
    @Param('id') groupId: string,
    @Param('memberId') memberId: string,
  ): Promise<GroupChatDetailDto> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.groupChatsService.demoteAdmin(userId, groupId, memberId);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Agregar miembros al grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({
    status: 200,
    description: 'Miembros agregados exitosamente',
    type: GroupChatDetailDto,
  })
  @ApiResponse({ status: 400, description: 'Usuarios no encontrados o ya son miembros' })
  @ApiResponse({ status: 403, description: 'Sin permisos para agregar miembros' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER) // Admin y profesores (creadores) pueden agregar miembros
  async addMembers(
    @Request() req: any,
    @Param('id') groupId: string,
    @Body() membersDto: ManageGroupMembersDto,
  ): Promise<GroupChatDetailDto> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.groupChatsService.addMembers(userId, groupId, membersDto);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Quitar un miembro del grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiParam({ name: 'userId', description: 'ID del usuario a quitar' })
  @ApiResponse({
    status: 200,
    description: 'Miembro quitado exitosamente',
    type: GroupChatDetailDto,
  })
  @ApiResponse({ status: 400, description: 'No se puede quitar al creador' })
  @ApiResponse({ status: 403, description: 'Sin permisos para quitar miembros' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER) // Admin y profesores (creadores) pueden quitar miembros
  async removeMember(
    @Request() req: any,
    @Param('id') groupId: string,
    @Param('userId') memberUserId: string,
  ): Promise<GroupChatDetailDto> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.groupChatsService.removeMember(userId, groupId, memberUserId);
  }

  // ==================== ABANDONAR GRUPO ====================

  @Post(':id/leave')
  @ApiOperation({ summary: 'Abandonar un grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({
    status: 200,
    description: 'Has abandonado el grupo exitosamente',
  })
  @ApiResponse({ status: 400, description: 'El creador no puede abandonar el grupo' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  async leaveGroup(
    @Request() req: any,
    @Param('id') groupId: string,
  ): Promise<{ message: string }> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.groupChatsService.leaveGroup(userId, groupId);
    return { message: 'Has abandonado el grupo exitosamente' };
  }

  // ==================== MENSAJES ====================

  @Post(':id/messages')
  @ApiOperation({ summary: 'Enviar mensaje al grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({
    status: 201,
    description: 'Mensaje enviado exitosamente',
    type: GroupMessageDto,
  })
  @ApiResponse({ status: 403, description: 'Sin acceso a este grupo' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  async sendMessage(
    @Request() req: any,
    @Param('id') groupId: string,
    @Body() messageDto: SendGroupMessageDto,
  ): Promise<GroupMessageDto> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.groupChatsService.sendGroupMessage(userId, groupId, messageDto);
  }

  @Post(':id/messages/with-attachments')
  @ApiOperation({ summary: 'Enviar mensaje al grupo con archivos adjuntos' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({
    status: 201,
    description: 'Mensaje con adjuntos enviado exitosamente',
    type: GroupMessageDto,
  })
  @ApiResponse({ status: 403, description: 'Sin acceso a este grupo' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: diskStorage({
        destination: './uploads/message-attachments',
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
          const ext = path.extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
      fileFilter: (req, file, cb) => {
        // Tipos de archivo permitidos
        const allowedMimes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/csv',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/ogg',
          'audio/webm',
          'audio/mp4',
          'audio/x-m4a',
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
          'video/webm',
          'application/zip',
          'application/x-rar-compressed',
          'application/x-7z-compressed',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
        }
      },
    }),
  )
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  async sendMessageWithAttachments(
    @Request() req: any,
    @Param('id') groupId: string,
    @Body() messageDto: SendGroupMessageDto,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<GroupMessageDto> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.groupChatsService.sendGroupMessageWithAttachments(
      userId,
      groupId,
      messageDto,
      files || [],
    );
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Obtener historial de mensajes del grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiQuery({ name: 'limit', required: false, description: 'Número de mensajes (default 50)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset para paginación (default 0)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de mensajes del grupo',
    type: [GroupMessageDto],
  })
  @ApiResponse({ status: 403, description: 'Sin acceso a este grupo' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  async getMessages(
    @Request() req: any,
    @Param('id') groupId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<GroupMessageDto[]> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const limitNum = limit ? parseInt(limit, 10) : 500;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.groupChatsService.getGroupMessages(userId, groupId, limitNum, offsetNum);
  }

  @Post('/messages/:messageId/read')
  @ApiOperation({ summary: 'Marcar un mensaje específico como leído' })
  @ApiParam({ name: 'messageId', description: 'ID del mensaje a marcar como leído' })
  @ApiResponse({ status: 200, description: 'Mensaje marcado como leído' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  async markMessageAsRead(
    @Request() req: any,
    @Param('messageId') messageId: string,
  ): Promise<{ message: string }> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.groupChatsService.markMessageAsRead(userId, messageId);
    return { message: 'Mensaje marcado como leído' };
  }

  // ==================== MARCAR COMO LEÍDO ====================

  @Post(':id/read')
  @ApiOperation({ summary: 'Marcar todos los mensajes del grupo como leídos' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({
    status: 200,
    description: 'Mensajes marcados como leídos',
  })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  async markAsRead(
    @Request() req: any,
    @Param('id') groupId: string,
  ): Promise<{ message: string }> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.groupChatsService.markGroupAsRead(userId, groupId);
    return { message: 'Mensajes marcados como leídos' };
  }

  // ==================== MARCAR COMO NO LEÍDO ====================

  @Post(':id/mark-unread')
  @ApiOperation({ summary: 'Marcar grupo como no leído' })
  @ApiParam({ name: 'id', description: 'ID del grupo de chat' })
  @ApiResponse({ status: 200, description: 'Grupo marcado como no leído' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  async markGroupAsUnread(
    @Request() req: any,
    @Param('id') groupId: string,
  ): Promise<{ message: string }> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.groupChatsService.markGroupAsUnread(userId, groupId);
    return { message: 'Grupo marcado como no leído' };
  }

  // ==================== ARCHIVAR/DESARCHIVAR ====================

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archivar un grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({
    status: 200,
    description: 'Grupo archivado exitosamente',
  })
  @ApiResponse({ status: 403, description: 'Sin permisos para archivar este grupo' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async archiveGroup(
    @Request() req: any,
    @Param('id') groupId: string,
  ): Promise<{ message: string }> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.groupChatsService.archiveGroup(userId, groupId);
    return { message: 'Grupo archivado exitosamente' };
  }

  @Post(':id/unarchive')
  @ApiOperation({ summary: 'Desarchivar un grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({
    status: 200,
    description: 'Grupo desarchivado exitosamente',
  })
  @ApiResponse({ status: 403, description: 'Sin permisos para desarchivar este grupo' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async unarchiveGroup(
    @Request() req: any,
    @Param('id') groupId: string,
  ): Promise<{ message: string }> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.groupChatsService.unarchiveGroup(userId, groupId);
    return { message: 'Grupo desarchivado exitosamente' };
  }

  // ==================== ELIMINAR GRUPO ====================

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un grupo (solo admin o creador)' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({
    status: 200,
    description: 'Grupo eliminado exitosamente',
  })
  @ApiResponse({ status: 403, description: 'Solo el admin o creador pueden eliminar el grupo' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async deleteGroup(
    @Request() req: any,
    @Param('id') groupId: string,
  ): Promise<{ message: string }> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.groupChatsService.deleteGroup(userId, groupId);
    return { message: 'Grupo eliminado exitosamente' };
  }

  // ==================== EDITAR Y ELIMINAR MENSAJES ====================

  @Patch(':id/messages/:messageId/edit')
  @ApiOperation({ summary: 'Editar un mensaje del grupo (solo remitente, máximo 24h)' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiParam({ name: 'messageId', description: 'ID del mensaje' })
  @ApiResponse({
    status: 200,
    description: 'Mensaje editado exitosamente',
    type: GroupMessageDto,
  })
  @ApiResponse({ status: 403, description: 'Solo puedes editar tus propios mensajes' })
  @ApiResponse({ status: 404, description: 'Mensaje no encontrado' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  async editMessage(
    @Request() req: any,
    @Param('id') groupId: string,
    @Param('messageId') messageId: string,
    @Body() body: { content: string },
  ): Promise<GroupMessageDto> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.groupChatsService.editGroupMessage(userId, groupId, messageId, body.content);
  }

  @Delete(':id/messages/:messageId')
  @ApiOperation({ summary: 'Eliminar un mensaje del grupo para todos' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiParam({ name: 'messageId', description: 'ID del mensaje' })
  @ApiResponse({
    status: 200,
    description: 'Mensaje eliminado exitosamente',
  })
  @ApiResponse({ status: 403, description: 'No tienes permiso para eliminar este mensaje' })
  @ApiResponse({ status: 404, description: 'Mensaje no encontrado' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  async deleteMessage(
    @Request() req: any,
    @Param('id') groupId: string,
    @Param('messageId') messageId: string,
  ): Promise<{ message: string }> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const userRole = req.user?.role;
    await this.groupChatsService.deleteGroupMessageForAll(userId, userRole, groupId, messageId);
    return { message: 'Mensaje eliminado exitosamente' };
  }
}
