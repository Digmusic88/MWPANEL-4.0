/**
 * @archivo: teacher-report.controller.ts
 * @módulo: Student Reports - Controller Profesor
 * @función: Endpoints para que el profesor vea sus asignaciones y escriba informes
 * @roles: TEACHER (y ADMIN para algunas consultas)
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
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { PermissionService } from '../services/permission.service';
import { QualitativeReportService } from '../services/qualitative-report.service';
import { TutorReportPdfService } from '../services/tutor-report-pdf.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teacher } from '../../teachers/entities/teacher.entity';
import {
  CreateQualitativeReportDto,
  UpdateQualitativeReportDto,
} from '../dto/report.dto';

@ApiTags('Qualitative Reports - Teacher')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('qualitative-reports')
export class TeacherReportController {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly reportService: QualitativeReportService,
    private readonly pdfService: TutorReportPdfService,
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
  ) {}

  // ===== VISTA "MIS SOLICITUDES DE INFORME" =====

  /**
   * OBTENER MIS ESTUDIANTES ASIGNADOS
   * Lista de estudiantes sobre los que el admin me ha dado permiso
   */
  @Get('my-assignments')
  @Roles(UserRole.TEACHER)
  @ApiOperation({
    summary: 'Ver estudiantes asignados para informes',
    description: 'Lista los estudiantes sobre los que el admin te ha dado permiso para escribir',
  })
  @ApiQuery({ name: 'academicYearId', required: false })
  async getMyAssignments(
    @CurrentUser() user: any,
    @Query('academicYearId') academicYearId?: string,
  ) {
    try {
      console.log('🔍 [my-assignments] User:', user?.id, user?.email);

      const teacher = await this.teacherRepo.findOne({
        where: { user: { id: user.id } },
      });

      console.log('🔍 [my-assignments] Teacher found:', teacher?.id);

      if (!teacher) {
        return { success: true, data: [], message: 'No tienes perfil de profesor' };
      }

      console.log('🔍 [my-assignments] Getting permissions for teacher:', teacher.id);
      const permissions = await this.permissionService.getAssignedStudentsForTeacher(
        teacher.id,
        academicYearId,
      );
      console.log('🔍 [my-assignments] Permissions found:', permissions.length);

      // Para cada permiso, verificar si ya hay un informe escrito
      console.log('🔍 [my-assignments] Getting my reports for user:', user.id);
      let myReports: any[] = [];
      try {
        myReports = await this.reportService.getMyReports(user.id, academicYearId);
        console.log('🔍 [my-assignments] Reports found:', myReports.length);
      } catch (reportError) {
        console.error('❌ [my-assignments] Error getting reports:', reportError);
        // Si no hay reportes, continuamos con array vacío
      }

      const reportsByStudent = new Map<string, any[]>();
      for (const report of myReports) {
        if (!reportsByStudent.has(report.studentId)) {
          reportsByStudent.set(report.studentId, []);
        }
        reportsByStudent.get(report.studentId)!.push(report);
      }

      console.log('🔍 [my-assignments] Mapping', permissions.length, 'permissions');
      return {
        success: true,
        data: permissions.map(p => ({
          permissionId: p.id,
          student: p.student ? {
            id: p.student.id,
            enrollmentNumber: p.student.enrollmentNumber,
            firstName: p.student.user?.profile?.firstName || '',
            lastName: p.student.user?.profile?.lastName || '',
            photoUrl: p.student.user?.profile?.avatarUrl || p.student.photoUrl,
            classGroup: p.student.classGroups?.[0]?.name,
          } : null,
          hasReport: reportsByStudent.has(p.studentId),
          reportsCount: reportsByStudent.get(p.studentId)?.length || 0,
          reports: (reportsByStudent.get(p.studentId) || []).map(r => ({
            id: r.id,
            contextTag: r.contextTag,
            updatedAt: r.updatedAt,
          })),
          createdAt: p.createdAt,
        })),
        meta: {
          total: permissions.length,
          withReports: Array.from(reportsByStudent.keys()).length,
          pending: permissions.length - Array.from(reportsByStudent.keys()).length,
        },
      };
    } catch (error) {
      console.error('❌ [my-assignments] Error:', error);
      console.error('❌ [my-assignments] Stack:', error.stack);
      throw error;
    }
  }

  // ===== CRUD DE INFORMES =====

  /**
   * CREAR INFORME
   */
  @Post()
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear un informe cualitativo' })
  @ApiResponse({ status: 201, description: 'Informe creado' })
  @ApiResponse({ status: 403, description: 'No tienes permiso para este estudiante' })
  async createReport(
    @CurrentUser() user: any,
    @Body() dto: CreateQualitativeReportDto,
  ) {
    const report = await this.reportService.createReport(user.id, dto);
    return {
      success: true,
      data: this.transformReport(report),
    };
  }

  /**
   * ACTUALIZAR INFORME
   */
  @Patch(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Actualizar un informe existente' })
  @ApiParam({ name: 'id', description: 'ID del informe' })
  async updateReport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateQualitativeReportDto,
  ) {
    const report = await this.reportService.updateReport(id, user.id, dto);
    return {
      success: true,
      data: this.transformReport(report),
    };
  }

  /**
   * ELIMINAR INFORME
   */
  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un informe' })
  @ApiParam({ name: 'id', description: 'ID del informe' })
  async deleteReport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const isAdmin = user.role === UserRole.ADMIN;
    await this.reportService.deleteReport(id, user.id, isAdmin);
  }

  /**
   * OBTENER MIS INFORMES
   */
  @Get('my-reports')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Ver todos mis informes escritos' })
  @ApiQuery({ name: 'academicYearId', required: false })
  async getMyReports(
    @CurrentUser() user: any,
    @Query('academicYearId') academicYearId?: string,
  ) {
    const reports = await this.reportService.getMyReports(user.id, academicYearId);
    return {
      success: true,
      data: reports.map(r => this.transformReport(r)),
      meta: { total: reports.length },
    };
  }

  /**
   * OBTENER INFORME EXISTENTE PARA UN ESTUDIANTE
   * Útil para cargar datos en el formulario
   */
  @Get('for-student/:studentId')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener informe existente para un estudiante' })
  @ApiParam({ name: 'studentId', description: 'ID del estudiante' })
  @ApiQuery({ name: 'contextTag', required: false })
  @ApiQuery({ name: 'academicYearId', required: false })
  async getExistingReport(
    @CurrentUser() user: any,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query('contextTag') contextTag?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    const report = await this.reportService.getExistingReport(
      user.id,
      studentId,
      contextTag,
      academicYearId,
    );

    return {
      success: true,
      data: report ? this.transformReport(report) : null,
    };
  }

  /**
   * OBTENER ETIQUETAS DE CONTEXTO PREDEFINIDAS
   */
  @Get('context-tags')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener lista de etiquetas de contexto predefinidas' })
  async getContextTags(@Query('academicYearId') academicYearId?: string) {
    const predefined = this.reportService.getPredefinedContextTags();
    const used = await this.reportService.getUsedContextTags(academicYearId);

    // Combinar y eliminar duplicados
    const all = [...new Set([...predefined, ...used])].sort();

    return {
      success: true,
      data: {
        predefined,
        used,
        all,
      },
    };
  }

  // ===== DASHBOARD DEL TUTOR =====

  /**
   * DASHBOARD DEL TUTOR: VER TODOS LOS INFORMES DE MIS TUTORADOS
   * Vista consolidada de todos los estudiantes de los grupos que tutorizo
   * con todos los informes que otros profesores han escrito sobre ellos
   */
  @Get('tutor-dashboard')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Dashboard del tutor: ver informes de todos mis tutorados',
    description: 'Obtiene todos los estudiantes de los grupos donde soy tutor, con todos los informes escritos por otros profesores',
  })
  @ApiQuery({ name: 'academicYearId', required: false })
  async getTutorDashboard(
    @CurrentUser() user: any,
    @Query('academicYearId') academicYearId?: string,
  ) {
    const result = await this.reportService.getTutoredStudentsWithReports(
      user.id,
      academicYearId,
    );

    return {
      success: true,
      data: result.classGroups,
      summary: result.summary,
    };
  }

  // ===== DESCARGA DE PDF =====

  /**
   * GENERAR PDF DE INFORMES DE UN ESTUDIANTE ESPECÍFICO
   * Descarga el informe consolidado de un estudiante con todos los comentarios
   */
  @Get('tutor-pdf/student/:studentId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Descargar PDF de informes de un estudiante',
    description: 'Genera un PDF elegante con todos los informes de un estudiante específico',
  })
  @ApiParam({ name: 'studentId', description: 'ID del estudiante' })
  @ApiQuery({ name: 'academicYearId', required: false })
  async downloadStudentReportPdf(
    @CurrentUser() user: any,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query('academicYearId') academicYearId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    console.log('📄 [tutor-pdf/student] Generating PDF for student:', studentId);

    // Get tutor info (the current user)
    const teacher = await this.teacherRepo.findOne({
      where: { user: { id: user.id } },
      relations: ['user', 'user.profile'],
    });

    const tutorName = teacher
      ? `${teacher.user?.profile?.firstName || ''} ${teacher.user?.profile?.lastName || ''}`.trim()
      : '';
    const tutorEmail = teacher?.user?.email || '';

    // Get all reports for this student
    const reports = await this.reportService.getStudentReports(studentId, academicYearId);

    if (!reports || reports.length === 0) {
      // Return empty PDF with message
      const student = await this.reportService.getStudentBasicInfo(studentId);
      const pdfBuffer = await this.pdfService.generateStudentReportPdf({
        id: studentId,
        firstName: student?.firstName || 'Estudiante',
        lastName: student?.lastName || '',
        enrollmentNumber: student?.enrollmentNumber || '',
        photoUrl: null,
        classGroup: student?.classGroup || '',
        tutorName,
        tutorEmail,
      }, []);

      const fileName = `informe-${student?.lastName || 'estudiante'}-${student?.firstName || ''}.pdf`
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-\.]/g, '');

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      });

      return new StreamableFile(pdfBuffer);
    }

    // Transform reports to the format expected by PDF service
    const student = reports[0].student;
    const transformedReports = reports.map(r => ({
      id: r.id,
      contextTag: r.contextTag,
      content: r.content,
      priority: r.priority,
      priorityLabel: this.getPriorityLabel(r.priority),
      authorName: r.authorTeacher
        ? `${r.authorTeacher.user?.profile?.firstName || ''} ${r.authorTeacher.user?.profile?.lastName || ''}`.trim()
        : 'Anónimo',
      authorEmail: r.authorTeacher?.user?.email || '',
      createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: r.updatedAt?.toISOString() || new Date().toISOString(),
    }));

    const pdfBuffer = await this.pdfService.generateStudentReportPdf(
      {
        id: student?.id || studentId,
        firstName: student?.user?.profile?.firstName || '',
        lastName: student?.user?.profile?.lastName || '',
        enrollmentNumber: student?.enrollmentNumber || '',
        photoUrl: student?.user?.profile?.avatarUrl || student?.photoUrl || null,
        classGroup: student?.classGroups?.[0]?.name || '',
        tutorName,
        tutorEmail,
      },
      transformedReports,
    );

    const firstName = student?.user?.profile?.firstName || '';
    const lastName = student?.user?.profile?.lastName || '';
    const fileName = `informe-${lastName}-${firstName}.pdf`
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-\.]/g, '');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    console.log('📄 [tutor-pdf/student] PDF generated successfully for:', firstName, lastName);
    return new StreamableFile(pdfBuffer);
  }

  /**
   * GENERAR PDF GLOBAL DE TODOS LOS TUTORADOS
   * Descarga un informe consolidado con todos los estudiantes y sus comentarios
   */
  @Get('tutor-pdf/all')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Descargar PDF con todos los informes de tutorados',
    description: 'Genera un PDF elegante con todos los estudiantes tutorados y sus informes',
  })
  @ApiQuery({ name: 'academicYearId', required: false })
  async downloadAllStudentsReportPdf(
    @CurrentUser() user: any,
    @Query('academicYearId') academicYearId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    console.log('📄 [tutor-pdf/all] Generating PDF for all tutored students, user:', user?.id);

    // Get tutor dashboard data
    const result = await this.reportService.getTutoredStudentsWithReports(
      user.id,
      academicYearId,
    );

    // Get tutor info
    const teacher = await this.teacherRepo.findOne({
      where: { user: { id: user.id } },
      relations: ['user', 'user.profile'],
    });

    const tutorInfo = {
      name: teacher
        ? `${teacher.user?.profile?.firstName || ''} ${teacher.user?.profile?.lastName || ''}`.trim()
        : 'Tutor',
      email: teacher?.user?.email || '',
    };

    // Transform data for PDF service
    const classGroups = result.classGroups.map((cg: any) => ({
      id: cg.id,
      name: cg.name,
      students: cg.students.map((s: any) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        enrollmentNumber: s.enrollmentNumber,
        photoUrl: s.photoUrl,
        reports: s.reports.map((r: any) => ({
          id: r.id,
          contextTag: r.contextTag,
          content: r.content,
          priority: r.priority,
          priorityLabel: this.getPriorityLabel(r.priority),
          authorName: r.authorName,
          authorEmail: r.authorEmail,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
        totalReports: s.totalReports,
        hasHighPriority: s.hasHighPriority,
      })),
      totalStudents: cg.totalStudents,
      studentsWithReports: cg.studentsWithReports,
      totalReports: cg.totalReports,
    }));

    const pdfBuffer = await this.pdfService.generateAllStudentsReportPdf(
      tutorInfo,
      classGroups,
      result.summary,
    );

    const date = new Date().toISOString().split('T')[0];
    const fileName = `informe-tutorados-${date}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    console.log('📄 [tutor-pdf/all] PDF generated successfully with', result.summary.totalStudents, 'students');
    return new StreamableFile(pdfBuffer);
  }

  // ===== VISTA DEL TUTOR (consulta de informes de un estudiante) =====
  // NOTA: Esta ruta debe ir DESPUÉS de las rutas específicas (tutor-pdf/*)
  // para evitar que el parámetro :studentId capture rutas como "tutor-pdf"

  /**
   * OBTENER TODOS LOS INFORMES DE UN ESTUDIANTE
   * Vista del Tutor para ver feedback de todos los profesores
   */
  @Get('student/:studentId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Ver todos los informes de un estudiante',
    description: 'Vista del Tutor: ve informes de todos los profesores',
  })
  @ApiParam({ name: 'studentId', description: 'ID del estudiante' })
  @ApiQuery({ name: 'academicYearId', required: false })
  async getStudentReports(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    const reports = await this.reportService.getStudentReports(studentId, academicYearId);
    const stats = await this.reportService.getStudentReportStats(studentId, academicYearId);

    // Agrupar por contexto (materia/etiqueta)
    const byContext = new Map<string, any[]>();
    for (const report of reports) {
      if (!byContext.has(report.contextTag)) {
        byContext.set(report.contextTag, []);
      }
      byContext.get(report.contextTag)!.push(this.transformReport(report));
    }

    return {
      success: true,
      data: {
        timeline: reports.map(r => this.transformReport(r)),
        byContext: Array.from(byContext.entries()).map(([context, reports]) => ({
          context,
          reports,
          count: reports.length,
        })),
        stats,
      },
      meta: { total: reports.length },
    };
  }

  // ===== HELPERS =====

  private transformReport(report: any) {
    return {
      id: report.id,
      studentId: report.studentId,
      student: report.student ? {
        id: report.student.id,
        enrollmentNumber: report.student.enrollmentNumber,
        firstName: report.student.user?.profile?.firstName || '',
        lastName: report.student.user?.profile?.lastName || '',
        photoUrl: report.student.user?.profile?.avatarUrl || report.student.photoUrl,
        classGroup: report.student.classGroups?.[0]?.name,
      } : null,
      author: report.authorTeacher ? {
        id: report.authorTeacher.id,
        firstName: report.authorTeacher.user?.profile?.firstName || '',
        lastName: report.authorTeacher.user?.profile?.lastName || '',
        email: report.authorTeacher.user?.email,
        photoUrl: report.authorTeacher.user?.profile?.avatarUrl,
      } : null,
      contextTag: report.contextTag,
      content: report.content,
      priority: report.priority,
      priorityLabel: this.getPriorityLabel(report.priority),
      visibleToFamily: report.visibleToFamily,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      wasEdited: report.createdAt?.getTime() !== report.updatedAt?.getTime(),
    };
  }

  private getPriorityLabel(priority: number): string {
    switch (priority) {
      case 1: return 'Informativo';
      case 2: return 'Normal';
      case 3: return 'Importante';
      case 4: return 'Urgente';
      default: return 'Normal';
    }
  }
}
