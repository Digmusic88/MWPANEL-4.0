/**
 * @archivo: educational-resources.controller.ts
 * @módulo: Educational Resources (API de Recursos Didácticos)
 * @función: Endpoints para gestión de recursos educativos con Google Drive
 * @crítico: SÍ - Recién reparado tras errores 404/400/JSON parsing
 * @dependencias: EducationalResourcesService, FileInterceptor, Guards
 * @no_modificar: allowedMimeTypes sin verificar Google Drive compatibility
 * @relacionado_con: educational-resources.service.ts, google-drive.service.ts
 */

/**
 * RUTAS API DE RECURSOS EDUCATIVOS - RECIÉN REPARADAS
 * 
 * GET /api/recursos/list - Lista de recursos con filtros
 * GET /api/recursos/resource/:id - Recurso individual (AÑADIDO 2025-07-12)
 * POST /api/recursos/google-drive-upload - Subida a Google Drive (REPARADO)
 * GET /api/recursos/metadata/* - Metadatos (subjects, levels, types)
 * GET /api/recursos/status/google-drive - Estado de conexión Drive
 * 
 * REPARACIONES REALIZADAS (2025-07-12):
 * - ✅ Añadido endpoint GET /resource/:id (solucionó 404 errors)
 * - ✅ Fix stream conversion en Google Drive upload (solucionó 400 errors)
 * - ✅ Fix tagsArray transformation (solucionó JSON parsing errors)
 * 
 * VALIDACIÓN DE ARCHIVOS:
 * - Tamaño máximo: 50MB
 * - Tipos permitidos: PDF, DOC, PPT, XLS, MP4, MP3, JPG, PNG, GIF
 * - MIME type validation automática
 * 
 * INTEGRACIÓN GOOGLE DRIVE:
 * - Subida automática a shared drive
 * - Creación de estructura de carpetas por año/nivel/grado/asignatura
 * - Links directos de visualización y descarga
 * 
 * ESTADO ACTUAL: ✅ FUNCIONAL 100%
 */

import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TeacherAccessService } from '../../common/teacher-access/teacher-access.service';
import { UserRole } from '../users/entities/user.entity';
import { EducationalResourcesService } from './educational-resources.service';
import { ResourceFiltersDto } from './dto/resource-filters.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { CreateLinkResourceDto } from './dto/create-link-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { AssignResourceDto } from './dto/assign-resource.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@ApiTags('Educational Resources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recursos')
export class EducationalResourcesController {
  constructor(
    private readonly educationalResourcesService: EducationalResourcesService,
    private readonly teacherAccess: TeacherAccessService,
  ) {}

  /** RGPD: un profesor solo asigna a alumnos de sus grupos (tutoría ∪ asignatura). */
  private async assertStudentAccess(user: any, studentId: string): Promise<void> {
    if (user?.role === UserRole.TEACHER) {
      if (!studentId || !(await this.teacherAccess.canTeacherAccessStudent(user.id, studentId))) {
        throw new ForbiddenException('No tienes acceso a este alumno');
      }
    }
  }

  /** RGPD: un profesor solo asigna a grupos donde es tutor o imparte asignatura. */
  private async assertGroupAccess(user: any, classGroupId: string): Promise<void> {
    if (user?.role === UserRole.TEACHER) {
      if (!classGroupId || !(await this.teacherAccess.canTeacherAccessClassGroup(user.id, classGroupId))) {
        throw new ForbiddenException('No tienes acceso a este grupo');
      }
    }
  }

  /** RGPD: un profesor solo gestiona asignaciones que creó o de sus grupos/alumnos. */
  private async assertAssignmentAccess(user: any, assignmentId: string): Promise<void> {
    if (user?.role !== UserRole.TEACHER) return;
    const a = await this.educationalResourcesService.getAssignmentById(assignmentId);
    if (!a) throw new ForbiddenException('Asignación no encontrada');
    if (a.assignedById === user.id) return;
    if (a.classGroupId && (await this.teacherAccess.canTeacherAccessClassGroup(user.id, a.classGroupId))) return;
    if (a.studentId && (await this.teacherAccess.canTeacherAccessStudent(user.id, a.studentId))) return;
    throw new ForbiddenException('No tienes acceso a esta asignación');
  }

  /** RGPD: filtra las asignaciones de un recurso a las que el profesor puede ver. */
  private async filterAssignmentsForTeacher(user: any, assignments: any[]): Promise<any[]> {
    if (user?.role !== UserRole.TEACHER || !assignments?.length) return assignments;
    const allowed = [];
    for (const a of assignments) {
      if (a.assignedById === user.id) { allowed.push(a); continue; }
      if (a.classGroupId && (await this.teacherAccess.canTeacherAccessClassGroup(user.id, a.classGroupId))) { allowed.push(a); continue; }
      if (a.studentId && (await this.teacherAccess.canTeacherAccessStudent(user.id, a.studentId))) { allowed.push(a); continue; }
    }
    return allowed;
  }


  @Post('delete-resource/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete educational resource' })
  @ApiResponse({ status: 200, description: 'Resource deleted successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async deleteResource(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    console.log('🗑️ DELETE RESOURCE - resource ID:', id, 'user:', user?.id);
    
    try {
      await this.educationalResourcesService.deleteResource(id);
      return { 
        message: 'Recurso eliminado correctamente'
      };
    } catch (error) {
      console.error('❌ ERROR deleting resource:', error);
      throw error;
    }
  }

  @Get('list')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get educational resources list' })
  @ApiResponse({ status: 200, description: 'Resources list retrieved successfully' })
  async getResourcesList(
    @Query(ValidationPipe) filters: ResourceFiltersDto,
    @CurrentUser() user: any,
  ) {
    console.log('🔍 CONTROLLER DEBUG - filters received:', filters);
    console.log('🔍 CONTROLLER DEBUG - user:', user?.id);
    
    try {
      const result = await this.educationalResourcesService.getResourcesList(filters, user.id);
      console.log('🔍 CONTROLLER DEBUG - service returned:', { 
        total: result.total, 
        resourceCount: result.resources.length 
      });
      return result;
    } catch (error) {
      console.error('❌ CONTROLLER ERROR:', error);
      return {
        resources: [],
        total: 0,
        page: 1,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        error: error.message
      };
    }
  }

  @Post('create-link')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create a link resource (external URL)' })
  @ApiResponse({ status: 201, description: 'Link resource created successfully' })
  async createLinkResource(
    @Body(ValidationPipe) dto: CreateLinkResourceDto,
    @CurrentUser() user: any,
  ) {
    return this.educationalResourcesService.createLinkResource(dto, user.id, user.role);
  }

  @Get('link-preview')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Scrape Open Graph preview metadata from a URL' })
  @ApiResponse({ status: 200, description: 'Preview metadata returned' })
  async getLinkPreview(@Query('url') url: string) {
    if (!url) {
      return { title: null, description: null, image: null };
    }
    // Validate protocol before handing to scraper
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { title: null, description: null, image: null };
      }
    } catch {
      return { title: null, description: null, image: null };
    }
    return this.educationalResourcesService.scrapeUrlMetadata(url);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create new educational resource' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 52428800, // 50MB
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/rtf',
        'application/rtf',
        'video/mp4',
        'audio/mpeg',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];
      
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
      }
    }
  }))
  async createResource(
    @Body() createResourceDto: CreateResourceDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    console.log('🔍 UPLOAD DEBUG - Received data:', JSON.stringify(createResourceDto, null, 2));
    console.log('🔍 UPLOAD DEBUG - File info:', file ? { name: file.originalname, size: file.size, type: file.mimetype } : 'NO FILE');
    console.log('🔍 UPLOAD DEBUG - User info:', { id: user?.id, email: user?.email, role: user?.role });
    
    try {
      if (!file) {
        throw new Error('Archivo requerido');
      }
      // Usar authorId del DTO si está presente (admin), sino usar user.id (profesor)
      const authorId = createResourceDto.authorId || user.id;
      console.log('🔍 UPLOAD DEBUG - Using authorId:', authorId);
      
      const result = await this.educationalResourcesService.createResource(createResourceDto, authorId, file);
      console.log('✅ UPLOAD DEBUG - Success!');
      return result;
    } catch (error) {
      console.error('❌ UPLOAD DEBUG - Error:', error);
      console.error('❌ UPLOAD DEBUG - Error stack:', error.stack);
      throw error;
    }
  }

  @Get('metadata/resource-types')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get resource types metadata' })
  @ApiResponse({ status: 200, description: 'Resource types retrieved successfully' })
  async getResourceTypes() {
    const types = await this.educationalResourcesService.getResourceTypes();
    return { data: types };
  }

  @Get('metadata/subjects')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get subjects metadata' })
  @ApiResponse({ status: 200, description: 'Subjects retrieved successfully' })
  async getSubjects() {
    console.log('🔍 METADATA: Getting subjects');
    const subjects = await this.educationalResourcesService.getSubjects();
    console.log('📚 METADATA: Returning', subjects.length, 'subjects');
    return { data: subjects };
  }

  @Get('metadata/levels')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get educational levels metadata' })
  @ApiResponse({ status: 200, description: 'Educational levels retrieved successfully' })
  async getEducationalLevels() {
    console.log('🔍 METADATA: Getting educational levels');
    const levels = await this.educationalResourcesService.getEducationalLevels();
    console.log('🎓 METADATA: Returning', levels.length, 'levels');
    return { data: levels };
  }

  @Get('metadata/file-limits')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get file upload limits' })
  @ApiResponse({ status: 200, description: 'File limits retrieved successfully' })
  async getFileLimits() {
    const limits = await this.educationalResourcesService.getFileLimits();
    return { 
      data: {
        ...limits,
        maxFileSize: limits.maxFileSize, // Return numeric value (bytes)
        maxFileSizeFormatted: limits.maxFileSizeFormatted // Keep formatted version for display
      }
    };
  }

  @Get('favorites')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get user favorite resources' })
  @ApiResponse({ status: 200, description: 'Favorites retrieved successfully' })
  async getUserFavorites(@CurrentUser() user: any) {
    const favorites = await this.educationalResourcesService.getUserFavorites(user.id);
    return { data: favorites };
  }

  @Get('status/google-drive')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get Google Drive connection status' })
  @ApiResponse({ status: 200, description: 'Google Drive status retrieved successfully' })
  async getGoogleDriveStatus() {
    const status = await this.educationalResourcesService.getGoogleDriveStatus();
    return { data: status };
  }

  @Get('resource/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get educational resource by ID' })
  @ApiResponse({ status: 200, description: 'Resource retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async getResourceById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    console.log('🔍 GET RESOURCE BY ID - resource ID:', id, 'user:', user?.id);

    try {
      const resource = await this.educationalResourcesService.getResourceById(id, user.id);

      // RGPD: un profesor solo ve las asignaciones de sus grupos/alumnos
      resource.assignments = await this.filterAssignmentsForTeacher(user, resource.assignments);

      // DEBUG: Log assignments data before returning
      if (resource.assignments && resource.assignments.length > 0) {
        console.log('📤 CONTROLLER RETURNING ASSIGNMENTS:', resource.assignments.length);
        resource.assignments.forEach((assignment, index) => {
          console.log(`📤 Assignment ${index + 1} SERIALIZED:`, JSON.stringify({
            id: assignment.id,
            studentId: assignment.studentId,
            classGroupId: assignment.classGroupId,
            hasStudent: !!assignment.student,
            hasStudentProfile: !!assignment.student?.profile,
            studentData: assignment.student ? {
              id: assignment.student.id,
              email: assignment.student.email,
              hasProfile: !!assignment.student.profile,
              profileData: assignment.student.profile ? {
                firstName: assignment.student.profile.firstName,
                lastName: assignment.student.profile.lastName
              } : null
            } : null,
            hasClassGroup: !!assignment.classGroup,
            classGroupData: assignment.classGroup ? {
              id: assignment.classGroup.id,
              name: assignment.classGroup.name
            } : null,
            hasAssignedBy: !!assignment.assignedBy,
            assignedByData: assignment.assignedBy ? {
              id: assignment.assignedBy.id,
              email: assignment.assignedBy.email,
              hasProfile: !!assignment.assignedBy.profile,
              profileData: assignment.assignedBy.profile ? {
                firstName: assignment.assignedBy.profile.firstName,
                lastName: assignment.assignedBy.profile.lastName
              } : null
            } : null
          }, null, 2));
        });
      }

      return { data: resource };
    } catch (error) {
      console.error('❌ ERROR getting resource by ID:', error);
      throw error;
    }
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update educational resource' })
  @ApiResponse({ status: 200, description: 'Resource updated successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async updateResource(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateResourceDto: UpdateResourceDto,
    @CurrentUser() user: any,
  ) {
    console.log('🔄 UPDATE RESOURCE - resource ID:', id, 'user:', user?.id, 'updates:', updateResourceDto);

    try {
      const resource = await this.educationalResourcesService.updateResource(id, updateResourceDto);
      return { data: resource, message: 'Recurso actualizado correctamente' };
    } catch (error) {
      console.error('❌ ERROR updating resource:', error);
      throw error;
    }
  }

  @Get('analytics')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get real analytics data for educational resources' })
  @ApiResponse({ status: 200, description: 'Analytics data retrieved successfully' })
  async getAnalytics(@CurrentUser() user: any) {
    console.log('📊 ANALYTICS ENDPOINT - user:', user?.id);
    
    try {
      const analytics = await this.educationalResourcesService.getAnalytics();
      return { data: analytics };
    } catch (error) {
      console.error('❌ ANALYTICS ERROR:', error);
      throw error;
    }
  }

  @Get('debug/test')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Debug test endpoint' })
  async debugTest(@CurrentUser() user: any) {
    console.log('🔍 DEBUG TEST ENDPOINT HIT - user:', user?.id);
    
    try {
      // Direct database query bypassing service
      const rawQuery = 'SELECT COUNT(*) as total FROM educational_resources WHERE "isActive" = true';
      const result = await this.educationalResourcesService['resourceRepository'].query(rawQuery);
      console.log('🔍 RAW QUERY RESULT:', result);
      
      return {
        message: 'Debug test endpoint working',
        user: user?.id,
        rawQueryResult: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ DEBUG TEST ERROR:', error);
      return {
        error: error.message,
        stack: error.stack
      };
    }
  }

  @Post('google-drive-upload')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Upload file to Google Drive' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 52428800, // 50MB
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/rtf',
        'application/rtf',
        'video/mp4',
        'audio/mpeg',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];
      
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
      }
    }
  }))
  async googleDriveUpload(
    @Body() createResourceDto: CreateResourceDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    console.log('🔍 DEBUGGING google-drive-upload received data:');
    console.log('📝 DTO:', JSON.stringify(createResourceDto, null, 2));
    console.log('📁 File:', file ? `${file.originalname} (${file.size} bytes)` : 'NO FILE');
    console.log('👤 User:', user?.id);
    
    if (!file) {
      throw new Error('Archivo requerido para subida a Google Drive');
    }
    return this.educationalResourcesService.createResource(createResourceDto, user.id, file);
  }

  @Post('resource/:id/set-public')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Set public permissions for existing resource file' })
  @ApiResponse({ status: 200, description: 'Public permissions set successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  @ApiResponse({ status: 400, description: 'Failed to set public permissions' })
  async setResourcePublic(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    console.log('🔍 SET PUBLIC PERMISSIONS - resource ID:', id, 'user:', user?.id);
    
    try {
      const result = await this.educationalResourcesService.setResourcePublic(id, user.id);
      return { 
        data: result,
        message: 'Permisos públicos configurados correctamente'
      };
    } catch (error) {
      console.error('❌ ERROR setting public permissions:', error);
      throw error;
    }
  }

  @Get('resource/:id/check-public')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Check if resource has public permissions' })
  @ApiResponse({ status: 200, description: 'Public permissions status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async checkResourcePublic(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    console.log('🔍 CHECK PUBLIC PERMISSIONS - resource ID:', id, 'user:', user?.id);
    
    try {
      const isPublic = await this.educationalResourcesService.checkResourcePublic(id, user.id);
      return { 
        data: { isPublic },
        message: isPublic ? 'El archivo es público' : 'El archivo no es público'
      };
    } catch (error) {
      console.error('❌ ERROR checking public permissions:', error);
      throw error;
    }
  }

  @Get('test-delete/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async testDeleteResource(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    console.log('🗑️ TEST DELETE RESOURCE - resource ID:', id, 'user:', user?.id);
    return { message: 'Test endpoint working', id, userId: user?.id };
  }

  @Post(':id/view')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Record resource view' })
  @ApiResponse({ status: 200, description: 'View recorded successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async recordView(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    console.log('👁️ RECORD VIEW - resource ID:', id, 'user:', user?.id);
    
    try {
      await this.educationalResourcesService.recordView(id, user.id, 'web');
      return { 
        message: 'Vista registrada correctamente'
      };
    } catch (error) {
      console.error('❌ ERROR recording view:', error);
      throw error;
    }
  }

  @Get(':id/viewers')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get list of users who viewed a resource' })
  @ApiResponse({ status: 200, description: 'Viewers list retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async getResourceViewers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    console.log('👁️ GET RESOURCE VIEWERS - resource ID:', id, 'user:', user?.id);

    try {
      // RGPD: un profesor solo ve las visualizaciones de recursos de los que es autor
      if (user?.role === UserRole.TEACHER) {
        const resource = await this.educationalResourcesService.getResourceById(id, user.id);
        if (resource.authorId !== user.id) {
          throw new ForbiddenException('No tienes acceso a las visualizaciones de este recurso');
        }
      }
      const viewers = await this.educationalResourcesService.getResourceViewers(id);
      return { data: viewers };
    } catch (error) {
      console.error('❌ ERROR getting resource viewers:', error);
      throw error;
    }
  }

  @Post('batch/set-public')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Set public permissions for all existing resources (Admin only)' })
  @ApiResponse({ status: 200, description: 'Batch operation completed' })
  async batchSetPublic(@CurrentUser() user: any) {
    console.log('🔍 BATCH SET PUBLIC - user:', user?.id);
    
    try {
      const result = await this.educationalResourcesService.batchSetPublicPermissions(user.id);
      return { 
        data: result,
        message: `Operación completada. ${result.successful} archivos configurados como públicos, ${result.failed} fallaron.`
      };
    } catch (error) {
      console.error('❌ ERROR in batch set public:', error);
      throw error;
    }
  }

  @Post(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Assign resource to class group or student' })
  @ApiResponse({ status: 201, description: 'Resource assigned successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async assignResource(
    @Param('id', ParseUUIDPipe) resourceId: string,
    @Body() assignResourceDto: AssignResourceDto,
    @CurrentUser() user: any,
  ) {
    console.log('📋 ASSIGN RESOURCE - resourceId:', resourceId, 'user:', user?.id);
    console.log('📋 Assignment data:', assignResourceDto);
    
    try {
      // RGPD: validar que el destino pertenece al profesor
      if (assignResourceDto.classGroupId) {
        await this.assertGroupAccess(user, assignResourceDto.classGroupId);
      }
      if (assignResourceDto.studentIds?.length) {
        for (const sid of assignResourceDto.studentIds) {
          await this.assertStudentAccess(user, sid);
        }
      }
      if (assignResourceDto.studentId) {
        await this.assertStudentAccess(user, assignResourceDto.studentId);
      }

      let result;

      if (assignResourceDto.classGroupId) {
        // Assign to class group
        result = await this.educationalResourcesService.assignResourceToClass(
          resourceId,
          assignResourceDto.classGroupId,
          user.id,
          assignResourceDto.instructions,
          assignResourceDto.dueDate ? new Date(assignResourceDto.dueDate) : undefined
        );
      } else if (assignResourceDto.studentIds && assignResourceDto.studentIds.length > 0) {
        // Assign to multiple students
        result = await this.educationalResourcesService.assignResourceToMultipleStudents(
          resourceId,
          assignResourceDto.studentIds,
          user.id,
          assignResourceDto.instructions,
          assignResourceDto.dueDate ? new Date(assignResourceDto.dueDate) : undefined
        );
      } else if (assignResourceDto.studentId) {
        // Assign to individual student (backward compatibility)
        result = await this.educationalResourcesService.assignResourceToStudent(
          resourceId,
          assignResourceDto.studentId,
          user.id,
          assignResourceDto.instructions,
          assignResourceDto.dueDate ? new Date(assignResourceDto.dueDate) : undefined
        );
      } else {
        throw new Error('Either classGroupId, studentId, or studentIds must be provided');
      }
      
      return { 
        data: result,
        message: 'Recurso asignado exitosamente'
      };
    } catch (error) {
      console.error('❌ ERROR assigning resource:', error);
      throw error;
    }
  }

  @Delete(':id/assign/:assignmentId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Remove resource assignment' })
  @ApiResponse({ status: 200, description: 'Assignment removed successfully' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async removeAssignment(
    @Param('id', ParseUUIDPipe) resourceId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: any,
  ) {
    console.log('🗑️ REMOVE ASSIGNMENT - resourceId:', resourceId, 'assignmentId:', assignmentId, 'user:', user?.id);
    
    try {
      await this.educationalResourcesService.removeAssignment(assignmentId, user.id);
      return { 
        message: 'Asignación eliminada exitosamente'
      };
    } catch (error) {
      console.error('❌ ERROR removing assignment:', error);
      throw error;
    }
  }

  @Get('teacher/:teacherId/students')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get students for a specific teacher' })
  @ApiResponse({ status: 200, description: 'Students retrieved successfully' })
  async getTeacherStudents(
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @CurrentUser() user: any,
  ) {
    console.log('👥 GET TEACHER STUDENTS - teacherId:', teacherId, 'user:', user?.id);

    // RGPD: un profesor solo puede consultar sus propios alumnos
    if (user?.role === UserRole.TEACHER && user.teacherId !== teacherId) {
      throw new ForbiddenException('No puedes acceder a los alumnos de otro profesor');
    }

    try {
      const students = await this.educationalResourcesService.getTeacherStudents(teacherId);
      return { 
        data: students
      };
    } catch (error) {
      console.error('❌ ERROR getting teacher students:', error);
      throw error;
    }
  }

  @Get('teacher/:teacherId/class-groups')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get class groups for a specific teacher' })
  @ApiResponse({ status: 200, description: 'Class groups retrieved successfully' })
  async getTeacherClassGroups(
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @CurrentUser() user: any,
  ) {
    console.log('🏫 GET TEACHER CLASS GROUPS - teacherId:', teacherId, 'user:', user?.id);

    // RGPD: un profesor solo puede consultar sus propios grupos
    if (user?.role === UserRole.TEACHER && user.teacherId !== teacherId) {
      throw new ForbiddenException('No puedes acceder a los grupos de otro profesor');
    }

    try {
      const classGroups = await this.educationalResourcesService.getTeacherClassGroups(teacherId);
      return { 
        data: classGroups
      };
    } catch (error) {
      console.error('❌ ERROR getting teacher class groups:', error);
      throw error;
    }
  }

  @Get('assigned/subjects')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get subjects that have assigned resources for current student' })
  @ApiResponse({ status: 200, description: 'Subjects with assigned resources retrieved successfully' })
  async getSubjectsWithAssignedResources(@CurrentUser() user: any, @Query('academicYearId') academicYearId?: string) {
    console.log('🎯 GET SUBJECTS WITH ASSIGNED RESOURCES - user:', user?.id, 'role:', user?.role);

    try {
      // CRITICAL FIX: Assignments use user.id directly as studentId
      console.log('🔍 Using user.id directly for subjects:', user.id);

      const subjects = await this.educationalResourcesService.getSubjectsWithAssignedResources(user.id, academicYearId);

      console.log('✅ Found', subjects.length, 'subjects with assigned resources for user:', user.id);

      return subjects;
    } catch (error) {
      console.error('❌ ERROR getting subjects with assigned resources:', error);
      return [];
    }
  }

  @Get('assigned')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get resources assigned to current student' })
  @ApiResponse({ status: 200, description: 'Assigned resources retrieved successfully' })
  async getAssignedResources(@CurrentUser() user: any, @Query('academicYearId') academicYearId?: string) {
    console.log('🎓 GET ASSIGNED RESOURCES - user:', user?.id, 'role:', user?.role);

    try {
      // CRITICAL FIX: Assignments use user.id directly as studentId
      // So we pass user.id directly to the service
      console.log('🔍 Using user.id directly for assignments:', user.id);

      const assignedResources = await this.educationalResourcesService.getAssignedResourcesForStudent(user.id, academicYearId);

      console.log('✅ Found', assignedResources.length, 'assigned resources for user:', user.id);

      return assignedResources;
    } catch (error) {
      console.error('❌ ERROR getting assigned resources:', error);
      return [];
    }
  }

  // ==================== ASSIGNMENT STUDENT MANAGEMENT ====================
  // IMPORTANT: These routes MUST be defined BEFORE :id/assignments to avoid route conflicts

  @Get('assignments/:assignmentId/students')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get students for a group assignment with exclusion status' })
  @ApiResponse({ status: 200, description: 'Students retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async getAssignmentStudents(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: any,
  ) {
    console.log('👥 GET ASSIGNMENT STUDENTS - assignmentId:', assignmentId, 'user:', user?.id);

    try {
      await this.assertAssignmentAccess(user, assignmentId);
      const result = await this.educationalResourcesService.getAssignmentStudents(assignmentId);
      return {
        data: result,
        message: 'Estudiantes obtenidos exitosamente'
      };
    } catch (error) {
      console.error('❌ ERROR getting assignment students:', error);
      throw error;
    }
  }

  @Post('assignments/:assignmentId/exclude-student')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Exclude a student from a group assignment' })
  @ApiResponse({ status: 200, description: 'Student excluded successfully' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async excludeStudentFromAssignment(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() body: { studentId: string },
    @CurrentUser() user: any,
  ) {
    console.log('🚫 EXCLUDE STUDENT - assignmentId:', assignmentId, 'studentId:', body.studentId, 'user:', user?.id);

    try {
      await this.assertAssignmentAccess(user, assignmentId);
      await this.educationalResourcesService.excludeStudentFromAssignment(assignmentId, body.studentId);
      return {
        message: 'Estudiante excluido de la asignación exitosamente'
      };
    } catch (error) {
      console.error('❌ ERROR excluding student:', error);
      throw error;
    }
  }

  @Post('assignments/:assignmentId/include-student')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Re-include a previously excluded student in a group assignment' })
  @ApiResponse({ status: 200, description: 'Student re-included successfully' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async includeStudentInAssignment(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() body: { studentId: string },
    @CurrentUser() user: any,
  ) {
    console.log('✅ INCLUDE STUDENT - assignmentId:', assignmentId, 'studentId:', body.studentId, 'user:', user?.id);

    try {
      await this.assertAssignmentAccess(user, assignmentId);
      await this.educationalResourcesService.includeStudentInAssignment(assignmentId, body.studentId);
      return {
        message: 'Estudiante incluido en la asignación exitosamente'
      };
    } catch (error) {
      console.error('❌ ERROR including student:', error);
      throw error;
    }
  }

  @Get(':id/assignments')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get resource assignments' })
  @ApiResponse({ status: 200, description: 'Assignments retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async getResourceAssignments(
    @Param('id', ParseUUIDPipe) resourceId: string,
    @CurrentUser() user: any,
  ) {
    console.log('📋 GET ASSIGNMENTS - resourceId:', resourceId, 'user:', user?.id);
    
    try {
      const assignments = await this.educationalResourcesService.getResourceAssignments(resourceId);
      return { 
        data: assignments
      };
    } catch (error) {
      console.error('❌ ERROR getting assignments:', error);
      throw error;
    }
  }

  // Simple assignment endpoint for the new UI
  @Post('simple-assign')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Simple resource assignment endpoint for new UI' })
  @ApiResponse({ status: 201, description: 'Assignment created successfully' })
  async simpleAssignResource(
    @Body() assignmentData: {
      resourceId: string;
      assignmentType: 'individual' | 'class';
      targetId: string;
      dueDate?: string;
      instructions?: string;
    },
    @CurrentUser() user: any,
  ) {
    console.log('📋 SIMPLE ASSIGN - data:', assignmentData, 'user:', user?.id);
    
    try {
      // RGPD: validar que el destino pertenece al profesor
      if (assignmentData.assignmentType === 'class') {
        await this.assertGroupAccess(user, assignmentData.targetId);
      } else {
        await this.assertStudentAccess(user, assignmentData.targetId);
      }

      let result;

      if (assignmentData.assignmentType === 'class') {
        // Assign to class group
        result = await this.educationalResourcesService.assignResourceToClass(
          assignmentData.resourceId,
          assignmentData.targetId,
          user.id,
          assignmentData.instructions,
          assignmentData.dueDate ? new Date(assignmentData.dueDate) : undefined
        );
      } else {
        // Assign to individual student
        result = await this.educationalResourcesService.assignResourceToStudent(
          assignmentData.resourceId,
          assignmentData.targetId,
          user.id,
          assignmentData.instructions,
          assignmentData.dueDate ? new Date(assignmentData.dueDate) : undefined
        );
      }
      
      return {
        success: true,
        data: result,
        message: `Recurso asignado correctamente a ${assignmentData.assignmentType === 'class' ? 'clase' : 'estudiante'}`
      };
    } catch (error) {
      console.error('❌ ERROR simple assign:', error);
      throw error;
    }
  }

  /**
   * ============================================================================
   * RESOURCE FOLDERS ENDPOINTS
   * Gestión de carpetas personalizadas para organizar recursos
   * ============================================================================
   */

  @Get('folders')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get folders for current user' })
  @ApiResponse({ status: 200, description: 'Folders retrieved successfully' })
  async getFolders(
    @Query('subjectId') subjectId: string,
    @CurrentUser() user: any,
  ) {
    console.log('📁 GET FOLDERS - subjectId:', subjectId, 'userId:', user?.id, 'role:', user?.role);

    try {
      // Admin and students can see all folders, teachers only see their own
      const teacherId = (user.role === 'admin' || user.role === 'student') ? null : user.id;
      const folders = await this.educationalResourcesService.getFolders(teacherId, subjectId);
      console.log('📁 Returning', folders.length, 'folders for role:', user.role);
      return {
        data: folders,
        message: 'Carpetas obtenidas exitosamente'
      };
    } catch (error) {
      console.error('❌ ERROR getting folders:', error);
      throw error;
    }
  }

  @Get('folders/hierarchy/:subjectId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get folder hierarchy for a subject' })
  @ApiResponse({ status: 200, description: 'Folder hierarchy retrieved successfully' })
  async getFoldersHierarchy(
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @CurrentUser() user: any,
  ) {
    console.log('🌳 GET FOLDERS HIERARCHY - subjectId:', subjectId, 'teacherId:', user?.id);

    try {
      const hierarchy = await this.educationalResourcesService.getFoldersHierarchy(user.id, subjectId);
      return {
        data: hierarchy,
        message: 'Jerarquía de carpetas obtenida exitosamente'
      };
    } catch (error) {
      console.error('❌ ERROR getting folder hierarchy:', error);
      throw error;
    }
  }

  @Get('folders/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get folder by ID' })
  @ApiResponse({ status: 200, description: 'Folder retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async getFolderById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    console.log('📁 GET FOLDER BY ID - folderId:', id, 'teacherId:', user?.id);

    try {
      const folder = await this.educationalResourcesService.getFolderById(id, user.id);
      return {
        data: folder,
        message: 'Carpeta obtenida exitosamente'
      };
    } catch (error) {
      console.error('❌ ERROR getting folder by ID:', error);
      throw error;
    }
  }

  @Post('folders')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create a new folder' })
  @ApiResponse({ status: 201, description: 'Folder created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid folder data' })
  async createFolder(
    @Body() createFolderDto: CreateFolderDto,
    @CurrentUser() user: any,
  ) {
    console.log('📁 CREATE FOLDER - data:', createFolderDto, 'teacherId:', user?.id);

    try {
      const folder = await this.educationalResourcesService.createFolder(createFolderDto, user.id);
      return {
        data: folder,
        message: 'Carpeta creada exitosamente'
      };
    } catch (error) {
      console.error('❌ ERROR creating folder:', error);
      throw error;
    }
  }

  @Put('folders/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update a folder' })
  @ApiResponse({ status: 200, description: 'Folder updated successfully' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async updateFolder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFolderDto: UpdateFolderDto,
    @CurrentUser() user: any,
  ) {
    console.log('📁 UPDATE FOLDER - folderId:', id, 'data:', updateFolderDto, 'teacherId:', user?.id);

    try {
      const folder = await this.educationalResourcesService.updateFolder(id, updateFolderDto, user.id);
      return {
        data: folder,
        message: 'Carpeta actualizada exitosamente'
      };
    } catch (error) {
      console.error('❌ ERROR updating folder:', error);
      throw error;
    }
  }

  @Delete('folders/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete a folder' })
  @ApiResponse({ status: 200, description: 'Folder deleted successfully' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  @ApiResponse({ status: 400, description: 'Folder contains resources or subfolders' })
  async deleteFolder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    console.log('📁 DELETE FOLDER - folderId:', id, 'teacherId:', user?.id);

    try {
      await this.educationalResourcesService.deleteFolder(id, user.id);
      return {
        message: 'Carpeta eliminada exitosamente'
      };
    } catch (error) {
      console.error('❌ ERROR deleting folder:', error);
      throw error;
    }
  }

  @Post('folders/move-resources')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Move resources to a folder' })
  @ApiResponse({ status: 200, description: 'Resources moved successfully' })
  async moveResourcesToFolder(
    @Body() moveData: { resourceIds: string[]; folderId: string | null },
    @CurrentUser() user: any,
  ) {
    console.log('📁 MOVE RESOURCES - data:', moveData, 'teacherId:', user?.id);

    try {
      await this.educationalResourcesService.moveResourcesToFolder(
        moveData.resourceIds,
        moveData.folderId,
        user.id,
      );
      return {
        message: `${moveData.resourceIds.length} recurso(s) movido(s) exitosamente`
      };
    } catch (error) {
      console.error('❌ ERROR moving resources:', error);
      throw error;
    }
  }

  // ==================== DRAG & DROP ENDPOINTS ====================

  @Post('reorder-resources')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Reorder resources within a folder or subject' })
  @ApiResponse({ status: 200, description: 'Resources reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async reorderResources(
    @Body() reorderData: any,
    @CurrentUser() user: any,
  ) {
    console.log('🔄 REORDER RESOURCES - teacherId:', user?.id, 'resources:', reorderData?.resources?.length);

    try {
      await this.educationalResourcesService.reorderResources(
        reorderData.resources,
        user.id,
      );
      return {
        message: 'Recursos reordenados exitosamente'
      };
    } catch (error) {
      console.error('❌ ERROR reordering resources:', error);
      throw error;
    }
  }

  @Post('move-resource')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Move a resource to another folder with drag & drop' })
  @ApiResponse({ status: 200, description: 'Resource moved successfully' })
  @ApiResponse({ status: 404, description: 'Resource or folder not found' })
  async moveResource(
    @Body() moveData: any,
    @CurrentUser() user: any,
  ) {
    console.log('📦 MOVE RESOURCE - resourceId:', moveData?.resourceId, 'to folder:', moveData?.targetFolderId);

    try {
      await this.educationalResourcesService.moveResourceToFolder(
        moveData.resourceId,
        moveData.targetFolderId,
        moveData.newDisplayOrder,
        user.id,
      );
      return {
        message: 'Recurso movido exitosamente'
      };
    } catch (error) {
      console.error('❌ ERROR moving resource:', error);
      throw error;
    }
  }

  @Post('reorder-folders')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Reorder folders within a subject' })
  @ApiResponse({ status: 200, description: 'Folders reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async reorderFolders(
    @Body() reorderData: any,
    @CurrentUser() user: any,
  ) {
    console.log('📁 REORDER FOLDERS - teacherId:', user?.id, 'folders:', reorderData?.folders?.length);

    try {
      await this.educationalResourcesService.reorderFolders(
        reorderData.folders,
        user.id,
      );
      return {
        message: 'Carpetas reordenadas exitosamente'
      };
    } catch (error) {
      console.error('❌ ERROR reordering folders:', error);
      throw error;
    }
  }
}