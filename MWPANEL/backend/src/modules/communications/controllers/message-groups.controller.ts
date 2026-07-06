import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MessageGroupsService } from '../services/message-groups.service';
import { CreateMessageGroupDto } from '../dto/create-message-group.dto';
import { UpdateMessageGroupDto } from '../dto/update-message-group.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

@ApiTags('message-groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('communications/message-groups') // Changed from 'groups' to avoid conflict with GroupChatsController
export class MessageGroupsController {
  constructor(private readonly messageGroupsService: MessageGroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo grupo de mensajes' })
  @ApiResponse({ status: 201, description: 'Grupo creado exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async create(@Request() req: any, @Body() createGroupDto: CreateMessageGroupDto) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.messageGroupsService.create(userId, createGroupDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener grupos del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de grupos obtenida exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async findAll(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.messageGroupsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener grupo específico' })
  @ApiResponse({ status: 200, description: 'Grupo obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.messageGroupsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar grupo' })
  @ApiResponse({ status: 200, description: 'Grupo actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async update(
    @Param('id') id: string,
    @Body() updateGroupDto: UpdateMessageGroupDto,
    @Request() req: any
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.messageGroupsService.update(id, updateGroupDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar grupo' })
  @ApiResponse({ status: 200, description: 'Grupo eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.messageGroupsService.remove(id, userId);
    return { message: 'Grupo eliminado exitosamente' };
  }

  // ==================== GESTIÓN DE MIEMBROS ====================

  @Post(':id/members')
  @ApiOperation({ summary: 'Añadir miembros al grupo' })
  @ApiResponse({ status: 200, description: 'Miembros añadidos exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async addMembers(
    @Param('id') id: string,
    @Body() body: { userIds: string[] },
    @Request() req: any
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.messageGroupsService.addMembers(id, body.userIds, userId);
    return { message: 'Miembros añadidos exitosamente' };
  }

  @Delete(':id/members')
  @ApiOperation({ summary: 'Eliminar miembros del grupo' })
  @ApiResponse({ status: 200, description: 'Miembros eliminados exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async removeMembers(
    @Param('id') id: string,
    @Body() body: { userIds: string[] },
    @Request() req: any
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.messageGroupsService.removeMembers(id, body.userIds, userId);
    return { message: 'Miembros eliminados exitosamente' };
  }

  @Post(':id/members/sync')
  @ApiOperation({ summary: 'Sincronizar miembros del grupo' })
  @ApiResponse({ status: 200, description: 'Miembros sincronizados exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async syncMembers(
    @Param('id') id: string,
    @Body() body: { userIds: string[] },
    @Request() req: any
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.messageGroupsService.syncMembers(id, body.userIds, userId);
    return { message: 'Miembros sincronizados exitosamente' };
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Obtener miembros del grupo' })
  @ApiResponse({ status: 200, description: 'Lista de miembros obtenida exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async getGroupMembers(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.messageGroupsService.getGroupMembers(id, userId);
  }

  // ==================== GRUPOS AUTOMÁTICOS ====================

  @Post('teacher-class/:classGroupId')
  @ApiOperation({ summary: 'Crear grupo automático para clase del profesor' })
  @ApiResponse({ status: 201, description: 'Grupo de clase creado exitosamente' })
  @Roles(UserRole.TEACHER)
  async createTeacherClassGroup(
    @Param('classGroupId') classGroupId: string,
    @Request() req: any
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.messageGroupsService.createTeacherClassGroup(userId, classGroupId);
  }

  @Post('teacher-subject/:subjectAssignmentId')
  @ApiOperation({ summary: 'Crear grupo automático para materia del profesor' })
  @ApiResponse({ status: 201, description: 'Grupo de materia creado exitosamente' })
  @Roles(UserRole.TEACHER)
  async createTeacherSubjectGroup(
    @Param('subjectAssignmentId') subjectAssignmentId: string,
    @Request() req: any
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.messageGroupsService.createTeacherSubjectGroup(userId, subjectAssignmentId);
  }
}