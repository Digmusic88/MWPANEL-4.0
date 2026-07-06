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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { AssessActivityDto, BulkAssessActivityDto, AssessmentResponseDto } from './dto/assess-activity.dto';
import { ActivityStatisticsDto, TeacherActivitySummaryDto } from './dto/activity-statistics.dto';
import { SubjectAssignmentWithStudentsDto } from './dto/subject-assignment-with-students.dto';
import { CreateFromTemplateDto } from './dto/activity-template.dto';
import { DuplicateActivityDto } from './dto/duplicate-activity.dto';
import { SubjectActivitySummaryDto } from './dto/subject-activity-summary.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../users/entities/user.entity';
import { Activity } from './entities/activity.entity';
import { ActivityAssessment } from './entities/activity-assessment.entity';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  // ==================== CRUD ACTIVIDADES ====================

  @Post()
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear nueva actividad diaria' })
  @ApiResponse({ status: 201, description: 'Actividad creada exitosamente', type: Activity })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'Sin permisos para acceder al grupo' })
  async create(
    @Body() createActivityDto: CreateActivityDto,
    @Request() req: any,
  ): Promise<Activity> {
    const userId = req.user.sub;
    return this.activitiesService.createByUserId(createActivityDto, userId);
  }

  @Post(':id/duplicate')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Duplicar actividad existente' })
  @ApiResponse({ status: 201, description: 'Actividad duplicada exitosamente', type: Activity })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'Sin permisos para duplicar esta actividad' })
  @ApiResponse({ status: 404, description: 'Actividad original no encontrada' })
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() duplicateActivityDto: DuplicateActivityDto,
    @Request() req: any,
  ): Promise<Activity> {
    const userId = req.user.sub;
    return this.activitiesService.duplicateByUserId(id, duplicateActivityDto, userId);
  }

  @Get()
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener actividades del profesor' })
  @ApiQuery({ name: 'classGroupId', required: false, description: 'ID del grupo de clase' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Fecha de inicio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Fecha de fin (YYYY-MM-DD)' })
  @ApiQuery({ name: 'academicYearId', required: false, description: 'ID del año académico' })
  @ApiResponse({ status: 200, description: 'Lista de actividades', type: [Activity] })
  async findAll(
    @Request() req: any,
    @Query('classGroupId') classGroupId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('academicYearId') academicYearId?: string,
  ): Promise<Activity[]> {
    const userId = req.user.sub;
    return this.activitiesService.findAllByUserId(userId, classGroupId, startDate, endDate, academicYearId);
  }

  @Get('summary')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener resumen de actividades del profesor' })
  @ApiResponse({ status: 200, description: 'Resumen de actividades', type: TeacherActivitySummaryDto })
  async getTeacherSummary(@Request() req: any): Promise<TeacherActivitySummaryDto> {
    const userId = req.user.sub;
    return this.activitiesService.getTeacherSummaryByUserId(userId);
  }

  @Get(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener actividad por ID' })
  @ApiResponse({ status: 200, description: 'Actividad encontrada', type: Activity })
  @ApiResponse({ status: 404, description: 'Actividad no encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Activity> {
    return this.activitiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Actualizar actividad' })
  @ApiResponse({ status: 200, description: 'Actividad actualizada', type: Activity })
  @ApiResponse({ status: 403, description: 'Sin permisos para editar esta actividad' })
  @ApiResponse({ status: 404, description: 'Actividad no encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateActivityDto: UpdateActivityDto,
    @Request() req: any,
  ): Promise<Activity> {
    const userId = req.user.sub;
    return this.activitiesService.updateByUserId(id, updateActivityDto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Eliminar actividad (soft delete)' })
  @ApiResponse({ status: 200, description: 'Actividad eliminada exitosamente' })
  @ApiResponse({ status: 403, description: 'Sin permisos para eliminar esta actividad' })
  @ApiResponse({ status: 404, description: 'Actividad no encontrada' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const userId = req.user.sub;
    await this.activitiesService.removeByUserId(id, userId);
    return { message: 'Actividad eliminada exitosamente' };
  }

  // ==================== VALORACIONES ====================

  @Post(':activityId/assess/:studentId')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Valorar actividad de un estudiante' })
  @ApiResponse({ status: 200, description: 'Valoración registrada', type: AssessmentResponseDto })
  @ApiResponse({ status: 400, description: 'Valor de valoración inválido' })
  @ApiResponse({ status: 403, description: 'Sin permisos para valorar esta actividad' })
  @ApiResponse({ status: 404, description: 'Actividad o estudiante no encontrado' })
  async assessStudent(
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() assessDto: AssessActivityDto,
    @Request() req: any,
  ): Promise<ActivityAssessment> {
    const userId = req.user.sub;
    return this.activitiesService.assessStudentByUserId(activityId, studentId, assessDto, userId);
  }

  @Post(':activityId/bulk-assess')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Valoración masiva de actividad' })
  @ApiResponse({ status: 200, description: 'Valoraciones masivas registradas', type: [AssessmentResponseDto] })
  @ApiResponse({ status: 400, description: 'Valor de valoración inválido' })
  @ApiResponse({ status: 403, description: 'Sin permisos para valorar esta actividad' })
  @ApiResponse({ status: 404, description: 'Actividad no encontrada' })
  async bulkAssess(
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() bulkAssessDto: BulkAssessActivityDto,
    @Request() req: any,
  ): Promise<ActivityAssessment[]> {
    const userId = req.user.sub;
    return this.activitiesService.bulkAssessByUserId(activityId, bulkAssessDto, userId);
  }

  // ==================== ESTADÍSTICAS ====================

  @Get(':id/statistics')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener estadísticas de una actividad' })
  @ApiResponse({ status: 200, description: 'Estadísticas de la actividad', type: ActivityStatisticsDto })
  @ApiResponse({ status: 403, description: 'Sin permisos para ver estas estadísticas' })
  @ApiResponse({ status: 404, description: 'Actividad no encontrada' })
  async getActivityStatistics(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ActivityStatisticsDto> {
    const userId = req.user.sub;
    return this.activitiesService.getActivityStatisticsByUserId(id, userId);
  }

  // ==================== ENDPOINTS POR ASIGNATURAS ====================

  @Get('teacher/subject-assignments')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener asignaciones de asignaturas del profesor' })
  @ApiResponse({ status: 200, description: 'Lista de asignaciones con estudiantes', type: [SubjectAssignmentWithStudentsDto] })
  async getTeacherSubjectAssignments(@Request() req: any): Promise<SubjectAssignmentWithStudentsDto[]> {
    const userId = req.user.sub;
    console.log('[DEBUG] ActivitiesController subject-assignments - userId:', userId, 'userRole:', req.user.role);
    console.log('[DEBUG] ActivitiesController subject-assignments - full user object:', JSON.stringify(req.user, null, 2));
    return this.activitiesService.getTeacherSubjectAssignmentsByUserId(userId);
  }

  @Get('subject/:subjectAssignmentId')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener actividades por asignación de asignatura' })
  @ApiQuery({ name: 'includeArchived', required: false, description: 'Incluir actividades archivadas' })
  @ApiResponse({ status: 200, description: 'Lista de actividades de la asignatura', type: [Activity] })
  async findActivitiesBySubjectAssignment(
    @Param('subjectAssignmentId', ParseUUIDPipe) subjectAssignmentId: string,
    @Request() req: any,
    @Query('includeArchived') includeArchived?: boolean,
  ): Promise<Activity[]> {
    const userId = req.user.sub;
    return this.activitiesService.findActivitiesBySubjectAssignmentUserId(subjectAssignmentId, userId, includeArchived === true);
  }

  @Get('subject/:subjectAssignmentId/summary')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Resumen de actividades por asignatura' })
  @ApiResponse({ status: 200, description: 'Resumen de la asignatura', type: SubjectActivitySummaryDto })
  async getSubjectActivitySummary(
    @Param('subjectAssignmentId', ParseUUIDPipe) subjectAssignmentId: string,
    @Request() req: any,
  ): Promise<SubjectActivitySummaryDto> {
    const userId = req.user.sub;
    return this.activitiesService.getSubjectActivitySummaryByUserId(subjectAssignmentId, userId);
  }

  @Get('templates')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener plantillas de actividades del profesor' })
  @ApiResponse({ status: 200, description: 'Lista de plantillas', type: [Activity] })
  async getTeacherTemplates(@Request() req: any): Promise<Activity[]> {
    const userId = req.user.sub;
    return this.activitiesService.getTeacherTemplatesByUserId(userId);
  }

  @Post('create-from-template')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear actividad desde plantilla' })
  @ApiResponse({ status: 201, description: 'Actividad creada desde plantilla', type: Activity })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async createFromTemplate(
    @Body() createFromTemplateDto: CreateFromTemplateDto,
    @Request() req: any,
  ): Promise<Activity> {
    const userId = req.user.sub;
    return this.activitiesService.createFromTemplateByUserId(createFromTemplateDto, userId);
  }

  @Patch(':id/archive')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Archivar/desarchivar actividad' })
  @ApiResponse({ status: 200, description: 'Estado actualizado', type: Activity })
  async toggleArchive(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<Activity> {
    const userId = req.user.sub;
    return this.activitiesService.toggleArchiveByUserId(id, userId);
  }

  // ==================== ENDPOINTS PARA FAMILIAS ====================

  @Get('family/activities')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener actividades valoradas para la familia' })
  @ApiQuery({ name: 'studentId', required: false, description: 'ID del estudiante específico' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite de resultados', type: Number })
  @ApiQuery({ name: 'academicYearId', required: false, description: 'ID del año académico (por defecto, el actual)' })
  @ApiResponse({ status: 200, description: 'Lista de actividades valoradas', type: [AssessmentResponseDto] })
  async getFamilyActivities(
    @Request() req: any,
    @Query('studentId') studentId?: string,
    @Query('limit') limit?: number,
    @Query('academicYearId') academicYearId?: string,
  ): Promise<ActivityAssessment[]> {
    const familyUserId = req.user.id;
    return this.activitiesService.getFamilyActivities(familyUserId, studentId, limit || 10, academicYearId);
  }

  @Get('family/rubric-notifications')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener notificaciones de actividades con rúbrica para la familia' })
  @ApiQuery({ name: 'studentId', required: false, description: 'ID del estudiante específico' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite de resultados', type: Number })
  @ApiResponse({ status: 200, description: 'Lista de notificaciones de rúbricas', type: [AssessmentResponseDto] })
  async getFamilyRubricNotifications(
    @Request() req: any,
    @Query('studentId') studentId?: string,
    @Query('limit') limit?: number,
  ): Promise<ActivityAssessment[]> {
    const familyUserId = req.user.id;
    return this.activitiesService.getFamilyRubricNotifications(familyUserId, studentId, limit || 20);
  }

  // ==================== ACTIVIDAD RECIENTE ====================

  @Get('recent-activity')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener actividad reciente del sistema para administradores' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite de resultados', type: Number })
  @ApiResponse({ status: 200, description: 'Lista de actividad reciente del sistema' })
  async getRecentActivity(
    @Query('limit') limit?: number,
  ): Promise<any[]> {
    return this.activitiesService.getRecentSystemActivity(limit || 10);
  }

  // ENDPOINTS VULNERABLES ELIMINADOS POR SEGURIDAD

}