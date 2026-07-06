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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { CreateSubjectAssignmentDto } from './dto/create-subject-assignment.dto';
import { CreateMultipleAssignmentDto } from './dto/create-multiple-assignment.dto';
import { UpdateSubjectAssignmentDto } from './dto/update-subject-assignment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('subjects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  // ==================== SUBJECTS ====================

  @Get()
  @ApiOperation({ summary: 'Obtener todas las asignaturas' })
  @ApiResponse({ status: 200, description: 'Lista de asignaturas obtenida exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  findAllSubjects() {
    return this.subjectsService.findAllSubjects();
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva asignatura' })
  @ApiResponse({ status: 201, description: 'Asignatura creada exitosamente' })
  @Roles(UserRole.ADMIN)
  createSubject(@Body() createSubjectDto: CreateSubjectDto) {
    console.log('🔍 [SubjectsController] Received data for createSubject:', JSON.stringify(createSubjectDto, null, 2));
    console.log('🔍 [SubjectsController] Data types:', {
      name: typeof createSubjectDto.name,
      code: typeof createSubjectDto.code,
      weeklyHours: typeof createSubjectDto.weeklyHours,
      courseId: typeof createSubjectDto.courseId,
      description: typeof createSubjectDto.description
    });
    return this.subjectsService.createSubject(createSubjectDto);
  }

  // ==================== FLUJO PROFESOR (cuelga del año académico activo) ====================

  @Post('teacher/subject')
  @ApiOperation({ summary: 'El profesor crea una asignatura (catálogo) él mismo' })
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  createSubjectAsTeacher(@Body() createSubjectDto: CreateSubjectDto, @Request() req) {
    return this.subjectsService.createSubjectAsTeacher(createSubjectDto, req.user.id);
  }

  @Post('teacher/assignment')
  @ApiOperation({ summary: 'El profesor se asigna a sí mismo una asignatura+grupo en el año académico activo' })
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  createAssignmentAsTeacher(
    @Body() body: { subjectId: string; classGroupId?: string; classGroupIds?: string[]; weeklyHours?: number; notes?: string },
    @Request() req,
  ) {
    return this.subjectsService.createAssignmentAsTeacher(req.user.id, body);
  }

  @Post('teacher/quick-setup')
  @ApiOperation({ summary: 'Flujo unificado: el profesor crea/elige asignatura y obtiene la asignación lista para calificar (año activo)' })
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  quickSetupForTeacher(
    @Body() body: { subjectId?: string; newSubject?: CreateSubjectDto; classGroupId?: string; classGroupIds?: string[]; weeklyHours?: number },
    @Request() req,
  ) {
    return this.subjectsService.quickSetupForTeacher(req.user.id, body);
  }

  @Get('my-assignments')
  @ApiOperation({ summary: 'Obtener asignaciones del profesor logueado' })
  @ApiResponse({ status: 200, description: 'Asignaciones del profesor obtenidas exitosamente' })
  @Roles(UserRole.TEACHER)
  getMyAssignments(@Request() req) {
    // findAssignmentsByTeacher busca por id de PROFESOR (teacher.id), no por id de usuario.
    // El JWT enriquece req.user.teacherId; usar sub (id de usuario) devolvía siempre [].
    return this.subjectsService.findAssignmentsByTeacher(req.user.teacherId);
  }

  @Get('my-students')
  @ApiOperation({ summary: 'Obtener TODOS los estudiantes únicos de TODAS las asignaturas del profesor logueado' })
  @ApiResponse({ status: 200, description: 'Lista completa de estudiantes obtenida exitosamente' })
  @Roles(UserRole.TEACHER)
  getMyStudents(@Request() req) {
    console.log('🎯 [CONTROLLER] getMyStudents called for teacher:', req.user.email);
    // req.user.teacherId viene del JWT Strategy que enriquece el user con teacherId
    return this.subjectsService.getAllStudentsByTeacher(req.user.teacherId);
  }

  @Get('by-course/:courseId')
  @ApiOperation({ summary: 'Obtener asignaturas por curso' })
  @ApiResponse({ status: 200, description: 'Asignaturas del curso obtenidas exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findSubjectsByCourse(@Param('courseId') courseId: string) {
    return this.subjectsService.findSubjectsByCourse(courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener asignatura por ID' })
  @ApiResponse({ status: 200, description: 'Asignatura obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Asignatura no encontrada' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findOneSubject(@Param('id') id: string) {
    return this.subjectsService.findOneSubject(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar asignatura' })
  @ApiResponse({ status: 200, description: 'Asignatura actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Asignatura no encontrada' })
  @Roles(UserRole.ADMIN)
  updateSubject(@Param('id') id: string, @Body() updateSubjectDto: UpdateSubjectDto) {
    return this.subjectsService.updateSubject(id, updateSubjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar asignatura' })
  @ApiResponse({ status: 200, description: 'Asignatura eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Asignatura no encontrada' })
  @Roles(UserRole.ADMIN)
  removeSubject(
    @Param('id') id: string,
    @Query('deleteFromDrive') deleteFromDrive?: string
  ) {
    const shouldDeleteFromDrive = deleteFromDrive === 'true';
    return this.subjectsService.removeSubject(id, shouldDeleteFromDrive);
  }

  @Get(':id/folder-contents')
  @ApiOperation({ summary: 'Verificar contenido de carpetas en Google Drive para una asignatura' })
  @ApiResponse({ status: 200, description: 'Información de carpetas obtenida exitosamente' })
  @Roles(UserRole.ADMIN)
  checkSubjectFolderContents(@Param('id') id: string) {
    return this.subjectsService.checkSubjectFolderContents(id);
  }

  // ==================== SUBJECT ASSIGNMENTS ====================

  @Get('assignments/all')
  @ApiOperation({ summary: 'Obtener todas las asignaciones de asignaturas' })
  @ApiResponse({ status: 200, description: 'Lista de asignaciones obtenida exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findAllAssignments() {
    return this.subjectsService.findAllAssignments();
  }

  @Post('assignments')
  @ApiOperation({ summary: 'Crear nueva asignación de asignatura' })
  @ApiResponse({ status: 201, description: 'Asignación creada exitosamente' })
  @Roles(UserRole.ADMIN)
  createAssignment(@Body() createAssignmentDto: CreateSubjectAssignmentDto) {
    return this.subjectsService.createAssignment(createAssignmentDto);
  }

  @Post('assignments/multiple')
  @ApiOperation({ summary: 'Crear múltiples asignaciones con selección específica de estudiantes' })
  @ApiResponse({ status: 201, description: 'Asignaciones múltiples creadas exitosamente' })
  @Roles(UserRole.ADMIN)
  createMultipleAssignments(@Body() createMultipleAssignmentDto: CreateMultipleAssignmentDto) {
    return this.subjectsService.createMultipleAssignments(createMultipleAssignmentDto);
  }

  @Get('assignments/teacher/:teacherId')
  @ApiOperation({ summary: 'Obtener asignaciones por profesor' })
  @ApiResponse({ status: 200, description: 'Asignaciones del profesor obtenidas exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findAssignmentsByTeacher(@Param('teacherId') teacherId: string) {
    return this.subjectsService.findAssignmentsByTeacher(teacherId);
  }

  @Get('assignments/class-group/:classGroupId')
  @ApiOperation({ summary: 'Obtener asignaciones por grupo de clase' })
  @ApiResponse({ status: 200, description: 'Asignaciones del grupo obtenidas exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findAssignmentsByClassGroup(@Param('classGroupId') classGroupId: string) {
    return this.subjectsService.findAssignmentsByClassGroup(classGroupId);
  }

  @Get('assignments/academic-year/:academicYearId')
  @ApiOperation({ summary: 'Obtener asignaciones por año académico' })
  @ApiResponse({ status: 200, description: 'Asignaciones del año académico obtenidas exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findAssignmentsByAcademicYear(@Param('academicYearId') academicYearId: string) {
    return this.subjectsService.findAssignmentsByAcademicYear(academicYearId);
  }

  @Get('assignments/students-by-groups')
  @ApiOperation({ summary: 'Obtener estudiantes agrupados por grupos de clase' })
  @ApiResponse({ status: 200, description: 'Estudiantes obtenidos exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  getStudentsByClassGroups(@Query('classGroupIds') classGroupIds: string) {
    console.log('🔍 [SubjectsController.getStudentsByClassGroups] Called with classGroupIds:', classGroupIds);
    const groupIds = classGroupIds.split(',');
    console.log('🔍 [SubjectsController.getStudentsByClassGroups] Parsed groupIds:', groupIds);
    return this.subjectsService.getStudentsByClassGroups(groupIds);
  }

  @Get('assignments/:id/students')
  @ApiOperation({ summary: 'Obtener estudiantes de una asignación de asignatura' })
  @ApiResponse({ status: 200, description: 'Estudiantes obtenidos exitosamente' })
  @ApiResponse({ status: 404, description: 'Asignación no encontrada' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getStudentsByAssignment(@Param('id') assignmentId: string) {
    console.log('🎯 [CONTROLLER] getStudentsByAssignment called with ID:', assignmentId);
    return this.subjectsService.getStudentsByAssignment(assignmentId);
  }

  @Get('assignments/:id')
  @ApiOperation({ summary: 'Obtener asignación por ID' })
  @ApiResponse({ status: 200, description: 'Asignación obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Asignación no encontrada' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findOneAssignment(@Param('id') id: string) {
    console.log('🎯 [CONTROLLER] findOneAssignment called with ID:', id);
    return this.subjectsService.findOneAssignment(id);
  }

  @Patch('assignments/:id')
  @ApiOperation({ summary: 'Actualizar asignación de asignatura' })
  @ApiResponse({ status: 200, description: 'Asignación actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Asignación no encontrada' })
  @Roles(UserRole.ADMIN)
  updateAssignment(@Param('id') id: string, @Body() updateAssignmentDto: UpdateSubjectAssignmentDto) {
    return this.subjectsService.updateAssignment(id, updateAssignmentDto);
  }

  @Delete('assignments/:id')
  @ApiOperation({ summary: 'Eliminar asignación de asignatura' })
  @ApiResponse({ status: 200, description: 'Asignación eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Asignación no encontrada' })
  @Roles(UserRole.ADMIN)
  removeAssignment(@Param('id') id: string) {
    return this.subjectsService.removeAssignment(id);
  }

  // === ENDPOINTS FOR EVALUATIONS INTEGRATION ===

  @Get('student/:studentId')
  @ApiOperation({ summary: 'Obtener asignaturas de un estudiante' })
  @ApiResponse({ status: 200, description: 'Asignaturas del estudiante obtenidas exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY)
  findSubjectsByStudent(@Param('studentId') studentId: string) {
    return this.subjectsService.findSubjectsByStudent(studentId);
  }

  @Get('teacher/:teacherId')
  @ApiOperation({ summary: 'Obtener asignaturas que imparte un profesor' })
  @ApiResponse({ status: 200, description: 'Asignaturas del profesor obtenidas exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findSubjectsByTeacher(@Param('teacherId') teacherId: string) {
    return this.subjectsService.findSubjectsByTeacher(teacherId);
  }

  @Get('teacher/:teacherId/group/:groupId')
  @ApiOperation({ summary: 'Obtener asignaturas que un profesor imparte a un grupo específico' })
  @ApiResponse({ status: 200, description: 'Asignaturas obtenidas exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findSubjectsByTeacherAndGroup(
    @Param('teacherId') teacherId: string,
    @Param('groupId') groupId: string
  ) {
    return this.subjectsService.findSubjectsByTeacherAndGroup(teacherId, groupId);
  }

  @Get('assignment-details')
  @ApiOperation({ summary: 'Obtener detalles de asignación específica' })
  @ApiResponse({ status: 200, description: 'Detalles de asignación obtenidos exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findAssignmentDetails(
    @Query('teacherId') teacherId: string,
    @Query('subjectId') subjectId: string,
    @Query('classGroupId') classGroupId: string
  ) {
    return this.subjectsService.findAssignmentDetails(teacherId, subjectId, classGroupId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Obtener estadísticas del sistema de asignaturas' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  @Roles(UserRole.ADMIN)
  getSubjectStatistics() {
    return this.subjectsService.getSubjectStatistics();
  }

  @Get('can-evaluate')
  @ApiOperation({ summary: 'Verificar si un profesor puede evaluar una asignatura para un estudiante' })
  @ApiResponse({ status: 200, description: 'Verificación completada' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  canTeacherEvaluateSubject(
    @Query('teacherId') teacherId: string,
    @Query('subjectId') subjectId: string,
    @Query('studentId') studentId: string
  ) {
    return this.subjectsService.canTeacherEvaluateSubject(teacherId, subjectId, studentId);
  }
}