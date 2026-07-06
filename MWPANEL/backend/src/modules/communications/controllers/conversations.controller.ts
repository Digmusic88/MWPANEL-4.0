import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { ConversationsService } from '../services/conversations.service';
import { CreateConversationDto, CreateConversationMessageDto } from '../dto/conversation.dto';
import { SaveConversationDraftDto, EditMessageDto, DeleteForAllDto } from '../dto/update-message.dto';

@ApiTags('communications/conversations')
@Controller('communications/conversations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva conversación' })
  @ApiResponse({ status: 201, description: 'Conversación creada exitosamente' })
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async createConversation(
    @Body() createConversationDto: CreateConversationDto,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.conversationsService.createConversation(userId, createConversationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener lista de conversaciones del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de conversaciones obtenida exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async getUserConversations(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.conversationsService.getUserConversations(userId);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Obtener mensajes de una conversación específica' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiResponse({ status: 200, description: 'Mensajes de la conversación obtenidos exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async getConversationMessages(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.conversationsService.getConversationMessages(
      userId,
      conversationId,
      limit ? parseInt(limit.toString()) : 50,
      offset ? parseInt(offset.toString()) : 0,
    );
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Enviar mensaje en una conversación' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiResponse({ status: 201, description: 'Mensaje enviado exitosamente' })
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async sendMessage(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body() createMessageDto: CreateConversationMessageDto,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.conversationsService.sendMessage(userId, conversationId, createMessageDto);
  }

  @Post(':id/messages/:messageId/read')
  @ApiOperation({ summary: 'Marcar mensaje como leído' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiParam({ name: 'messageId', description: 'ID del mensaje' })
  @ApiResponse({ status: 200, description: 'Mensaje marcado como leído' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async markMessageAsRead(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.conversationsService.markMessageAsRead(userId, conversationId, messageId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalles de una conversación específica' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiResponse({ status: 200, description: 'Detalles de la conversación obtenidos exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async getConversation(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.conversationsService.getConversationDetails(userId, conversationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una conversación' })
  @ApiParam({ name: 'id', description: 'ID de la conversación a eliminar' })
  @ApiResponse({ status: 200, description: 'Conversación eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada' })
  @ApiResponse({ status: 403, description: 'No tienes permiso para eliminar esta conversación' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async deleteConversation(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.conversationsService.deleteConversation(userId, conversationId);
    return { message: 'Conversación eliminada exitosamente' };
  }

  // ==================== BORRADORES EN CONVERSACIONES ====================

  @Post(':id/draft')
  @ApiOperation({ summary: 'Guardar o actualizar borrador en una conversación' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiBody({ type: SaveConversationDraftDto })
  @ApiResponse({ status: 201, description: 'Borrador guardado exitosamente' })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada' })
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async saveConversationDraft(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body() draftDto: SaveConversationDraftDto,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.conversationsService.saveConversationDraft(
      userId,
      conversationId,
      draftDto.content || '',
      draftDto.contentType || 'html',
    );
  }

  @Get(':id/draft')
  @ApiOperation({ summary: 'Obtener borrador de una conversación' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiResponse({ status: 200, description: 'Borrador obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async getConversationDraft(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.conversationsService.getConversationDraft(userId, conversationId);
  }

  @Post(':id/draft/send')
  @ApiOperation({ summary: 'Enviar borrador de conversación' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiResponse({ status: 200, description: 'Borrador enviado exitosamente' })
  @ApiResponse({ status: 404, description: 'No hay borrador para esta conversación' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async sendConversationDraft(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.conversationsService.sendConversationDraft(userId, conversationId);
  }

  @Delete(':id/draft')
  @ApiOperation({ summary: 'Eliminar borrador de una conversación' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiResponse({ status: 200, description: 'Borrador eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'No hay borrador para esta conversación' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async deleteConversationDraft(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.conversationsService.deleteConversationDraft(userId, conversationId);
    return { message: 'Borrador eliminado exitosamente' };
  }

  // ==================== EDICIÓN DE MENSAJES ====================

  @Patch(':id/messages/:messageId/edit')
  @ApiOperation({ summary: 'Editar un mensaje enviado' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiParam({ name: 'messageId', description: 'ID del mensaje a editar' })
  @ApiBody({ type: EditMessageDto })
  @ApiResponse({ status: 200, description: 'Mensaje editado exitosamente' })
  @ApiResponse({ status: 404, description: 'Mensaje no encontrado' })
  @ApiResponse({ status: 403, description: 'No tienes permiso para editar este mensaje' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async editMessage(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() editDto: EditMessageDto,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.conversationsService.editMessage(
      userId,
      messageId,
      editDto.content || '',
      editDto.subject,
    );
  }

  // ==================== ELIMINACIÓN PARA TODOS ====================

  @Delete(':id/messages/:messageId/for-all')
  @ApiOperation({ summary: 'Eliminar mensaje para todos los participantes' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiParam({ name: 'messageId', description: 'ID del mensaje a eliminar' })
  @ApiResponse({ status: 200, description: 'Mensaje eliminado para todos exitosamente' })
  @ApiResponse({ status: 404, description: 'Mensaje no encontrado' })
  @ApiResponse({ status: 403, description: 'Solo el remitente puede eliminar el mensaje para todos' })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async deleteMessageForAll(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.conversationsService.deleteMessageForAll(userId, messageId);
    return { message: 'Mensaje eliminado para todos exitosamente' };
  }
}