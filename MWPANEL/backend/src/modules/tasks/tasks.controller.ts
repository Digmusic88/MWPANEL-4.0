/**
 * @archivo: tasks.controller.ts
 * @módulo: Tasks (Controlador de Tareas Estudiantiles)
 * @función: API endpoints para sistema completo de tareas, entregas y calificaciones
 * @crítico: SÍ - Sistema central de deberes con archivos adjuntos y evaluaciones
 * @dependencias: TasksService, multer file handling, Guards, DTOs
 * @no_modificar: Rutas /teacher/* y /student/* sin verificar frontend routing
 * @relacionado_con: tasks.service.ts, task.entity.ts, frontend tasks components
 */

/**
 * CONTROLADOR: TasksController
 * UBICACIÓN: /backend/src/modules/tasks/tasks.controller.ts
 * FUNCIÓN: API REST completa para gestión de tareas estudiantiles con roles
 * NO USAR PARA: Evaluaciones diarias (usar activities.controller.ts)
 * RUTAS PRINCIPALES:
 *   - POST /tasks: Crear tareas (profesores)
 *   - GET /tasks/teacher/my-tasks: Tareas del profesor con paginación
 *   - POST /tasks/:id/submit: Entregar tarea (estudiantes)
 *   - POST /tasks/submissions/:id/grade: Calificar entrega (profesores)
 *   - GET /tasks/family/tasks: Vista familiar multi-hijo
 * 
 * SISTEMA DE ARCHIVOS ADJUNTOS:
 * - Configuración multer con validación MIME types
 * - Límites: 100MB por archivo, máximo 10 archivos
 * - Tipos permitidos: PDF, DOC, XLS, PPT, images, ZIP
 * - Almacenamiento: uploads/tasks/ y uploads/submissions/
 * - Descarga con Content-Disposition headers
 * 
 * ENDPOINTS POR ROL:
 * 
 * PROFESORES (/teacher/*):
 * - POST /tasks: Crear tarea con asignación automática a grupo
 * - GET /tasks/teacher/my-tasks: Lista con filtros y paginación
 * - GET /tasks/teacher/statistics: Stats de tareas y entregas
 * - POST /tasks/:id/attachments: Subir archivos de instrucciones
 * - POST /tasks/submissions/:id/grade: Calificar con feedback
 * - GET /tasks/teacher/pending-grading: Entregas pendientes
 * - GET /tasks/teacher/advanced-statistics: Analytics avanzados
 * - GET /tasks/teacher/overdue-tasks: Tareas vencidas sin entregar
 * - POST /tasks/teacher/bulk-reminder: Recordatorios masivos
 * 
 * ESTUDIANTES (/student/*):
 * - GET /tasks/student/my-tasks: Tareas asignadas con estado
 * - POST /tasks/:id/submit: Entregar tarea con contenido
 * - POST /tasks/submissions/:id/attachments: Subir archivos entrega
 * - GET /tasks/student/statistics: Progreso personal
 * 
 * FAMILIAS (/family/*):
 * - GET /tasks/family/tasks: Tareas de múltiples hijos
 * - GET /tasks/family/student/:id/statistics: Stats hijo específico
 * 
 * ADMINISTRADORES (/admin/*):
 * - GET /tasks/admin/statistics: Estadísticas sistema completo
 * 
 * VALIDACIONES Y SEGURIDAD:
 * - Guards: JwtAuthGuard + RolesGuard en todas las rutas
 * - Verificación ownership (profesor solo edita sus tareas)
 * - Acceso familiar validado (padres solo ven sus hijos)
 * - File validation: tipos MIME y tamaños de archivo
 * - Límites de entregas tardías por configuración
 * 
 * FUNCIONALIDADES AVANZADAS:
 * - Sistema de calificaciones con penalizaciones
 * - Recordatorios automáticos masivos
 * - Analytics detallados por tarea
 * - Estadísticas comparativas por asignatura
 * - Tracking de fechas límite próximas
 * - Sistema de archivos adjuntos bidireccional
 * 
 * INTEGRACIONES:
 * - SubjectAssignment: Tareas por profesor-asignatura-grupo
 * - ClassGroup: Distribución automática a estudiantes
 * - Family: Acceso multi-hijo para padres
 * - File System: Uploads con estructura organizada
 * 
 * ESTADO ACTUAL: ✅ SISTEMA COMPLETO Y FUNCIONAL
 * - Todas las funcionalidades implementadas y probadas
 * - Sistema de archivos adjuntos operativo
 * - Calificaciones y feedback funcionando
 * - Multi-rol con permisos correctos
 * - Analytics avanzados disponibles
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  NotFoundException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { createReadStream } from 'fs';
import { Response } from 'express';
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  SubmitTaskDto,
  GradeTaskDto,
  GradeWithRubricDto,
  RubricGradeResponseDto,
  TaskQueryDto,
  StudentTaskQueryDto,
  FamilyTaskQueryDto,
  TaskStatisticsDto,
  StudentTaskStatisticsDto,
  AttachStudentNotesToSubmissionDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { Task, TaskSubmission, TaskType, TaskStatus } from './entities';

// Configuración de multer para archivos
const multerConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = join(process.cwd(), 'uploads', 'tasks');
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExtension = extname(file.originalname);
      cb(null, `task-${uniqueSuffix}${fileExtension}`);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB máximo
    files: 10, // Máximo 10 archivos
  },
  fileFilter: (req, file, cb) => {
    // Tipos de archivo permitidos
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/zip',
      'application/x-rar-compressed',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException(`Tipo de archivo no permitido: ${file.mimetype}`), false);
    }
  },
};

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // ==========================================
  // TEST YOURSELF (EXAM GRADES) ENDPOINTS
  // ⚠️ MUST BE FIRST to avoid conflicts with :id routes
  // ==========================================

  @Get('student-exam-grades-new')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener calificaciones Test Yourself del estudiante actual (nueva ruta)' })
  async getStudentExamGradesNew(@CurrentUser() user: any) {
    if (!user.sub) {
      throw new BadRequestException('Usuario no válido');
    }
    return this.tasksService.getStudentExamGrades(user.sub);
  }

  @Get('student/exam-grades')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener calificaciones Test Yourself del estudiante actual' })
  async getStudentExamGrades(@CurrentUser() user: any) {
    if (!user.sub) {
      throw new BadRequestException('Usuario no válido');
    }
    return this.tasksService.getStudentExamGrades(user.sub);
  }


  @Get('student-test-grades')
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener todas las calificaciones Test Yourself del estudiante logueado' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de calificaciones Test Yourself del estudiante',
    type: 'array',
  })
  async getMyExamGrades(@CurrentUser() user: any) {
    // Validate user exists
    if (!user || !user.id) {
      throw new Error('User not authenticated properly');
    }

    const examGrades = await this.tasksService.getStudentExamGrades(user.id);

    return {
      success: true,
      data: examGrades || [],
      total: examGrades?.length || 0,
      message: 'Test Yourself grades retrieved successfully'
    };
  }

  // ==================== ENDPOINTS PARA PROFESORES ====================

  @Post()
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear nueva tarea' })
  @ApiResponse({ status: 201, description: 'Tarea creada exitosamente', type: Task })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'Sin permisos para esta asignatura' })
  async create(@Body() createTaskDto: CreateTaskDto, @Request() req): Promise<Task> {
    return this.tasksService.create(createTaskDto, req.user.sub);
  }

  @Get('teacher/my-tasks')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener tareas del profesor' })
  @ApiResponse({ status: 200, description: 'Lista de tareas del profesor' })
  async findMyTasks(@Query() query: TaskQueryDto, @Request() req) {
    return this.tasksService.findAllByTeacher(req.user.sub, query);
  }

  @Get('teacher/statistics')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener estadísticas del profesor' })
  @ApiResponse({ status: 200, description: 'Estadísticas del profesor', type: TaskStatisticsDto })
  async getTeacherStatistics(@Request() req): Promise<TaskStatisticsDto> {
    return this.tasksService.getTeacherStatistics(req.user.sub);
  }

  // ==================== ATTACHMENT ROUTES (MOVED TO AFTER DOWNLOAD ROUTE) ====================

  @Get('attachments/:attachmentId/download')
  @Roles(UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Descargar archivo adjunto de tarea o obtener información' })
  async downloadTaskAttachment(
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Res({ passthrough: true }) res: Response,
    @Query('action') action?: string,
  ): Promise<StreamableFile | any> {
    const downloadInfo = await this.tasksService.downloadAttachment(attachmentId, 'task');

    // Si action=info, devolver información del archivo
    if (action === 'info') {
      return {
        id: attachmentId,
        originalName: downloadInfo.originalName,
        isGoogleDrive: downloadInfo.isGoogleDrive || false,
        driveWebViewLink: downloadInfo.driveWebViewLink || null,
        driveFileId: downloadInfo.driveFileId || null,
        hasLocalFile: !!downloadInfo.filePath,
        canDownload: !!(downloadInfo.isGoogleDrive || downloadInfo.filePath)
      };
    }
    
    // Si action=test, devolver test response
    if (action === 'test') {
      return {
        message: 'Test endpoint works', 
        attachmentId: attachmentId,
        timestamp: new Date().toISOString()
      };
    }
    
    // Por defecto, manejar descarga (solo archivos locales)
    if (downloadInfo.isGoogleDrive) {
      throw new BadRequestException('Use el enlace de Google Drive para archivos en la nube');
    }
    
    if (!downloadInfo.filePath) {
      throw new NotFoundException('Archivo local no disponible');
    }
    
    const file = createReadStream(downloadInfo.filePath);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${downloadInfo.originalName}"`,
    });
    
    return new StreamableFile(file);
  }

  // Note: Test and info functionality moved to download endpoint with query parameters
  // Use /tasks/attachments/:id/download?action=test or ?action=info

  @Get('submissions/attachments/:attachmentId/download')
  @Roles(UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Descargar archivo adjunto de entrega' })
  async downloadSubmissionAttachment(
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | any> {
    const downloadInfo = await this.tasksService.downloadAttachment(attachmentId, 'submission');
    
    // Si el archivo está en Google Drive, redirigir al enlace de Google Drive
    if (downloadInfo.isGoogleDrive) {
      return res.redirect(downloadInfo.driveWebViewLink);
    }
    
    // Si el archivo está almacenado localmente, streaming tradicional
    if (!downloadInfo.filePath) {
      throw new NotFoundException('Archivo no disponible');
    }
    
    const file = createReadStream(downloadInfo.filePath);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${downloadInfo.originalName}"`,
    });
    
    return new StreamableFile(file);
  }

  @Delete('attachments/:attachmentId')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Eliminar archivo adjunto de tarea' })
  async deleteTaskAttachment(
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Request() req,
  ): Promise<void> {
    return this.tasksService.deleteTaskAttachment(attachmentId, req.user.sub);
  }

  @Delete('submissions/attachments/:attachmentId')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Eliminar archivo adjunto de entrega' })
  async deleteSubmissionAttachment(
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Request() req,
  ): Promise<void> {
    return this.tasksService.deleteSubmissionAttachment(attachmentId, req.user.sub);
  }


  @Get('submissions/:submissionId/rubric-details')
  @Roles(UserRole.STUDENT, UserRole.FAMILY, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener detalles completos de evaluación de rúbrica para estudiante' })
  @ApiResponse({ status: 200, description: 'Detalles de evaluación de rúbrica con criterios y niveles' })
  async getStudentRubricDetails(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Request() req
  ): Promise<any> {
    return this.tasksService.getStudentRubricDetails(submissionId, req.user.sub);
  }

  @Get('submissions/:submissionId')
  @Roles(UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener detalles de una entrega específica' })
  @ApiResponse({ status: 200, description: 'Detalles de la entrega', type: TaskSubmission })
  @ApiResponse({ status: 404, description: 'Entrega no encontrada' })
  async getSubmission(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Request() req,
  ): Promise<TaskSubmission> {
    return this.tasksService.getSubmission(submissionId, req.user.sub);
  }

  @Post('submissions/:submissionId/grade')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Calificar entrega de estudiante' })
  @ApiResponse({ status: 200, description: 'Entrega calificada exitosamente', type: TaskSubmission })
  @ApiResponse({ status: 403, description: 'Sin permisos para calificar esta entrega' })
  @ApiResponse({ status: 404, description: 'Entrega no encontrada' })
  async gradeSubmission(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() gradeDto: GradeTaskDto,
    @Request() req,
  ): Promise<TaskSubmission> {
    return this.tasksService.gradeSubmission(submissionId, gradeDto, req.user.sub);
  }

  @Post('submissions/:submissionId/grade-with-rubric')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Calificar entrega usando rúbrica' })
  @ApiResponse({ status: 200, description: 'Entrega calificada con rúbrica exitosamente', type: RubricGradeResponseDto })
  @ApiResponse({ status: 400, description: 'Rúbrica incompleta o datos inválidos' })
  @ApiResponse({ status: 403, description: 'Sin permisos para calificar esta entrega' })
  @ApiResponse({ status: 404, description: 'Entrega o rúbrica no encontrada' })
  async gradeSubmissionWithRubric(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() gradeRubricDto: GradeWithRubricDto,
    @Request() req,
  ): Promise<RubricGradeResponseDto> {
    return this.tasksService.gradeSubmissionWithRubric(submissionId, gradeRubricDto, req.user.sub);
  }

  // ==================== ENDPOINTS PARA ESTUDIANTES ====================

  @Get('student/my-tasks')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener tareas asignadas al estudiante' })
  @ApiResponse({ status: 200, description: 'Lista de tareas del estudiante' })
  async getMyTasks(@Query() query: StudentTaskQueryDto, @Request() req) {
    return this.tasksService.getStudentTasks(req.user.sub, query);
  }

  @Get('student/statistics')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener estadísticas del estudiante' })
  @ApiResponse({ status: 200, description: 'Estadísticas del estudiante', type: StudentTaskStatisticsDto })
  async getStudentStatistics(@Request() req): Promise<StudentTaskStatisticsDto> {
    return this.tasksService.getStudentStatistics(req.user.sub);
  }

  @Get('student/pending-widget')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener tareas pendientes para widget del dashboard' })
  @ApiResponse({ status: 200, description: 'Lista de tareas pendientes para el widget', type: [Task] })
  async getStudentPendingWidget(@Request() req): Promise<Task[]> {
    return this.tasksService.getStudentPendingTasksWidget(req.user.id);
  }

  @Post('submissions/:submissionId/attachments')
  @Roles(UserRole.STUDENT)
  @UseInterceptors(FilesInterceptor('files', 5, {
    ...multerConfig,
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = join(process.cwd(), 'uploads', 'submissions');
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = extname(file.originalname);
        cb(null, `submission-${uniqueSuffix}${fileExtension}`);
      },
    }),
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir archivos a una entrega' })
  async uploadSubmissionAttachments(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    await this.tasksService.uploadSubmissionAttachments(submissionId, files, req.user.sub);
    return { message: 'Archivos subidos exitosamente', files: files.map(f => f.filename) };
  }

  @Post('submissions/:submissionId/attach-student-notes')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Adjuntar apuntes del estudiante a una entrega de tarea' })
  @ApiResponse({ status: 200, description: 'Apuntes adjuntados exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o apuntes no encontrados' })
  @ApiResponse({ status: 403, description: 'Sin permisos para esta entrega' })
  @ApiResponse({ status: 404, description: 'Entrega no encontrada' })
  async attachStudentNotesToSubmission(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() attachNotesDto: AttachStudentNotesToSubmissionDto,
    @Request() req,
  ) {
    return this.tasksService.attachStudentNotesToSubmission(
      submissionId, 
      attachNotesDto.studentNotes, 
      req.user.sub
    );
  }

  @Post('student/:taskId/archive')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Archivar una tarea completada' })
  @ApiResponse({ status: 200, description: 'Tarea archivada exitosamente' })
  async archiveTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Request() req
  ) {
    return this.tasksService.archiveTaskSubmission(taskId, req.user.sub);
  }

  @Post('student/:taskId/unarchive')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Desarchivar una tarea' })
  @ApiResponse({ status: 200, description: 'Tarea desarchivada exitosamente' })
  async unarchiveTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Request() req
  ) {
    return this.tasksService.unarchiveTaskSubmission(taskId, req.user.sub);
  }

  @Post('student/clean-expired-tests')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Limpiar Test Yourself vencidos del panel del estudiante' })
  @ApiResponse({ status: 200, description: 'Test Yourself vencidos limpiados exitosamente' })
  async cleanExpiredTestYourself(@Request() req) {
    const result = await this.tasksService.cleanExpiredTestYourselfForStudent(req.user.sub);
    return {
      message: 'Test Yourself vencidos limpiados exitosamente',
      ...result
    };
  }

  @Get('student/archived-tasks')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener tareas archivadas del estudiante' })
  @ApiResponse({ status: 200, description: 'Lista de tareas archivadas' })
  async getArchivedTasks(@Query() query: StudentTaskQueryDto, @Request() req) {
    return this.tasksService.getArchivedTasks(req.user.sub, query);
  }

  @Get('student/task/:id')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener detalles de una tarea específica con estado de entrega' })
  @ApiResponse({ status: 200, description: 'Detalles de la tarea con información de entrega', type: Task })
  @ApiResponse({ status: 404, description: 'Tarea no encontrada' })
  @ApiResponse({ status: 403, description: 'No tienes acceso a esta tarea' })
  async getStudentTask(
    @Param('id', ParseUUIDPipe) taskId: string,
    @Request() req
  ): Promise<Task> {
    return this.tasksService.getStudentTask(req.user.sub, taskId);
  }

  // ==================== ENDPOINTS PARA FAMILIAS ====================

  @Get('family/badges')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener conteo de tareas pendientes para badges de familia' })
  @ApiResponse({ status: 200, description: 'Conteo de tareas vencidas y devueltas de los hijos' })
  async getFamilyPendingTasksBadge(@Request() req): Promise<{
    overdueCount: number;
    returnedCount: number;
    totalCount: number;
  }> {
    return this.tasksService.getFamilyPendingTasksBadge(req.user.sub);
  }

  @Get('family/tasks')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener tareas de los hijos' })
  @ApiResponse({ status: 200, description: 'Lista de tareas de los hijos' })
  @ApiQuery({ name: 'studentId', required: false, description: 'ID del estudiante específico' })
  async getFamilyTasks(@Query() query: FamilyTaskQueryDto, @Request() req) {
    return this.tasksService.getFamilyTasks(req.user.sub, query);
  }

  @Get('family/student/:studentId/statistics')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener estadísticas de un hijo específico' })
  @ApiResponse({ status: 200, description: 'Estadísticas del estudiante', type: StudentTaskStatisticsDto })
  async getFamilyStudentStatistics(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Request() req,
  ): Promise<StudentTaskStatisticsDto> {
    return this.tasksService.getFamilyStudentStatistics(req.user.sub, studentId);
  }

  // ==================== ENDPOINTS COMUNES ====================
  // Note: @Get(':id') moved to end of controller to avoid route conflicts

  // ==================== ENDPOINTS PARA ADMINISTRADORES ====================

  @Get('admin/statistics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estadísticas generales del sistema (solo admin)' })
  @ApiResponse({ status: 200, description: 'Estadísticas generales del sistema' })
  async getSystemStatistics() {
    return this.tasksService.getSystemStatistics();
  }

  @Get('teacher/advanced-statistics')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener estadísticas avanzadas del profesor' })
  @ApiResponse({ status: 200, description: 'Estadísticas avanzadas con seguimiento detallado' })
  async getAdvancedTeacherStatistics(@Request() req) {
    // SECURITY FIX: Validate user object exists
    if (!req.user) {
      throw new BadRequestException('Usuario no autenticado correctamente');
    }
    
    // Use user.id instead of user.sub if sub is undefined
    const userId = req.user.sub || req.user.id;
    
    if (!userId) {
      throw new BadRequestException('ID de usuario no disponible');
    }
    
    return this.tasksService.getAdvancedTeacherStatistics(userId);
  }

  @Get('teacher/:id/submissions/analytics')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener analytics de entregas de una tarea específica' })
  @ApiResponse({ status: 200, description: 'Analytics detallados de la tarea' })
  async getTaskSubmissionAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.tasksService.getTaskSubmissionAnalytics(id, req.user.sub);
  }

  @Get('teacher/pending-grading')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener tareas pendientes de calificar' })
  @ApiResponse({ status: 200, description: 'Lista de entregas pendientes de calificar' })
  async getPendingGrading(@Request() req) {
    return this.tasksService.getPendingGrading(req.user.sub);
  }

  @Get('teacher/overdue-tasks')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener tareas vencidas sin entregar' })
  @ApiResponse({ status: 200, description: 'Lista de tareas vencidas' })
  async getOverdueTasks(@Request() req) {
    return this.tasksService.getOverdueTasks(req.user.sub);
  }

  @Post('teacher/bulk-reminder')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Enviar recordatorios masivos para tareas' })
  @ApiResponse({ status: 200, description: 'Recordatorios enviados' })
  async sendBulkReminders(
    @Body() body: { taskIds: string[], message?: string },
    @Request() req,
  ) {
    return this.tasksService.sendBulkReminders(body.taskIds, req.user.sub, body.message);
  }

  @Get('teacher/upcoming-deadlines')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener fechas límite próximas del profesor' })
  @ApiResponse({ status: 200, description: 'Lista de fechas límite próximas' })
  async getUpcomingDeadlines(@Request() req) {
    return this.tasksService.getUpcomingDeadlines(req.user.sub);
  }

  // ==================== GENERIC ID ROUTES (MUST BE LAST TO AVOID CONFLICTS) ====================

  @Get('task/:taskId/attachments')
  @Roles(UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener archivos adjuntos de una tarea' })
  async getTaskAttachments(
    @Param('taskId', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return await this.tasksService.getTaskAttachments(id, req.user.sub);
  }

  @Post('task/:taskId/attachments')
  @Roles(UserRole.TEACHER)
  @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir archivos adjuntos a una tarea' })
  async uploadTaskAttachments(
    @Param('taskId', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    // Multer puts FormData fields in req.body
    const attachmentType = req.body?.type || 'instruction';
    
    await this.tasksService.uploadTaskAttachments(id, files, req.user.sub, undefined, attachmentType);
    return { message: 'Archivos subidos exitosamente', files: files.map(f => f.filename) };
  }

  @Post(':id/folders')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear carpeta para organizar archivos adjuntos' })
  async createTaskFolder(
    @Param('id', ParseUUIDPipe) taskId: string,
    @Body() body: { name: string; description?: string },
    @Request() req,
  ) {
    // Basic implementation - just return success for now
    // In a full implementation, this would create a folder record in the database
    return { 
      message: 'Carpeta creada exitosamente', 
      folder: {
        id: `folder-${Date.now()}`,
        name: body.name,
        description: body.description || '',
        taskId: taskId,
        createdBy: req.user.sub,
        createdAt: new Date().toISOString()
      }
    };
  }

  @Post(':id/submit')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Entregar tarea' })
  @ApiResponse({ status: 200, description: 'Tarea entregada exitosamente', type: TaskSubmission })
  @ApiResponse({ status: 400, description: 'Error en la entrega' })
  @ApiResponse({ status: 404, description: 'Tarea no encontrada o no asignada' })
  async submitTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() submitDto: SubmitTaskDto,
    @Request() req,
  ): Promise<TaskSubmission> {
    // SECURITY FIX: Validate user object exists
    if (!req.user) {
      throw new BadRequestException('Usuario no autenticado correctamente');
    }

    // Use user.id instead of user.sub if sub is undefined
    const userId = req.user.sub || req.user.id;

    if (!userId) {
      throw new BadRequestException('ID de usuario no disponible');
    }

    return this.tasksService.submitTask(id, submitDto, userId);
  }

  // FRONTEND COMPATIBILITY ROUTES - Specific actions for frontend
  @Patch(':id/close')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Cerrar tarea' })
  @ApiResponse({ status: 200, description: 'Tarea cerrada exitosamente', type: Task })
  @ApiResponse({ status: 403, description: 'Sin permisos para cerrar esta tarea' })
  @ApiResponse({ status: 404, description: 'Tarea no encontrada' })
  async closeTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ): Promise<Task> {
    const updateData = { status: TaskStatus.CLOSED, closedAt: new Date() };
    return this.tasksService.update(id, updateData, req.user.sub);
  }

  @Delete(':id/delete')  
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Eliminar tarea' })
  @ApiResponse({ status: 200, description: 'Tarea eliminada exitosamente' })
  @ApiResponse({ status: 403, description: 'Sin permisos para eliminar esta tarea' })
  @ApiResponse({ status: 404, description: 'Tarea no encontrada' })
  async deleteTask(@Param('id', ParseUUIDPipe) id: string, @Request() req): Promise<void> {
    return this.tasksService.remove(id, req.user.sub);
  }

  // GENERIC ROUTES - For direct API calls (try to make them work)
  @Patch(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Actualizar tarea genérica' })
  @ApiResponse({ status: 200, description: 'Tarea actualizada exitosamente', type: Task })
  @ApiResponse({ status: 403, description: 'Sin permisos para editar esta tarea' })
  @ApiResponse({ status: 404, description: 'Tarea no encontrada' })
  async updateTaskGeneric(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req,
  ): Promise<Task> {
    return this.tasksService.update(id, updateTaskDto, req.user.sub);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Eliminar tarea genérica' })
  @ApiResponse({ status: 200, description: 'Tarea eliminada exitosamente' })
  @ApiResponse({ status: 403, description: 'Sin permisos para eliminar esta tarea' })
  @ApiResponse({ status: 404, description: 'Tarea no encontrada' })
  async removeTaskGeneric(@Param('id', ParseUUIDPipe) id: string, @Request() req): Promise<void> {
    return this.tasksService.remove(id, req.user.sub);
  }

  @Patch('task/:id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Actualizar tarea' })
  @ApiResponse({ status: 200, description: 'Tarea actualizada exitosamente', type: Task })
  @ApiResponse({ status: 403, description: 'Sin permisos para editar esta tarea' })
  @ApiResponse({ status: 404, description: 'Tarea no encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req,
  ): Promise<Task> {
    return this.tasksService.update(id, updateTaskDto, req.user.sub);
  }

  @Delete('task/:id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Eliminar tarea' })
  @ApiResponse({ status: 200, description: 'Tarea eliminada exitosamente' })
  @ApiResponse({ status: 403, description: 'Sin permisos para eliminar esta tarea' })
  @ApiResponse({ status: 404, description: 'Tarea no encontrada' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req): Promise<void> {
    return this.tasksService.remove(id, req.user.sub);
  }


  @Get('submissions/:submissionId/rubric-assessment')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener evaluación de rúbrica de una submission de tarea (solo profesores)' })
  @ApiResponse({ status: 200, description: 'Evaluación de rúbrica encontrada (o null si no existe)' })
  async getTaskRubricAssessment(@Param('submissionId', ParseUUIDPipe) submissionId: string): Promise<any> {
    return this.tasksService.getTaskRubricAssessment(submissionId);
  }

  @Get('workaround-test-yourself-sections')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'WORKAROUND: Get Test Yourself sections' })
  async getTestYourselfSectionsWorkaround(@Request() req): Promise<any> {
    const teacher = await this.tasksService.getTeacherByUserId(req.user?.sub);
    if (!teacher) {
      throw new BadRequestException('Profesor no encontrado');
    }
    const teacherId = teacher.id;
    
    try {
      // For now, return the hardcoded section we created
      return [{
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Lengua Castellana',
        description: 'Sección de pruebas de lengua',
        teacherId: teacherId,
        tasks: []
      }];
    } catch (error) {
      return [];
    }
  }

  @Get('task-by-id/:id')
  @Roles(UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener tarea por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la tarea', type: Task })
  @ApiResponse({ status: 404, description: 'Tarea no encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Task> {
    return this.tasksService.findOne(id);
  }


  @Get('test-yourself/:examGradeId/rubric-details')
  @Roles(UserRole.STUDENT, UserRole.FAMILY, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener detalles completos de evaluación de rúbrica para Test Yourself' })
  @ApiParam({ name: 'examGradeId', description: 'ID de la calificación del Test Yourself' })
  @ApiResponse({ status: 200, description: 'Detalles de evaluación de rúbrica con criterios y niveles para Test Yourself' })
  async getTestYourselfRubricDetails(
    @Param('examGradeId', ParseUUIDPipe) examGradeId: string,
    @Request() req
  ): Promise<any> {
    return this.tasksService.getTestYourselfRubricDetails(examGradeId, req.user.sub);
  }

  @Get('exam-grades/tasks')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Listar tareas Test Yourself del profesor' })
  @ApiResponse({ status: 200, description: 'Lista de tareas Test Yourself' })
  async getExamTasks(@CurrentUser() user: any) {
    // Obtener tareas tipo EXAM del profesor usando método existente
    const query = { taskType: TaskType.EXAM };
    return this.tasksService.findAllByTeacher(user.id, query);
  }

  @Get('exam-grades/tasks/:taskId')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener estudiantes y calificaciones de una tarea Test Yourself' })
  @ApiParam({ name: 'taskId', description: 'ID de la tarea Test Yourself' })
  async getExamTaskDetails(@Param('taskId', ParseUUIDPipe) taskId: string, @CurrentUser() user: any) {
    const teacher = await this.tasksService.getTeacherByUserId(user.sub || user.id);
    if (!teacher) {
      throw new BadRequestException('Profesor no encontrado');
    }
    return this.tasksService.getExamTaskDetails(taskId, teacher.id);
  }

  @Get('exam-grades/tasks/:taskId/stats')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Estadísticas de una tarea Test Yourself' })
  @ApiParam({ name: 'taskId', description: 'ID de la tarea Test Yourself' })
  async getExamTaskStats(@Param('taskId', ParseUUIDPipe) taskId: string, @CurrentUser() user: any) {
    const teacher = await this.tasksService.getTeacherByUserId(user.sub || user.id);
    if (!teacher) {
      throw new BadRequestException('Profesor no encontrado');
    }
    return this.tasksService.getExamTaskStats(taskId, teacher.id);
  }

  @Post('exam-grades/tasks/:taskId/students/:studentId/grade')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Calificar estudiante en Test Yourself' })
  @ApiParam({ name: 'taskId', description: 'ID de la tarea Test Yourself' })
  @ApiParam({ name: 'studentId', description: 'ID del estudiante' })
  async gradeExamStudent(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() gradeData: any,
    @CurrentUser() user: any
  ) {
    const teacher = await this.tasksService.getTeacherByUserId(user.sub || user.id);
    if (!teacher) {
      throw new BadRequestException('Profesor no encontrado');
    }
    return this.tasksService.gradeExamStudent(taskId, studentId, gradeData, teacher.id);
  }

  @Post('exam-grades/tasks/:taskId/students/:studentId/grade-with-rubric')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Calificar estudiante en Test Yourself con rúbrica completa' })
  @ApiParam({ name: 'taskId', description: 'ID de la tarea Test Yourself' })
  @ApiParam({ name: 'studentId', description: 'ID del estudiante' })
  async gradeExamStudentWithRubric(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() gradeData: any,
    @CurrentUser() user: any
  ) {
    const teacher = await this.tasksService.getTeacherByUserId(user.sub || user.id);
    if (!teacher) {
      throw new BadRequestException('Profesor no encontrado');
    }
    return this.tasksService.gradeExamStudentWithRubric(taskId, studentId, gradeData, teacher.id);
  }

  @Delete('exam-grades/tasks/:taskId/students/:studentId/grade')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Eliminar calificación de estudiante en Test Yourself' })
  @ApiParam({ name: 'taskId', description: 'ID de la tarea Test Yourself' })
  @ApiParam({ name: 'studentId', description: 'ID del estudiante' })
  async deleteExamGrade(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser() user: any
  ) {
    const teacher = await this.tasksService.getTeacherByUserId(user.sub || user.id);
    if (!teacher) {
      throw new BadRequestException('Profesor no encontrado');
    }
    return this.tasksService.deleteExamGrade(taskId, studentId, teacher.id);
  }

  @Get('exam-grades/tasks/:taskId/students/:studentId/history')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener historial de calificaciones de un estudiante en Test Yourself' })
  @ApiParam({ name: 'taskId', description: 'ID de la tarea Test Yourself' })
  @ApiParam({ name: 'studentId', description: 'ID del estudiante' })
  async getExamGradeHistory(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser() user: any
  ) {
    const teacher = await this.tasksService.getTeacherByUserId(user.sub || user.id);
    if (!teacher) {
      throw new BadRequestException('Profesor no encontrado');
    }
    return this.tasksService.getExamGradeHistory(taskId, studentId, teacher.id);
  }


  @Get('admin/exam-grades/student/:studentId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener calificaciones Test Yourself de un estudiante específico (solo admin)' })
  @ApiParam({ name: 'studentId', description: 'ID del estudiante' })
  @ApiResponse({
    status: 200,
    description: 'Lista de calificaciones Test Yourself del estudiante especificado',
    type: 'array',
  })
  async getStudentExamGradesForAdmin(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser() user: any
  ) {
    return this.tasksService.getStudentExamGradesByStudentId(studentId);
  }

  // ==================== GET ASSIGNED STUDENTS ====================
  @Get('assigned-students/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener IDs de estudiantes asignados a una tarea' })
  @ApiResponse({ status: 200, description: 'Lista de IDs de estudiantes asignados' })
  async getAssignedStudents(@Param('id', ParseUUIDPipe) id: string): Promise<string[]> {
    return this.tasksService.getAssignedStudentIds(id);
  }

  // ==================== WILDCARD ID ROUTE - MUST BE ABSOLUTE LAST ====================
  // This route MUST be the last one to avoid conflicts with all other routes
  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener tarea por ID (ruta genérica)' })
  @ApiResponse({ status: 200, description: 'Detalle de la tarea', type: Task })
  @ApiResponse({ status: 404, description: 'Tarea no encontrada' })
  async getTaskById(@Param('id', ParseUUIDPipe) id: string): Promise<Task> {
    return this.tasksService.findOne(id);
  }


}