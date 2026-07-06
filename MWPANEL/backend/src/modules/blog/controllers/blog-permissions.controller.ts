import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { BlogPermissionsService } from '../services/blog-permissions.service';
import {
  CreateBlogPermissionDto,
  UpdateBlogPermissionsDto,
  BlogPermissionResponseDto,
  TeacherPermissionsResponseDto,
} from '../dto/blog-permission.dto';

@ApiTags('Blog Permissions')
@ApiBearerAuth()
@Controller('blog/permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BlogPermissionsController {
  constructor(private readonly permissionsService: BlogPermissionsService) {}

  /**
   * Obtener todos los permisos de publicación (solo admin)
   */
  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener todos los permisos de publicación' })
  @ApiResponse({ status: 200, type: [BlogPermissionResponseDto] })
  async findAll(): Promise<BlogPermissionResponseDto[]> {
    return this.permissionsService.findAll();
  }

  /**
   * Obtener todos los profesores con sus permisos (solo admin)
   */
  @Get('teachers')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener todos los profesores con sus permisos de publicación' })
  @ApiResponse({ status: 200, type: [TeacherPermissionsResponseDto] })
  async getAllTeachersWithPermissions(): Promise<TeacherPermissionsResponseDto[]> {
    return this.permissionsService.getAllTeachersWithPermissions();
  }

  /**
   * Obtener permisos de un profesor específico
   */
  @Get('teacher/:teacherId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener permisos de un profesor específico' })
  @ApiResponse({ status: 200 })
  async getTeacherPermissions(
    @Param('teacherId') teacherId: string,
    @Request() req: any,
  ) {
    // Los profesores solo pueden ver sus propios permisos
    if (req.user.role === UserRole.TEACHER && req.user.sub !== teacherId) {
      return { teacher: null, allowedGroups: [] };
    }

    return this.permissionsService.getTeacherPermissions(teacherId);
  }

  /**
   * Obtener los grupos permitidos para el profesor actual
   */
  @Get('my-groups')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener grupos donde el profesor actual puede publicar' })
  @ApiResponse({ status: 200 })
  async getMyAllowedGroups(@Request() req: any) {
    const allowedGroups = await this.permissionsService.getTeacherAllowedGroups(req.user.sub);
    return { allowedGroups };
  }

  /**
   * Crear permisos para un profesor (solo admin)
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear permisos de publicación para un profesor' })
  @ApiResponse({ status: 201, type: [BlogPermissionResponseDto] })
  async createPermissions(
    @Body() dto: CreateBlogPermissionDto,
    @Request() req: any,
  ): Promise<BlogPermissionResponseDto[]> {
    return this.permissionsService.createPermissions(
      dto.teacherId,
      dto.classGroupIds,
      req.user.sub,
    );
  }

  /**
   * Actualizar permisos de un profesor (reemplaza todos los existentes)
   */
  @Put('teacher/:teacherId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar permisos de un profesor (reemplaza todos)' })
  @ApiResponse({ status: 200, type: [BlogPermissionResponseDto] })
  async setTeacherPermissions(
    @Param('teacherId') teacherId: string,
    @Body() dto: UpdateBlogPermissionsDto,
    @Request() req: any,
  ): Promise<BlogPermissionResponseDto[]> {
    return this.permissionsService.setTeacherPermissions(
      teacherId,
      dto.classGroupIds,
      req.user.sub,
    );
  }

  /**
   * Eliminar un permiso específico (solo admin)
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un permiso específico' })
  @ApiResponse({ status: 204, description: 'Permiso eliminado' })
  async deletePermission(@Param('id') id: string): Promise<void> {
    await this.permissionsService.deletePermission(id);
  }

  /**
   * Eliminar todos los permisos de un profesor (solo admin)
   */
  @Delete('teacher/:teacherId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar todos los permisos de un profesor' })
  @ApiResponse({ status: 204, description: 'Permisos eliminados' })
  async deleteAllTeacherPermissions(
    @Param('teacherId') teacherId: string,
  ): Promise<void> {
    await this.permissionsService.deleteAllTeacherPermissions(teacherId);
  }

  /**
   * Verificar si el profesor actual puede publicar en un grupo
   */
  @Get('check/:classGroupId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Verificar si se puede publicar en un grupo específico' })
  @ApiResponse({ status: 200 })
  async checkPermission(
    @Param('classGroupId') classGroupId: string,
    @Request() req: any,
  ) {
    // Admin siempre puede publicar
    if (req.user.role === UserRole.ADMIN) {
      return { canPublish: true };
    }

    const canPublish = await this.permissionsService.canTeacherPublishToGroup(
      req.user.sub,
      classGroupId,
    );

    return { canPublish };
  }
}
