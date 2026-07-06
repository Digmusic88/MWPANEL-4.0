import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EvaluationsService } from './evaluations.service';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TeacherAccessService } from '../../common/teacher-access/teacher-access.service';
import { FamilyAccessService } from '../../common/family-access/family-access.service';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Evaluaciones')
@Controller('evaluations')
export class EvaluationsController {
  constructor(
    private readonly evaluationsService: EvaluationsService,
    private readonly teacherAccess: TeacherAccessService,
    private readonly familyAccess: FamilyAccessService,
  ) {}

  /**
   * RGPD: un profesor solo accede a alumnos de sus grupos (tutoría ∪ asignatura);
   * una familia solo a los alumnos de los que es tutora (contacto primario/secundario).
   */
  private async assertTeacherStudentAccess(user: any, studentId: string): Promise<void> {
    if (user?.role === UserRole.TEACHER) {
      const ok = await this.teacherAccess.canTeacherAccessStudent(user.id, studentId);
      if (!ok) throw new ForbiddenException('No tienes acceso a este alumno');
    }
    if (user?.role === UserRole.FAMILY) {
      const ok = await this.familyAccess.canFamilyAccessStudent(user.id, studentId);
      if (!ok) throw new ForbiddenException('No tienes acceso a este alumno');
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener todas las evaluaciones (solo administración)' })
  @ApiResponse({ status: 200, description: 'Lista de evaluaciones obtenida exitosamente' })
  findAll() {
    return this.evaluationsService.findAll();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estadísticas de evaluaciones' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  getStats() {
    return this.evaluationsService.getEvaluationStats();
  }

  @Get('student/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener evaluaciones de un estudiante' })
  @ApiResponse({ status: 200, description: 'Evaluaciones del estudiante obtenidas exitosamente' })
  async findByStudent(@Param('studentId') studentId: string, @CurrentUser() user: any) {
    // Los estudiantes sólo pueden ver sus propias evaluaciones
    if (user.role === UserRole.STUDENT && user.studentId !== studentId) {
      throw new ForbiddenException('No tienes permiso para ver las evaluaciones de este estudiante');
    }
    // RGPD: el profesor solo accede a alumnos de sus grupos
    await this.assertTeacherStudentAccess(user, studentId);
    return this.evaluationsService.findByStudent(studentId);
  }

  @Get('teacher/:teacherId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener evaluaciones de un profesor' })
  @ApiResponse({ status: 200, description: 'Evaluaciones del profesor obtenidas exitosamente' })
  findByTeacher(@Param('teacherId') teacherId: string, @CurrentUser() user: any) {
    // RGPD: un profesor solo consulta sus propias evaluaciones
    if (user.role === UserRole.TEACHER && user.teacherId !== teacherId) {
      throw new ForbiddenException('No tienes acceso a las evaluaciones de otro profesor');
    }
    return this.evaluationsService.findByTeacher(teacherId);
  }

  @Get('radar/:studentId/:periodId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener diana competencial de un estudiante' })
  @ApiResponse({ status: 200, description: 'Diana competencial obtenida exitosamente' })
  async getRadarChart(@Param('studentId') studentId: string, @Param('periodId') periodId: string, @CurrentUser() user: any) {
    if (user.role === UserRole.STUDENT && user.studentId !== studentId) {
      throw new ForbiddenException('No tienes acceso a esta diana competencial');
    }
    await this.assertTeacherStudentAccess(user, studentId);
    return this.evaluationsService.getRadarChart(studentId, periodId);
  }

  @Post('radar/:studentId/:periodId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Generar diana competencial de un estudiante' })
  @ApiResponse({ status: 201, description: 'Diana competencial generada exitosamente' })
  async generateRadarChart(@Param('studentId') studentId: string, @Param('periodId') periodId: string, @CurrentUser() user: any) {
    await this.assertTeacherStudentAccess(user, studentId);
    return this.evaluationsService.generateRadarChart(studentId, periodId);
  }

  @Get('periods')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener todos los períodos de evaluación' })
  @ApiResponse({ status: 200, description: 'Períodos obtenidos exitosamente' })
  getAllPeriods() {
    return this.evaluationsService.getAllPeriods();
  }

  @Get('periods/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener período de evaluación activo' })
  @ApiResponse({ status: 200, description: 'Período activo obtenido exitosamente' })
  getActivePeriod() {
    return this.evaluationsService.getActivePeriod();
  }

  @Post('periods/initialize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Inicializar períodos de evaluación para el año académico' })
  @ApiResponse({ status: 201, description: 'Períodos creados exitosamente' })
  createEvaluationPeriods() {
    return this.evaluationsService.createEvaluationPeriods();
  }

  @Post('setup/test-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear datos de prueba para evaluaciones (solo admin)' })
  @ApiResponse({ status: 201, description: 'Datos de prueba creados exitosamente' })
  async createTestData() {
    return this.evaluationsService.createTestData();
  }

  // ==================== CRUD PERÍODOS DE EVALUACIÓN ====================

  @Post('periods')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear nuevo período de evaluación' })
  @ApiResponse({ status: 201, description: 'Período creado exitosamente' })
  createPeriod(@Body() createPeriodDto: any) {
    return this.evaluationsService.createPeriod(createPeriodDto);
  }

  @Get('periods/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener período específico' })
  @ApiResponse({ status: 200, description: 'Período obtenido exitosamente' })
  getPeriod(@Param('id') id: string) {
    return this.evaluationsService.getPeriod(id);
  }

  @Patch('periods/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar período de evaluación' })
  @ApiResponse({ status: 200, description: 'Período actualizado exitosamente' })
  updatePeriod(@Param('id') id: string, @Body() updatePeriodDto: any) {
    return this.evaluationsService.updatePeriod(id, updatePeriodDto);
  }

  @Delete('periods/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar período de evaluación' })
  @ApiResponse({ status: 200, description: 'Período eliminado exitosamente' })
  deletePeriod(@Param('id') id: string) {
    return this.evaluationsService.deletePeriod(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener una evaluación específica' })
  @ApiResponse({ status: 200, description: 'Evaluación obtenida exitosamente' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const evaluation = await this.evaluationsService.findOne(id);
    await this.assertTeacherStudentAccess(user, evaluation.student?.id);
    return evaluation;
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear una nueva evaluación' })
  @ApiResponse({ status: 201, description: 'Evaluación creada exitosamente' })
  async create(@Body(new ValidationPipe({ whitelist: true })) createEvaluationDto: CreateEvaluationDto, @CurrentUser() user: any) {
    await this.assertTeacherStudentAccess(user, createEvaluationDto.studentId);
    return this.evaluationsService.create(createEvaluationDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Actualizar una evaluación' })
  @ApiResponse({ status: 200, description: 'Evaluación actualizada exitosamente' })
  async update(@Param('id') id: string, @Body(new ValidationPipe({ whitelist: true })) updateEvaluationDto: UpdateEvaluationDto, @CurrentUser() user: any) {
    const evaluation = await this.evaluationsService.findOne(id);
    await this.assertTeacherStudentAccess(user, evaluation.student?.id);
    return this.evaluationsService.update(id, updateEvaluationDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Eliminar una evaluación' })
  @ApiResponse({ status: 200, description: 'Evaluación eliminada exitosamente' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.evaluationsService.remove(id, user);
  }
}