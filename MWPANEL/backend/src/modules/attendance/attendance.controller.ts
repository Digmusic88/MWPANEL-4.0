import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import {
  CreateAttendanceRecordDto,
  UpdateAttendanceRecordDto,
  CreateAttendanceRequestDto,
  ReviewAttendanceRequestDto,
  BulkMarkPresentDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TeacherAccessService } from '../../common/teacher-access/teacher-access.service';
import { FamilyAccessService } from '../../common/family-access/family-access.service';
import { UserRole } from '../users/entities/user.entity';
import { AttendanceRequestStatus } from './entities/attendance-request.entity';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly teacherAccess: TeacherAccessService,
    private readonly familyAccess: FamilyAccessService,
  ) {}

  /**
   * RGPD: un profesor solo accede a alumnos de sus grupos (tutoría ∪ asignatura);
   * una familia solo a los alumnos que tutela.
   */
  private async assertStudentAccess(req: any, studentId: string): Promise<void> {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (req.user?.role === UserRole.TEACHER) {
      if (!studentId || !(await this.teacherAccess.canTeacherAccessStudent(userId, studentId))) {
        throw new ForbiddenException('No tienes acceso a este alumno');
      }
    } else if (req.user?.role === UserRole.FAMILY) {
      if (!studentId || !(await this.familyAccess.canFamilyAccessStudent(userId, studentId))) {
        throw new ForbiddenException('No tienes acceso a este alumno');
      }
    }
  }

  /** RGPD: un profesor solo accede a grupos donde es tutor o imparte asignatura. */
  private async assertGroupAccess(req: any, classGroupId: string): Promise<void> {
    if (req.user?.role === UserRole.TEACHER) {
      const userId = req.user?.sub || req.user?.userId || req.user?.id;
      if (!classGroupId || !(await this.teacherAccess.canTeacherAccessClassGroup(userId, classGroupId))) {
        throw new ForbiddenException('No tienes acceso a este grupo');
      }
    }
  }

  // ==================== ATTENDANCE RECORDS ====================

  @Post('records')
  @ApiOperation({ summary: 'Crear registro de asistencia' })
  @ApiResponse({ status: 201, description: 'Registro creado exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async createRecord(@Request() req: any, @Body() createDto: CreateAttendanceRecordDto) {
    await this.assertStudentAccess(req, createDto.studentId);
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.attendanceService.createAttendanceRecord(createDto, userId);
  }

  @Patch('records/:id')
  @ApiOperation({ summary: 'Actualizar registro de asistencia' })
  @ApiResponse({ status: 200, description: 'Registro actualizado exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async updateRecord(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updateDto: UpdateAttendanceRecordDto,
  ) {
    await this.assertStudentAccess(req, await this.attendanceService.getRecordStudentId(id));
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.attendanceService.updateAttendanceRecord(id, updateDto, userId);
  }

  @Delete('records/:id')
  @ApiOperation({ summary: 'Eliminar registro de asistencia (dejar sin marcar)' })
  @ApiResponse({ status: 200, description: 'Registro eliminado exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  async deleteRecord(@Param('id') id: string, @Request() req: any) {
    await this.assertStudentAccess(req, await this.attendanceService.getRecordStudentId(id));
    await this.attendanceService.deleteAttendanceRecord(id);
    return { message: 'Registro de asistencia eliminado exitosamente' };
  }

  @Get('records/group/:classGroupId')
  @ApiOperation({ summary: 'Obtener asistencia por grupo y fecha' })
  @ApiResponse({ status: 200, description: 'Lista de registros de asistencia' })
  @ApiQuery({ name: 'date', required: true, description: 'Fecha (YYYY-MM-DD)' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getByGroup(
    @Param('classGroupId') classGroupId: string,
    @Query('date') date: string,
    @Request() req: any,
  ) {
    await this.assertGroupAccess(req, classGroupId);
    return this.attendanceService.getAttendanceByGroup(classGroupId, date);
  }

  @Get('records/student/:studentId')
  @ApiOperation({ summary: 'Obtener historial de asistencia de un estudiante' })
  @ApiResponse({ status: 200, description: 'Historial de asistencia' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'academicYearId', required: false })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  async getByStudent(
    @Request() req: any,
    @Param('studentId') studentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    await this.assertStudentAccess(req, studentId);
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const userRole = req.user?.role;
    return this.attendanceService.getAttendanceByStudent(studentId, startDate, endDate, userId, userRole, academicYearId);
  }

  @Post('records/bulk-present')
  @ApiOperation({ summary: 'Marcar presentes en masa (solo estudiantes sin registro)' })
  @ApiResponse({ status: 201, description: 'Registros creados exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  async bulkMarkPresent(@Request() req: any, @Body() bulkDto: BulkMarkPresentDto) {
    await this.assertGroupAccess(req, bulkDto.classGroupId);
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.attendanceService.bulkMarkPresent(bulkDto, userId);
  }

  // ==================== ATTENDANCE REQUESTS ====================

  @Post('requests')
  @ApiOperation({ summary: 'Crear solicitud de justificación' })
  @ApiResponse({ status: 201, description: 'Solicitud creada exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY)
  async createRequest(@Request() req: any, @Body() createDto: CreateAttendanceRequestDto) {
    await this.assertStudentAccess(req, createDto.studentId);
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.attendanceService.createAttendanceRequest(createDto, userId);
  }

  @Patch('requests/:id/review')
  @ApiOperation({ summary: 'Revisar solicitud de justificación' })
  @ApiResponse({ status: 200, description: 'Solicitud revisada exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async reviewRequest(
    @Param('id') id: string,
    @Request() req: any,
    @Body() reviewDto: ReviewAttendanceRequestDto,
  ) {
    await this.assertStudentAccess(req, await this.attendanceService.getRequestStudentId(id));
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.attendanceService.reviewAttendanceRequest(id, reviewDto, userId);
  }

  @Get('requests/student/:studentId')
  @ApiOperation({ summary: 'Obtener solicitudes de un estudiante' })
  @ApiResponse({ status: 200, description: 'Lista de solicitudes' })
  @ApiQuery({ name: 'status', required: false, enum: AttendanceRequestStatus })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  async getRequestsByStudent(
    @Request() req: any,
    @Param('studentId') studentId: string,
    @Query('status') status?: AttendanceRequestStatus,
  ) {
    await this.assertStudentAccess(req, studentId);
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const userRole = req.user?.role;
    return this.attendanceService.getRequestsByStudent(studentId, status, userId, userRole);
  }

  @Get('requests/group/:classGroupId/pending')
  @ApiOperation({ summary: 'Obtener solicitudes pendientes de un grupo' })
  @ApiResponse({ status: 200, description: 'Lista de solicitudes pendientes' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getPendingRequestsByGroup(@Param('classGroupId') classGroupId: string, @Request() req: any) {
    await this.assertGroupAccess(req, classGroupId);
    return this.attendanceService.getPendingRequestsByGroup(classGroupId);
  }

  @Get('requests/my-requests')
  @ApiOperation({ summary: 'Obtener mis solicitudes realizadas' })
  @ApiResponse({ status: 200, description: 'Lista de solicitudes del usuario' })
  @Roles(UserRole.FAMILY)
  async getMyRequests(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.attendanceService.getRequestsByUser(userId);
  }

  // ==================== FAMILY-SPECIFIC ENDPOINTS ====================

  @Get('family/my-children')
  @ApiOperation({ summary: 'Obtener lista de mis hijos (solo para familias)' })
  @ApiResponse({ status: 200, description: 'Lista de hijos de la familia' })
  @Roles(UserRole.FAMILY)
  async getMyChildren(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.attendanceService.getFamilyChildren(userId);
  }

  @Get('family/child/:studentId/attendance')
  @ApiOperation({ summary: 'Obtener historial de asistencia de mi hijo' })
  @ApiResponse({ status: 200, description: 'Historial de asistencia del hijo' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'academicYearId', required: false })
  @Roles(UserRole.FAMILY)
  async getMyChildAttendance(
    @Request() req: any,
    @Param('studentId') studentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.attendanceService.getAttendanceByStudent(studentId, startDate, endDate, userId, 'family', academicYearId);
  }

  @Get('family/child/:studentId/requests')
  @ApiOperation({ summary: 'Obtener solicitudes de mi hijo' })
  @ApiResponse({ status: 200, description: 'Lista de solicitudes del hijo' })
  @ApiQuery({ name: 'status', required: false, enum: AttendanceRequestStatus })
  @Roles(UserRole.FAMILY)
  async getMyChildRequests(
    @Request() req: any,
    @Param('studentId') studentId: string,
    @Query('status') status?: AttendanceRequestStatus,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.attendanceService.getRequestsByStudent(studentId, status, userId, 'family');
  }

  // ==================== STATISTICS ====================

  @Get('stats/student/:studentId')
  @ApiOperation({ summary: 'Obtener estadísticas de asistencia de un estudiante' })
  @ApiResponse({ status: 200, description: 'Estadísticas de asistencia del estudiante' })
  @ApiQuery({ name: 'days', required: false, description: 'Número de días a incluir (default: 30)' })
  @ApiQuery({ name: 'academicYearId', required: false })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  async getStudentStats(
    @Request() req: any,
    @Param('studentId') studentId: string,
    @Query('days') days?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    await this.assertStudentAccess(req, studentId);
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const userRole = req.user?.role;
    const daysNumber = days ? parseInt(days, 10) : 30;
    return this.attendanceService.getStudentAttendanceStats(studentId, daysNumber, userId, userRole, academicYearId);
  }

  @Get('stats/group/:classGroupId')
  @ApiOperation({ summary: 'Obtener estadísticas de asistencia del grupo' })
  @ApiResponse({ status: 200, description: 'Estadísticas de asistencia' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getGroupStats(
    @Param('classGroupId') classGroupId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    await this.assertGroupAccess(req, classGroupId);
    return this.attendanceService.getAttendanceStats(classGroupId, startDate, endDate);
  }

  // ==================== ADMIN ANALYTICS ====================

  @Get('admin/by-teacher/:teacherId')
  @ApiOperation({ summary: '[ADMIN] Obtener registros de asistencia por profesor' })
  @ApiResponse({ status: 200, description: 'Lista de registros creados por el profesor' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Fecha inicio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Fecha fin (YYYY-MM-DD)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite de registros (default: 100)' })
  @Roles(UserRole.ADMIN)
  async getRecordsByTeacher(
    @Param('teacherId') teacherId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNumber = limit ? parseInt(limit, 10) : 100;
    return this.attendanceService.getRecordsByTeacher(teacherId, startDate, endDate, limitNumber);
  }

  @Get('admin/teacher-stats')
  @ApiOperation({ summary: '[ADMIN] Estadísticas de asistencia por profesor' })
  @ApiResponse({ status: 200, description: 'Estadísticas agregadas de todos los profesores' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Fecha inicio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'Fecha fin (YYYY-MM-DD)' })
  @Roles(UserRole.ADMIN)
  async getTeacherStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.attendanceService.getTeacherStats(startDate, endDate);
  }

  @Get('admin/alerts')
  @ApiOperation({ summary: '[ADMIN] Obtener alertas del sistema de asistencia' })
  @ApiResponse({ status: 200, description: 'Alertas de profesores y alumnos con problemas' })
  @ApiQuery({ name: 'days', required: false, description: 'Días a analizar (default: 30)' })
  @Roles(UserRole.ADMIN)
  async getAttendanceAlerts(@Query('days') days?: string) {
    const daysNumber = days ? parseInt(days, 10) : 30;
    return this.attendanceService.getAttendanceAlerts(daysNumber);
  }

  @Get('admin/overview')
  @ApiOperation({ summary: '[ADMIN] Vista general del sistema de asistencia' })
  @ApiResponse({ status: 200, description: 'Métricas globales del sistema' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Fecha inicio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'Fecha fin (YYYY-MM-DD)' })
  @Roles(UserRole.ADMIN)
  async getAttendanceOverview(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.attendanceService.getAttendanceOverview(startDate, endDate);
  }
}