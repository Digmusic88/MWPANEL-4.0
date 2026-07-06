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
  Res,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import * as path from 'path';
import { AcademicRecordsService } from './academic-records.service';
import { ReportGeneratorService, ReportGenerationOptions } from './services/report-generator.service';
import { LomloeProgressService } from './services/lomloe-progress.service';
import {
  CreateAcademicRecordDto,
  UpdateAcademicRecordDto,
  CreateAcademicRecordEntryDto,
  UpdateAcademicRecordEntryDto,
  CreateAcademicRecordGradeDto,
  UpdateAcademicRecordGradeDto,
  AcademicRecordQueryDto,
} from './dto/academic-record.dto';
import { AcademicRecord } from './entities/academic-record.entity';
import { AcademicRecordEntry } from './entities/academic-record-entry.entity';
import { AcademicRecordGrade } from './entities/academic-record-grade.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TeacherAccessService } from '../../common/teacher-access/teacher-access.service';
import { FamilyAccessService } from '../../common/family-access/family-access.service';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Academic Records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('academic-records')
export class AcademicRecordsController {
  constructor(
    private readonly academicRecordsService: AcademicRecordsService,
    private readonly reportGeneratorService: ReportGeneratorService,
    private readonly teacherAccess: TeacherAccessService,
    private readonly familyAccess: FamilyAccessService,
    private readonly lomloeProgress: LomloeProgressService,
  ) {}

  /**
   * RGPD: un profesor solo accede a alumnos de sus grupos (tutoría ∪ asignatura);
   * una familia solo a los alumnos de los que es tutora; un estudiante solo a sí mismo.
   */
  private async assertStudentAccess(user: any, studentId: string): Promise<void> {
    if (user?.role === UserRole.TEACHER) {
      const ok = await this.teacherAccess.canTeacherAccessStudent(user.id, studentId);
      if (!ok) throw new ForbiddenException('No tienes acceso a este alumno');
    }
    if (user?.role === UserRole.FAMILY) {
      const ok = await this.familyAccess.canFamilyAccessStudent(user.id, studentId);
      if (!ok) throw new ForbiddenException('No tienes acceso a este alumno');
    }
    if (user?.role === UserRole.STUDENT && user.studentId !== studentId) {
      throw new ForbiddenException('No tienes acceso a este alumno');
    }
  }

  /** RGPD: un profesor solo accede a grupos donde es tutor o imparte asignatura. */
  private async assertGroupAccess(user: any, classGroupId: string): Promise<void> {
    if (user?.role === UserRole.TEACHER) {
      const ok = await this.teacherAccess.canTeacherAccessClassGroup(user.id, classGroupId);
      if (!ok) throw new ForbiddenException('No tienes acceso a este grupo');
    }
  }

  /**
   * RGPD: la descarga de reportes va por nombre de fichero, así que la propiedad se
   * deriva del propio nombre. Boletines `boletin_<matrícula>_<año>_<ts>.pdf` se
   * scopean por alumno; reportes de clase `reporte_clase_<grupoId>_<año>_<ts>.pdf`
   * solo son accesibles a profesorado del grupo (o admin). Formato desconocido o
   * alumno no resuelto → denegado para todo rol no-admin.
   */
  private async assertReportAccess(user: any, fileName: string): Promise<void> {
    if (user?.role === UserRole.ADMIN) return;

    const boletin = fileName.match(/^boletin_(.+)_[^_]+_\d+(?:_priv)?\.pdf$/);
    if (boletin) {
      const enrollmentNumber = boletin[1];
      const studentId = await this.academicRecordsService.findStudentIdByEnrollment(enrollmentNumber);
      if (!studentId) {
        throw new ForbiddenException('No tienes acceso a este reporte');
      }
      await this.assertStudentAccess(user, studentId);
      return;
    }

    const clase = fileName.match(/^reporte_clase_(.+)_[^_]+_\d+\.pdf$/);
    if (clase) {
      // Los reportes de clase agregan a varios alumnos: solo profesorado del grupo.
      if (user?.role !== UserRole.TEACHER) {
        throw new ForbiddenException('No tienes acceso a este reporte');
      }
      await this.assertGroupAccess(user, clase[1]);
      return;
    }

    throw new ForbiddenException('No tienes acceso a este reporte');
  }

  // ==================== ACADEMIC RECORDS ====================

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear nuevo expediente académico' })
  @ApiResponse({ status: 201, description: 'Expediente creado', type: AcademicRecord })
  async createRecord(
    @Body() createDto: CreateAcademicRecordDto,
    @CurrentUser() user: any,
  ): Promise<AcademicRecord> {
    await this.assertStudentAccess(user, createDto.studentId);
    return this.academicRecordsService.createRecord(createDto);
  }

  @Get('student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener expedientes de un estudiante' })
  @ApiResponse({ status: 200, description: 'Expedientes encontrados' })
  async getStudentRecords(
    @Param('studentId') studentId: string,
    @Query() query: AcademicRecordQueryDto,
    @CurrentUser() user: any,
  ): Promise<{ records: AcademicRecord[]; total: number }> {
    await this.assertStudentAccess(user, studentId);
    return this.academicRecordsService.findStudentRecords(studentId, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener expediente por ID' })
  @ApiResponse({ status: 200, description: 'Expediente encontrado', type: AcademicRecord })
  async getRecord(@Param('id') id: string, @CurrentUser() user: any): Promise<AcademicRecord> {
    const record = await this.academicRecordsService.findRecordById(id);
    await this.assertStudentAccess(user, record.studentId);
    return record;
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Actualizar expediente académico' })
  @ApiResponse({ status: 200, description: 'Expediente actualizado', type: AcademicRecord })
  async updateRecord(
    @Param('id') id: string,
    @Body() updateDto: UpdateAcademicRecordDto,
    @CurrentUser() user: any,
  ): Promise<AcademicRecord> {
    const record = await this.academicRecordsService.findRecordById(id);
    await this.assertStudentAccess(user, record.studentId);
    return this.academicRecordsService.updateRecord(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar expediente académico' })
  @ApiResponse({ status: 200, description: 'Expediente eliminado' })
  async deleteRecord(@Param('id') id: string): Promise<{ message: string }> {
    await this.academicRecordsService.deleteRecord(id);
    return { message: 'Expediente eliminado exitosamente' };
  }

  // ==================== ACADEMIC RECORD ENTRIES ====================

  @Post('entries')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear entrada en expediente' })
  @ApiResponse({ status: 201, description: 'Entrada creada', type: AcademicRecordEntry })
  async createEntry(
    @Body() createDto: CreateAcademicRecordEntryDto,
    @CurrentUser() user: any,
  ): Promise<AcademicRecordEntry> {
    const record = await this.academicRecordsService.findRecordById(createDto.academicRecordId);
    await this.assertStudentAccess(user, record.studentId);
    return this.academicRecordsService.createEntry(createDto);
  }

  @Get('entries/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener entrada por ID' })
  @ApiResponse({ status: 200, description: 'Entrada encontrada', type: AcademicRecordEntry })
  async getEntry(@Param('id') id: string, @CurrentUser() user: any): Promise<AcademicRecordEntry> {
    const entry = await this.academicRecordsService.findEntryById(id);
    await this.assertStudentAccess(user, entry.academicRecord?.studentId);
    return entry;
  }

  @Put('entries/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Actualizar entrada en expediente' })
  @ApiResponse({ status: 200, description: 'Entrada actualizada', type: AcademicRecordEntry })
  async updateEntry(
    @Param('id') id: string,
    @Body() updateDto: UpdateAcademicRecordEntryDto,
    @CurrentUser() user: any,
  ): Promise<AcademicRecordEntry> {
    const entry = await this.academicRecordsService.findEntryById(id);
    await this.assertStudentAccess(user, entry.academicRecord?.studentId);
    return this.academicRecordsService.updateEntry(id, updateDto);
  }

  @Delete('entries/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Eliminar entrada de expediente' })
  @ApiResponse({ status: 200, description: 'Entrada eliminada' })
  async deleteEntry(@Param('id') id: string, @CurrentUser() user: any): Promise<{ message: string }> {
    const entry = await this.academicRecordsService.findEntryById(id);
    await this.assertStudentAccess(user, entry.academicRecord?.studentId);
    await this.academicRecordsService.deleteEntry(id);
    return { message: 'Entrada eliminada exitosamente' };
  }

  // ==================== ACADEMIC RECORD GRADES ====================

  @Post('grades')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear calificación en expediente' })
  @ApiResponse({ status: 201, description: 'Calificación creada', type: AcademicRecordGrade })
  async createGrade(
    @Body() createDto: CreateAcademicRecordGradeDto,
    @CurrentUser() user: any,
  ): Promise<AcademicRecordGrade> {
    const entry = await this.academicRecordsService.findEntryById(createDto.entryId);
    await this.assertStudentAccess(user, entry.academicRecord?.studentId);
    return this.academicRecordsService.createGrade(createDto);
  }

  @Get('grades/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener calificación por ID' })
  @ApiResponse({ status: 200, description: 'Calificación encontrada', type: AcademicRecordGrade })
  async getGrade(@Param('id') id: string, @CurrentUser() user: any): Promise<AcademicRecordGrade> {
    const grade = await this.academicRecordsService.findGradeById(id);
    await this.assertStudentAccess(user, grade.entry?.academicRecord?.studentId);
    return grade;
  }

  @Put('grades/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Actualizar calificación en expediente' })
  @ApiResponse({ status: 200, description: 'Calificación actualizada', type: AcademicRecordGrade })
  async updateGrade(
    @Param('id') id: string,
    @Body() updateDto: UpdateAcademicRecordGradeDto,
    @CurrentUser() user: any,
  ): Promise<AcademicRecordGrade> {
    const grade = await this.academicRecordsService.findGradeById(id);
    await this.assertStudentAccess(user, grade.entry?.academicRecord?.studentId);
    return this.academicRecordsService.updateGrade(id, updateDto);
  }

  @Delete('grades/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Eliminar calificación de expediente' })
  @ApiResponse({ status: 200, description: 'Calificación eliminada' })
  async deleteGrade(@Param('id') id: string, @CurrentUser() user: any): Promise<{ message: string }> {
    const grade = await this.academicRecordsService.findGradeById(id);
    await this.assertStudentAccess(user, grade.entry?.academicRecord?.studentId);
    await this.academicRecordsService.deleteGrade(id);
    return { message: 'Calificación eliminada exitosamente' };
  }

  // ==================== REPORTS GENERATION ====================

  @Post('reports/student/:studentId/:academicYear')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY)
  @ApiOperation({ summary: 'Generar boletín PDF de estudiante' })
  @ApiResponse({ status: 201, description: 'Boletín generado' })
  async generateStudentReport(
    @Param('studentId') studentId: string,
    @Param('academicYear') academicYear: string,
    @CurrentUser() user: any,
    @Body() options: Partial<ReportGenerationOptions> = {}
  ): Promise<{ fileName: string; message: string }> {
    await this.assertStudentAccess(user, studentId);
    // Bloqueo RGPD: solo profesor/admin obtienen el boletín CON grupo/etapa/curso;
    // familia/alumno reciben la versión _priv sin esos datos.
    const includeGrouping = user?.role === UserRole.ADMIN || user?.role === UserRole.TEACHER;
    const report = await this.reportGeneratorService.generateStudentReport(
      studentId,
      academicYear,
      options,
      includeGrouping,
    );
    
    return {
      fileName: report.fileName,
      message: 'Boletín generado exitosamente',
    };
  }

  @Post('reports/class/:classGroupId/:academicYear')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Generar reporte PDF de clase' })
  @ApiResponse({ status: 201, description: 'Reporte generado' })
  async generateClassReport(
    @Param('classGroupId') classGroupId: string,
    @Param('academicYear') academicYear: string,
    @CurrentUser() user: any,
    @Body() options: Partial<ReportGenerationOptions> = {}
  ): Promise<{ fileName: string; message: string }> {
    await this.assertGroupAccess(user, classGroupId);
    const report = await this.reportGeneratorService.generateClassReport(
      classGroupId,
      academicYear,
      options
    );
    
    return {
      fileName: report.fileName,
      message: 'Reporte de clase generado exitosamente',
    };
  }

  @Get('reports/download/:fileName')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY)
  @ApiOperation({ summary: 'Descargar reporte PDF' })
  @ApiResponse({ status: 200, description: 'Archivo PDF' })
  async downloadReport(
    @Param('fileName') fileName: string,
    @CurrentUser() user: any,
    @Res() res: Response
  ): Promise<void> {
    await this.assertReportAccess(user, fileName);
    // Bloqueo RGPD: familia/alumno solo pueden descargar la versión _priv (sin grupo/etapa/curso).
    // Impide que una familia baje un boletín completo generado por un profesor.
    if ((user?.role === UserRole.FAMILY || user?.role === UserRole.STUDENT) && !/_priv\.pdf$/i.test(fileName)) {
      throw new ForbiddenException('No autorizado a descargar esta versión del boletín');
    }
    try {
      const filePath = await this.reportGeneratorService.getReportPath(fileName);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.sendFile(filePath);
    } catch (error) {
      throw new NotFoundException('Archivo de reporte no encontrado');
    }
  }

  @Delete('reports/:fileName')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar reporte PDF' })
  @ApiResponse({ status: 200, description: 'Reporte eliminado' })
  async deleteReport(@Param('fileName') fileName: string): Promise<{ message: string }> {
    await this.reportGeneratorService.deleteReport(fileName);
    return { message: 'Reporte eliminado exitosamente' };
  }

  // ==================== STATISTICS ====================

  @Get('statistics/student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener estadísticas de estudiante' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas' })
  async getStudentStatistics(
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
    @Query('academicYear') academicYear?: string
  ): Promise<any> {
    await this.assertStudentAccess(user, studentId);
    return this.academicRecordsService.getStudentStatistics(
      studentId,
      academicYear as any
    );
  }

  // ==================== SYNC ====================

  @Post('sync/student/:studentId/:academicYear')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Sincronizar expediente con evaluaciones existentes' })
  @ApiResponse({ status: 200, description: 'Expediente sincronizado', type: AcademicRecord })
  async syncFromEvaluations(
    @Param('studentId') studentId: string,
    @Param('academicYear') academicYear: string,
    @CurrentUser() user: any,
  ): Promise<AcademicRecord> {
    await this.assertStudentAccess(user, studentId);
    return this.academicRecordsService.syncFromEvaluations(
      studentId,
      academicYear as any
    );
  }

  @Post('sync/class/:subjectAssignmentId/:academicYear')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Sincronizar expedientes de todos los alumnos de una asignación' })
  @ApiResponse({ status: 200, description: 'Clase sincronizada' })
  async syncClass(
    @Param('subjectAssignmentId') subjectAssignmentId: string,
    @Param('academicYear') academicYear: string,
  ): Promise<{ students: number; entries: number }> {
    return this.academicRecordsService.syncClassByYearName(subjectAssignmentId, academicYear);
  }

  @Post('build/year/:academicYearId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reconstruir expedientes de todos los alumnos con notas ese año' })
  @ApiResponse({ status: 201, description: 'Expedientes reconstruidos' })
  async buildYear(
    @Param('academicYearId') academicYearId: string,
  ): Promise<{ students: number; records: number }> {
    return this.academicRecordsService.buildYear(academicYearId);
  }

  // ==================== LOMLOE PROGRESS ====================

  @Get('lomloe-progress/:studentId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener progreso LOMLOE de un estudiante' })
  @ApiResponse({ status: 200, description: 'Progreso LOMLOE obtenido' })
  async getLomloeProgress(
    @Param('studentId') studentId: string,
    @Query('academicYear') academicYear: string,
    @CurrentUser() user: any,
  ) {
    await this.assertStudentAccess(user, studentId);
    if (!academicYear) return { subjects: [] };
    return this.lomloeProgress.getProgressByYearName(studentId, academicYear);
  }
}