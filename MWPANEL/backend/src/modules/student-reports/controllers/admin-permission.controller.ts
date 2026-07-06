/**
 * @archivo: admin-permission.controller.ts
 * @módulo: Student Reports - Controller Admin
 * @función: Endpoints para gestión de permisos por el Administrador
 * @roles: Solo ADMIN
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { PermissionService } from '../services/permission.service';
import {
  BulkAssignPermissionsDto,
  AssignPermissionsByGroupDto,
  AssignPermissionsByMultipleGroupsDto,
  BulkRevokePermissionsDto,
  UpdatePermissionDto,
  QueryPermissionsDto,
} from '../dto/permission.dto';

@ApiTags('Report Permissions - Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('report-permissions')
export class AdminPermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  /**
   * ASIGNACIÓN MASIVA DE PERMISOS
   * El admin selecciona un profesor y múltiples estudiantes
   */
  @Post('bulk-assign')
  @ApiOperation({
    summary: 'Asignar permisos masivamente',
    description: 'El admin habilita a un profesor para escribir sobre múltiples estudiantes',
  })
  @ApiResponse({ status: 201, description: 'Permisos asignados' })
  async bulkAssign(
    @CurrentUser() admin: any,
    @Body() dto: BulkAssignPermissionsDto,
  ) {
    const result = await this.permissionService.bulkAssignPermissions(admin.id, dto);
    return {
      success: true,
      message: `Se crearon ${result.created} permisos (${result.skipped} ya existían)`,
      data: result,
    };
  }

  /**
   * ASIGNACIÓN POR GRUPO DE CLASE
   * Más rápido: asigna todos los estudiantes de un grupo
   */
  @Post('assign-by-group')
  @ApiOperation({
    summary: 'Asignar permisos por grupo de clase',
    description: 'Asigna permisos para todos los estudiantes de un grupo de clase',
  })
  @ApiResponse({ status: 201, description: 'Permisos asignados por grupo' })
  async assignByGroup(
    @CurrentUser() admin: any,
    @Body() dto: AssignPermissionsByGroupDto,
  ) {
    const result = await this.permissionService.assignPermissionsByGroup(admin.id, dto);
    return {
      success: true,
      message: `Se crearon ${result.created} permisos para el grupo (${result.skipped} ya existían)`,
      data: result,
    };
  }

  /**
   * ASIGNACIÓN POR MÚLTIPLES GRUPOS DE CLASE
   * Permite seleccionar varios grupos a la vez
   */
  @Post('assign-by-multiple-groups')
  @ApiOperation({
    summary: 'Asignar permisos por múltiples grupos de clase',
    description: 'Asigna permisos para todos los estudiantes de varios grupos de clase a la vez',
  })
  @ApiResponse({ status: 201, description: 'Permisos asignados por múltiples grupos' })
  async assignByMultipleGroups(
    @CurrentUser() admin: any,
    @Body() dto: AssignPermissionsByMultipleGroupsDto,
  ) {
    const result = await this.permissionService.assignPermissionsByMultipleGroups(admin.id, dto);
    return {
      success: true,
      message: `Se crearon ${result.created} permisos para ${dto.classGroupIds.length} grupos (${result.skipped} ya existían)`,
      data: result,
    };
  }

  /**
   * REVOCAR PERMISOS MASIVAMENTE
   */
  @Post('bulk-revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revocar múltiples permisos' })
  async bulkRevoke(@Body() dto: BulkRevokePermissionsDto) {
    const result = await this.permissionService.bulkRevokePermissions(dto);
    return {
      success: true,
      message: `Se revocaron ${result.revoked} permisos`,
      data: result,
    };
  }

  /**
   * DESACTIVAR PERMISOS (soft delete)
   */
  @Post('deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar permisos (mantiene historial)' })
  async deactivate(@Body() body: { permissionIds: string[] }) {
    const result = await this.permissionService.deactivatePermissions(body.permissionIds);
    return {
      success: true,
      message: `Se desactivaron ${result.deactivated} permisos`,
      data: result,
    };
  }

  /**
   * LISTAR TODOS LOS PERMISOS
   */
  @Get()
  @ApiOperation({ summary: 'Listar todos los permisos con filtros' })
  async findAll(@Query() query: QueryPermissionsDto) {
    console.log('🔍 [AdminPermissionController] findAll called with query:', JSON.stringify(query));
    try {
      const permissions = await this.permissionService.findAll(query);
      console.log('✅ [AdminPermissionController] Found', permissions.length, 'permissions');
      return {
        success: true,
        data: permissions.map(p => this.transformPermission(p)),
        meta: { total: permissions.length },
      };
    } catch (error) {
      console.error('❌ [AdminPermissionController] Error:', error);
      throw error;
    }
  }

  /**
   * OBTENER ESTADÍSTICAS
   */
  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de permisos' })
  async getStats(@Query('academicYearId') academicYearId?: string) {
    const stats = await this.permissionService.getStats(academicYearId);
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * ACTUALIZAR UN PERMISO
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un permiso' })
  @ApiParam({ name: 'id', description: 'ID del permiso' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    const permission = await this.permissionService.updatePermission(id, dto);
    return {
      success: true,
      data: this.transformPermission(permission),
    };
  }

  /**
   * ELIMINAR UN PERMISO
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un permiso' })
  @ApiParam({ name: 'id', description: 'ID del permiso' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.permissionService.bulkRevokePermissions({ permissionIds: [id] });
  }

  // ===== HELPERS =====

  private transformPermission(permission: any) {
    return {
      id: permission.id,
      teacher: permission.teacher ? {
        id: permission.teacher.id,
        firstName: permission.teacher.user?.profile?.firstName || permission.teacher.user?.email,
        lastName: permission.teacher.user?.profile?.lastName || '',
        email: permission.teacher.user?.email,
        photoUrl: permission.teacher.user?.profile?.avatarUrl,
      } : null,
      student: permission.student ? {
        id: permission.student.id,
        enrollmentNumber: permission.student.enrollmentNumber,
        firstName: permission.student.user?.profile?.firstName || '',
        lastName: permission.student.user?.profile?.lastName || '',
        photoUrl: permission.student.user?.profile?.avatarUrl || permission.student.photoUrl,
        classGroup: permission.student.classGroup?.name,
      } : null,
      academicYear: permission.academicYear ? {
        id: permission.academicYear.id,
        name: permission.academicYear.name,
      } : null,
      grantedBy: permission.grantedBy ? {
        id: permission.grantedBy.id,
        firstName: permission.grantedBy.profile?.firstName || permission.grantedBy.email,
        lastName: permission.grantedBy.profile?.lastName || '',
      } : null,
      adminNote: permission.adminNote,
      isActive: permission.isActive,
      createdAt: permission.createdAt,
    };
  }
}
