/**
 * @archivo: centralized-grades.controller.ts
 * @módulo: Grades (Centralización de Valoraciones)
 * @función: Controlador API para gestión centralizada de calificaciones
 * @crítico: SÍ - API principal para centro neurálgico de evaluación
 * @actualizado: Julio 2025 - Sistema centralizado de valoraciones
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
  Request,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { CentralizedGradesService, GradeCalculationRequest } from '../services/centralized-grades.service';
import { CentralizedGrade, GradePeriod, GradeStatus } from '../entities/centralized-grade.entity';
import { GradeConfiguration, GradeComponent } from '../entities/grade-configuration.entity';

// DTOs
class CreateGradeConfigurationDto {
  teacherId: string;
  subjectId: string;
  courseId?: string;
  educationalLevelId: string;
  weightConfiguration: any;
  defaultScale?: string;
  roundingPolicy?: string;
  passingGrade?: number;
  enableAIAssessments?: boolean;
}

class UpdateGradeConfigurationDto {
  weightConfiguration?: any;
  defaultScale?: string;
  roundingPolicy?: string;
  passingGrade?: number;
  enableAIAssessments?: boolean;
  notes?: string;
}

class CalculateGradeDto {
  studentId: string;
  subjectAssignmentId: string;
  period?: GradePeriod;
  includeAI?: boolean;
  forceRecalculation?: boolean;
}

class BulkCalculateGradesDto {
  subjectAssignmentId: string;
  studentIds?: string[];
  period?: GradePeriod;
  includeAI?: boolean;
}

class PublishGradesDto {
  gradeIds: string[];
  notifyFamilies?: boolean;
  comments?: string;
}

class GradeReportOptionsDto {
  studentId: string;
  period?: GradePeriod;
  includeBreakdown?: boolean;
  includeAI?: boolean;
  format?: 'json' | 'pdf' | 'excel';
}

@ApiTags('Gestión Centralizada de Calificaciones')
@Controller('centralized-grades')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CentralizedGradesController {
  constructor(
    private readonly centralizedGradesService: CentralizedGradesService,
  ) {}

  // ==========================================
  // ENDPOINTS PARA CONFIGURACIÓN DE PONDERACIONES
  // ==========================================

  @Post('configurations')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Crear configuración de ponderaciones',
    description: 'Crea una nueva configuración de ponderaciones para un profesor, materia y curso específicos',
  })
  @ApiResponse({ status: 201, description: 'Configuración creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de configuración inválidos' })
  @ApiResponse({ status: 403, description: 'Sin permisos para crear configuraciones' })
  async createGradeConfiguration(
    @Body(ValidationPipe) createDto: CreateGradeConfigurationDto,
    @Request() req: any,
  ): Promise<GradeConfiguration> {
    // Verificar que el profesor puede crear esta configuración
    if (req.user.role === UserRole.TEACHER && createDto.teacherId !== req.user.teacherId) {
      throw new ForbiddenException('Solo puedes crear configuraciones para tus propias materias');
    }

    return this.centralizedGradesService.createGradeConfiguration(createDto, req.user.id);
  }

  @Get('configurations')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Obtener configuraciones de ponderaciones',
    description: 'Lista todas las configuraciones de ponderaciones del profesor actual',
  })
  @ApiQuery({ name: 'teacherId', required: false, description: 'ID del profesor (solo admins)' })
  @ApiQuery({ name: 'subjectId', required: false, description: 'Filtrar por materia' })
  @ApiQuery({ name: 'educationalLevelId', required: false, description: 'Filtrar por nivel educativo' })
  @ApiResponse({ status: 200, description: 'Lista de configuraciones' })
  async getGradeConfigurations(
    @Query('teacherId') teacherId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('educationalLevelId') educationalLevelId?: string,
    @Request() req?: any,
  ): Promise<GradeConfiguration[]> {
    // Si es profesor, solo puede ver sus propias configuraciones
    const finalTeacherId = req.user.role === UserRole.TEACHER 
      ? req.user.teacherId 
      : teacherId;

    return this.centralizedGradesService.getGradeConfigurations({
      teacherId: finalTeacherId,
      subjectId,
      educationalLevelId,
    });
  }


  @Delete('configurations/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Eliminar configuración de ponderaciones',
    description: 'Elimina una configuración (solo si no tiene calificaciones asociadas)',
  })
  @ApiParam({ name: 'id', description: 'ID de la configuración' })
  @ApiResponse({ status: 204, description: 'Configuración eliminada exitosamente' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGradeConfiguration(
    @Param('id', ParseUUIDPipe) configurationId: string,
    @Request() req: any,
  ): Promise<void> {
    return this.centralizedGradesService.deleteGradeConfiguration(configurationId, req.user.id);
  }

  // ==========================================
  // ENDPOINTS PARA CÁLCULO DE CALIFICACIONES
  // ==========================================

  @Post('calculate')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Calcular calificación centralizada',
    description: 'Calcula y actualiza la calificación centralizada para un estudiante específico',
  })
  @ApiResponse({ status: 200, description: 'Calificación calculada exitosamente' })
  @ApiResponse({ status: 400, description: 'Parámetros de cálculo inválidos' })
  async calculateCentralizedGrade(
    @Body(ValidationPipe) calculateDto: CalculateGradeDto,
    @Request() req: any,
  ): Promise<any> {
    console.log('🔍 CALCULATE ENDPOINT - Received DTO:', JSON.stringify(calculateDto, null, 2));
    console.log('🔍 CALCULATE ENDPOINT - StudentId:', calculateDto.studentId);
    console.log('🔍 CALCULATE ENDPOINT - SubjectAssignmentId:', calculateDto.subjectAssignmentId);
    
    await this.assertTeacherOwnsAssignment(req.user, calculateDto.subjectAssignmentId);

    const request: GradeCalculationRequest = {
      studentId: calculateDto.studentId,
      subjectAssignmentId: calculateDto.subjectAssignmentId,
      period: calculateDto.period,
      forceRecalculation: calculateDto.forceRecalculation || false,
      includeAI: calculateDto.includeAI || false,
    };

    const result = await this.centralizedGradesService.calculateCentralizedGrade(request);
    
    return {
      success: true,
      data: result.centralizedGrade.getFamilySummary(),
      metadata: {
        sourcesProcessed: result.sourcesProcessed,
        calculationTime: result.calculationTime,
        dataQuality: result.dataQuality,
        warnings: result.warnings,
      },
    };
  }

  @Post('calculate/bulk')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Calcular calificaciones en lote',
    description: 'Calcula calificaciones centralizadas para múltiples estudiantes de una clase',
  })
  @ApiResponse({ status: 200, description: 'Cálculo en lote completado' })
  async bulkCalculateGrades(
    @Body(ValidationPipe) bulkDto: BulkCalculateGradesDto,
    @Request() req: any,
  ): Promise<any> {
    await this.assertTeacherOwnsAssignment(req.user, bulkDto.subjectAssignmentId);
    const results = await this.centralizedGradesService.bulkCalculateGrades(bulkDto, req.user.id);
    
    return {
      success: true,
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results,
    };
  }

  @Post('recalculate/pending')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Recalcular calificaciones pendientes',
    description: 'Procesa todas las calificaciones marcadas para recálculo',
  })
  @ApiResponse({ status: 200, description: 'Recálculo completado' })
  async recalculatePendingGrades(): Promise<any> {
    await this.centralizedGradesService.performNightlyRecalculation();
    return { success: true, message: 'Recálculo iniciado exitosamente' };
  }

  // ==========================================
  // ENDPOINTS PARA CONSULTA DE CALIFICACIONES
  // ==========================================

  @Get('student/:studentId')
  @Roles(UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Obtener calificaciones centralizadas de un estudiante',
    description: 'Obtiene todas las calificaciones centralizadas de un estudiante específico',
  })
  @ApiParam({ name: 'studentId', description: 'ID del estudiante' })
  @ApiQuery({ name: 'period', required: false, enum: GradePeriod, description: 'Período académico' })
  @ApiQuery({ name: 'includeBreakdown', required: false, type: Boolean, description: 'Incluir desglose detallado' })
  @ApiQuery({ name: 'academicYearId', required: false, description: 'Filtrar por año académico' })
  @ApiResponse({ status: 200, description: 'Calificaciones del estudiante' })
  async getStudentCentralizedGrades(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query('period') period?: GradePeriod,
    @Query('includeBreakdown') includeBreakdown?: boolean,
    @Query('academicYearId') academicYearId?: string,
    @Request() req?: any,
  ): Promise<CentralizedGrade[]> {
    // Verificar permisos de acceso según el rol
    await this.verifyStudentAccess(studentId, req.user);

    const restrictToVisibleForFamily =
      req.user.role === UserRole.FAMILY || req.user.role === UserRole.STUDENT;

    return this.centralizedGradesService.getStudentCentralizedGrades(
      studentId,
      period,
      includeBreakdown && (req.user.role === UserRole.TEACHER || req.user.role === UserRole.ADMIN),
      academicYearId,
      restrictToVisibleForFamily,
    );
  }

  @Get('test')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async testEndpoint(): Promise<any> {
    console.log('🔥 TEST ENDPOINT REACHED!');
    return { success: true, message: 'Controller is working!' };
  }

  @Post('recalculate-real/:subjectAssignmentId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Forzar recálculo de calificaciones reales',
    description: 'Recalcula las calificaciones desde las fuentes reales de datos (tareas, actividades, etc.)',
  })
  @ApiParam({ name: 'subjectAssignmentId', description: 'ID de la asignación de materia' })
  @ApiResponse({ status: 200, description: 'Recálculo completado exitosamente' })
  async recalculateRealGrades(
    @Param('subjectAssignmentId', ParseUUIDPipe) subjectAssignmentId: string,
    @Request() req: any,
    @Query('period') period?: GradePeriod,
  ): Promise<any> {
    console.log(`🔥 RECALCULATE REAL GRADES: ${subjectAssignmentId} (period=${period || 'continuous'})`);

    // Nit-6: validar el periodo antes de que llegue a la columna enum de Postgres.
    if (period && !Object.values(GradePeriod).includes(period)) {
      throw new BadRequestException(`Periodo inválido: ${period}`);
    }

    await this.assertTeacherOwnsAssignment(req.user, subjectAssignmentId);

    try {
      // Primero eliminar calificaciones simuladas/incorrectas existentes
      await this.centralizedGradesService.deleteSimulatedGrades(subjectAssignmentId);
      
      // Obtener todos los estudiantes de esta asignación
      const students = await this.centralizedGradesService.getStudentsForSubjectAssignment(subjectAssignmentId);
      
      const results = [];
      for (const student of students) {
        try {
          console.log(`🔥 Recalculating for student: ${student.id}`);
          
          // Forzar recálculo real desde fuentes de datos. El periodo (trimestre)
          // hace que getMode resuelva el modo LOMLOE de ESE trimestre (derive/replace);
          // sin periodo → CONTINUOUS → parallel (comportamiento histórico, sin regresión).
          const result = await this.centralizedGradesService.calculateCentralizedGrade({
            studentId: student.id,
            subjectAssignmentId,
            period,
            forceRecalculation: true,
            includeAI: false,
          });
          
          results.push({
            studentId: student.id,
            success: true,
            finalGrade: result.centralizedGrade.finalGrade,
            dataQuality: result.dataQuality,
          });
        } catch (error) {
          console.error(`❌ Error recalculating for student ${student.id}:`, error.message);
          results.push({
            studentId: student.id,
            success: false,
            error: error.message,
          });
        }
      }
      
      return {
        success: true,
        message: 'Recálculo de calificaciones reales completado',
        subjectAssignmentId,
        totalStudents: students.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      };
    } catch (error) {
      console.error(`❌ Error in recalculateRealGrades:`, error.message);
      throw error;
    }
  }

  @Get('class/:subjectAssignmentId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Obtener calificaciones centralizadas de una clase',
    description: 'Obtiene todas las calificaciones centralizadas para una asignación específica',
  })
  @ApiParam({ name: 'subjectAssignmentId', description: 'ID de la asignación de materia' })
  @ApiQuery({ name: 'period', required: false, enum: GradePeriod, description: 'Período académico' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Campo de ordenación' })
  @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'], description: 'Orden' })
  @ApiResponse({ status: 200, description: 'Calificaciones de la clase' })
  async getClassCentralizedGrades(
    @Param('subjectAssignmentId', ParseUUIDPipe) subjectAssignmentId: string,
    @Query('period') period?: GradePeriod,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'ASC' | 'DESC',
    @Request() req?: any,
  ): Promise<any> {
    console.log(`🚀🚀🚀 CENTRALIZED GRADES CONTROLLER CALLED! 🚀🚀🚀`);
    console.log(`🎯 User role: ${req?.user?.role}, User ID: ${req?.user?.id}`);
    console.log(`🎯 SubjectAssignmentId: ${subjectAssignmentId}`);
    console.log(`🎯 Period: ${period}`);
    console.log(`🎯 Request headers:`, req?.headers?.authorization ? 'Present' : 'Missing');
    try {
      await this.assertTeacherOwnsAssignment(req.user, subjectAssignmentId);
      console.log(`🎯 CONTROLLER: getClassCentralizedGrades called with subjectAssignmentId: ${subjectAssignmentId}`);

      const grades = await this.centralizedGradesService.getClassCentralizedGrades(
        subjectAssignmentId,
        period,
      );

      console.log(`🎯 CONTROLLER: Service returned ${grades.length} grades`);
      console.log(`🎯 CONTROLLER: First grade sample:`, grades[0] ? {
        id: grades[0].id,
        hasStudent: !!grades[0].student,
        hasUser: !!grades[0].student?.user,
        hasProfile: !!grades[0].student?.user?.profile,
        hasSubject: !!grades[0].subject
      } : 'No grades found');

    // Aplicar ordenación si se especifica
    if (sortBy) {
      grades.sort((a, b) => {
        const aValue = this.getNestedProperty(a, sortBy);
        const bValue = this.getNestedProperty(b, sortBy);
        const comparison = aValue > bValue ? 1 : -1;
        return order === 'DESC' ? -comparison : comparison;
      });
    }

      return {
        subjectAssignmentId,
        period: period || 'all',
        totalStudents: grades.length,
        statistics: this.calculateClassStatistics(grades),
        grades: grades.map((grade, index) => this.mapGradeToClassRow(grade, index)),
      };
    } catch (error) {
      console.error(`❌ CONTROLLER: Error in getClassCentralizedGrades:`, error.message);
      console.error(`❌ CONTROLLER: Error stack:`, error.stack);
      throw error;
    }
  }

  @Get('teacher/:teacherId/summary')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Resumen de calificaciones por profesor',
    description: 'Obtiene un resumen de todas las calificaciones de un profesor',
  })
  @ApiParam({ name: 'teacherId', description: 'ID del profesor' })
  @ApiQuery({ name: 'period', required: false, enum: GradePeriod, description: 'Período académico' })
  @ApiResponse({ status: 200, description: 'Resumen de calificaciones del profesor' })
  async getTeacherGradesSummary(
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @Query('period') period?: GradePeriod,
    @Request() req?: any,
  ): Promise<any> {
    console.log(`🎯 CONTROLLER: getTeacherGradesSummary called with teacherId: ${teacherId}, user role: ${req?.user?.role}, user teacherId: ${req?.user?.teacherId}`);
    
    // Verificar que el profesor puede acceder a estos datos
    if (req.user.role === UserRole.TEACHER && req.user.teacherId !== teacherId) {
      console.log(`❌ CONTROLLER: Permission denied - user teacherId ${req.user.teacherId} !== requested teacherId ${teacherId}`);
      throw new ForbiddenException('Solo puedes acceder a tus propias calificaciones');
    }

    console.log(`✅ CONTROLLER: Permission check passed, calling service...`);
    return this.centralizedGradesService.getTeacherGradesSummary(teacherId, period);
  }

  @Get('student/:studentId/breakdown/:subjectAssignmentId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Obtener breakdown detallado de calificaciones',
    description: 'Obtiene el desglose detallado de calificaciones de un estudiante en una asignatura específica',
  })
  @ApiParam({ name: 'studentId', description: 'ID del estudiante' })
  @ApiParam({ name: 'subjectAssignmentId', description: 'ID de la asignación de materia' })
  @ApiQuery({ name: 'period', required: false, enum: GradePeriod, description: 'Período académico' })
  @ApiResponse({ status: 200, description: 'Breakdown detallado de calificaciones' })
  async getStudentGradeBreakdown(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('subjectAssignmentId', ParseUUIDPipe) subjectAssignmentId: string,
    @Query('period') period?: GradePeriod,
    @Request() req?: any,
  ): Promise<any> {
    // Verificar permisos de acceso según el rol
    await this.verifyStudentAccess(studentId, req.user);

    return this.centralizedGradesService.getStudentGradeBreakdown(
      studentId,
      subjectAssignmentId,
      period,
    );
  }

  // ==========================================
  // ENDPOINTS PARA GESTIÓN DE ESTADO
  // ==========================================

  @Post('publish')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Publicar calificaciones',
    description: 'Marca calificaciones como finales y las hace visibles para familias',
  })
  @ApiResponse({ status: 200, description: 'Calificaciones publicadas exitosamente' })
  async publishGrades(
    @Body(ValidationPipe) publishDto: PublishGradesDto,
    @Request() req: any,
  ): Promise<any> {
    const results = await this.centralizedGradesService.publishGrades(
      publishDto.gradeIds,
      req.user.id,
      {
        notifyFamilies: publishDto.notifyFamilies || false,
        comments: publishDto.comments,
      },
    );

    return {
      success: true,
      published: results.successful,
      failed: results.failed,
      notifications: results.notifications,
    };
  }

  @Post('set-visibility')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Publicar u ocultar notas finales para familias',
    description: 'Interruptor "Visible para familias" de cada nota final',
  })
  async setGradesVisibility(
    @Body() body: { gradeIds: string[]; visible: boolean },
    @Request() req: any,
  ): Promise<any> {
    const result = await this.centralizedGradesService.setGradesVisibility(
      body.gradeIds || [],
      req.user.id,
      body.visible === true,
    );
    return { success: true, ...result };
  }

  @Put(':gradeId/status')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Cambiar estado de calificación',
    description: 'Cambia el estado de una calificación específica',
  })
  @ApiParam({ name: 'gradeId', description: 'ID de la calificación' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { enum: Object.values(GradeStatus) },
        comments: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  async updateGradeStatus(
    @Param('gradeId', ParseUUIDPipe) gradeId: string,
    @Body() body: { status: GradeStatus; comments?: string },
    @Request() req: any,
  ): Promise<CentralizedGrade> {
    return this.centralizedGradesService.updateGradeStatus(
      gradeId,
      body.status,
      req.user.id,
      body.comments,
    );
  }

  @Put(':gradeId/comments')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Actualizar comentarios de calificación',
    description: 'Actualiza los comentarios del profesor para una calificación',
  })
  @ApiParam({ name: 'gradeId', description: 'ID de la calificación' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        teacherComments: { type: 'string' },
        internalNotes: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Comentarios actualizados exitosamente' })
  async updateGradeComments(
    @Param('gradeId', ParseUUIDPipe) gradeId: string,
    @Body() body: { teacherComments?: string; internalNotes?: string },
    @Request() req: any,
  ): Promise<CentralizedGrade> {
    return this.centralizedGradesService.updateGradeComments(gradeId, body, req.user.id);
  }

  // ==========================================
  // ENDPOINTS PARA GENERACIÓN DE INFORMES
  // ==========================================

  @Post('reports/generate')
  @Roles(UserRole.TEACHER, UserRole.FAMILY, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Generar informe de calificaciones',
    description: 'Genera un informe detallado de calificaciones en formato específico',
  })
  @ApiResponse({ status: 200, description: 'Informe generado exitosamente' })
  async generateGradeReport(
    @Body(ValidationPipe) reportOptions: GradeReportOptionsDto,
    @Request() req: any,
  ): Promise<any> {
    // Verificar permisos de acceso
    await this.verifyStudentAccess(reportOptions.studentId, req.user);

    const report = await this.centralizedGradesService.generateGradeReport(
      reportOptions.studentId,
      reportOptions.period,
      reportOptions.includeBreakdown && req.user.role !== UserRole.FAMILY,
      reportOptions.includeAI && req.user.role !== UserRole.FAMILY,
    );

    // Si se solicita PDF o Excel, generar archivo
    if (reportOptions.format === 'pdf') {
      const pdfBuffer = await this.centralizedGradesService.generatePDFReport(report);
      return {
        success: true,
        format: 'pdf',
        data: pdfBuffer.toString('base64'),
        filename: `calificaciones_${reportOptions.studentId}_${new Date().toISOString().split('T')[0]}.pdf`,
      };
    }

    if (reportOptions.format === 'excel') {
      const excelBuffer = await this.centralizedGradesService.generateExcelReport(report);
      return {
        success: true,
        format: 'excel',
        data: excelBuffer.toString('base64'),
        filename: `calificaciones_${reportOptions.studentId}_${new Date().toISOString().split('T')[0]}.xlsx`,
      };
    }

    return {
      success: true,
      format: 'json',
      data: report,
    };
  }

  @Get('analytics/dashboard')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Panel de análisis de calificaciones',
    description: 'Obtiene métricas y análisis para el dashboard de calificaciones',
  })
  @ApiQuery({ name: 'teacherId', required: false, description: 'ID del profesor (solo admins)' })
  @ApiQuery({ name: 'period', required: false, enum: GradePeriod, description: 'Período académico' })
  @ApiResponse({ status: 200, description: 'Datos del dashboard' })
  async getGradesDashboard(
    @Query('teacherId') teacherId?: string,
    @Query('period') period?: GradePeriod,
    @Request() req?: any,
  ): Promise<any> {
    const finalTeacherId = req.user.role === UserRole.TEACHER 
      ? req.user.teacherId 
      : teacherId;

    return this.centralizedGradesService.getGradesDashboard(finalTeacherId, period);
  }

  // ==========================================
  // MÉTODOS AUXILIARES PRIVADOS
  // ==========================================

  /** RGPD: un profesor solo opera sobre asignaciones de materia de las que es titular. */
  private async assertTeacherOwnsAssignment(user: any, subjectAssignmentId: string): Promise<void> {
    if (user?.role === UserRole.TEACHER) {
      const ok = await this.centralizedGradesService.verifyTeacherOwnsAssignment(user.teacherId, subjectAssignmentId);
      if (!ok) {
        throw new ForbiddenException('No tienes acceso a esta asignación de materia');
      }
    }
  }

  private async verifyStudentAccess(studentId: string, user: any): Promise<void> {
    // Implementar verificación de permisos según el rol
    switch (user.role) {
      case UserRole.STUDENT:
        if (user.studentId !== studentId) {
          throw new ForbiddenException('Solo puedes acceder a tus propias calificaciones');
        }
        break;

      case UserRole.FAMILY:
        const hasAccess = await this.centralizedGradesService.verifyFamilyAccess(user.id, studentId);
        if (!hasAccess) {
          throw new ForbiddenException('No tienes acceso a las calificaciones de este estudiante');
        }
        break;

      case UserRole.TEACHER:
        const hasTeacherAccess = await this.centralizedGradesService.verifyTeacherAccess(user.teacherId, studentId);
        if (!hasTeacherAccess) {
          throw new ForbiddenException('No tienes acceso a las calificaciones de este estudiante');
        }
        break;

      case UserRole.ADMIN:
        // Los admins tienen acceso completo
        break;

      default:
        throw new ForbiddenException('Rol no autorizado');
    }
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  private mapGradeToClassRow(grade: any, index?: number) {
    try {
      // SP-D2a: finalGrade YA está en 0-100; sin ×10.
      const displayGrade = Number(grade.finalGrade) || 0;
      const numericGrade = displayGrade;

      let hasValidGrade = false;
      if (numericGrade > 0) {
        hasValidGrade = true;
        if (grade.breakdown && Array.isArray(grade.breakdown)) {
          const hasSimulatedData = grade.breakdown.some((b: any) =>
            b.sourceIds && Array.isArray(b.sourceIds) &&
            b.sourceIds.some((id: any) => typeof id === 'string' && id.startsWith('task') && id.length < 10),
          );
          if (hasSimulatedData) hasValidGrade = false;
        }
      }
      if (!numericGrade || numericGrade === 0) hasValidGrade = false;

      return {
        studentId: grade.studentId || 'unknown',
        student: {
          id: grade.studentId || 'unknown',
          fullName: (grade as any).studentName
            || (grade.student?.user?.profile
              ? `${grade.student.user.profile.firstName} ${grade.student.user.profile.lastName}`
              : grade.student?.user?.email || `Student ${grade.studentId}`),
          enrollmentNumber: (grade as any).studentEnrollment || grade.student?.enrollmentNumber || 'N/A',
        },
        finalGrade: hasValidGrade ? displayGrade : null,
        achievementLevel: hasValidGrade ? 'Testing' : 'Sin datos',
        isPassing: hasValidGrade ? displayGrade >= 50 : false,
        trend: hasValidGrade ? 'stable' : 'unknown',
        lastUpdate: grade.updatedAt,
        needsAttention: !hasValidGrade,
        hasData: hasValidGrade,
      };
    } catch (mappingError) {
      console.error(`❌ CONTROLLER: Error mapping grade ${index != null ? index + 1 : ''}:`, mappingError.message);
      return {
        studentId: 'error',
        student: { id: 'error', fullName: 'Error loading student', enrollmentNumber: 'ERROR' },
        finalGrade: 0,
        achievementLevel: 'Error',
        isPassing: false,
        trend: 'unknown',
        lastUpdate: new Date(),
        needsAttention: true,
        hasData: false,
      };
    }
  }

  private calculateClassStatistics(grades: CentralizedGrade[]): any {
    if (grades.length === 0) {
      return {
        classAverage: 0,
        passingRate: 0,
        excellentRate: 0,
        needsAttentionCount: 0,
      };
    }

    const finalGrades = grades.map(g => typeof g.finalGrade === 'number' ? g.finalGrade : Number(g.finalGrade) || 0);
    const classAverage = finalGrades.reduce((sum, grade) => sum + grade, 0) / finalGrades.length;
    const passingCount = grades.filter(g => {
      const grade = typeof g.finalGrade === 'number' ? g.finalGrade : Number(g.finalGrade) || 0;
      return grade >= 50;
    }).length;
    const excellentCount = grades.filter(g => {
      const grade = typeof g.finalGrade === 'number' ? g.finalGrade : Number(g.finalGrade) || 0;
      return grade >= 90;
    }).length;
    const needsAttentionCount = grades.filter(g => {
      const grade = typeof g.finalGrade === 'number' ? g.finalGrade : Number(g.finalGrade) || 0;
      return grade < 50;
    }).length;

    return {
      classAverage: Math.round(classAverage * 100) / 100,
      passingRate: Math.round((passingCount / grades.length) * 100),
      excellentRate: Math.round((excellentCount / grades.length) * 100),
      needsAttentionCount,
      totalStudents: grades.length,
    };
  }
}