import { Controller, Get, Post, Put, Query, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CriterionAssessmentService } from './services/criterion-assessment.service';
import { CriterionScaleConfigService } from './services/criterion-scale-config.service';
import { CompetencyValuationService } from './services/competency-valuation.service';
import { ApplicableCriteriaService } from './services/applicable-criteria.service';
import { LomloeGradeModeService } from './services/lomloe-grade-mode.service';
import { BulkAssessmentDto } from './dto/bulk-assessment.dto';
import { ScaleConfigDto } from './dto/scale-config.dto';
import { SetGradeModeDto } from './dto/grade-mode.dto';
import { TeacherAccessService } from '../../common/teacher-access/teacher-access.service';
import { FamilyAccessService } from '../../common/family-access/family-access.service';

@ApiTags('Evaluación por Criterios')
@Controller('criterion-assessment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CriterionAssessmentController {
  constructor(
    private readonly service: CriterionAssessmentService,
    private readonly scaleCfg: CriterionScaleConfigService,
    private readonly valuation: CompetencyValuationService,
    private readonly applicable: ApplicableCriteriaService,
    private readonly teacherAccess: TeacherAccessService,
    private readonly familyAccess: FamilyAccessService,
    private readonly gradeMode: LomloeGradeModeService,
  ) {}

  @Get('grid')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getGrid(@Request() req, @Query('subjectAssignmentId') saId: string, @Query('evaluationPeriodId') periodId: string) {
    return this.service.getGrid(req.user.id, req.user.role, saId, periodId);
  }

  @Post('bulk')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  bulk(@Request() req, @Body() dto: BulkAssessmentDto) {
    return this.service.bulkUpsert(req.user.id, req.user.role, dto);
  }

  @Get('scale-config')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getScale(@Request() req, @Query('subjectAssignmentId') saId: string) {
    await this.service.assertTeacherAssignment(req.user.id, req.user.role, saId);
    return this.scaleCfg.getEffectiveConfig(saId);
  }

  @Get('applicable')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getApplicable(@Request() req, @Query('subjectAssignmentId') saId: string) {
    await this.service.assertTeacherAssignment(req.user.id, req.user.role, saId);
    const { groups } = await this.applicable.getForAssignment(saId);
    return { groups };
  }

  @Put('scale-config')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async setScale(@Request() req, @Query('subjectAssignmentId') saId: string, @Body() dto: ScaleConfigDto) {
    await this.service.assertTeacherAssignment(req.user.id, req.user.role, saId);
    return this.scaleCfg.setConfig(saId, dto);
  }

  @Get('grade-mode')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getGradeMode(@Request() req, @Query('subjectAssignmentId') saId: string, @Query('gradePeriod') gradePeriod: string) {
    await this.service.assertTeacherAssignment(req.user.id, req.user.role, saId);
    return { mode: await this.gradeMode.getMode(saId, gradePeriod) };
  }

  @Put('grade-mode')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async setGradeMode(@Request() req, @Query('subjectAssignmentId') saId: string, @Query('gradePeriod') gradePeriod: string, @Body() dto: SetGradeModeDto) {
    await this.service.assertTeacherAssignment(req.user.id, req.user.role, saId);
    await this.gradeMode.setMode(saId, gradePeriod, dto.mode, req.user.id);
    return { mode: dto.mode };
  }

  @Get('student/:studentId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getStudent(@Request() req, @Param('studentId') studentId: string, @Query('subjectAssignmentId') saId: string, @Query('evaluationPeriodId') periodId: string) {
    await this.service.assertTeacherAssignment(req.user.id, req.user.role, saId);
    return this.service.getStudentMarks(studentId, saId, periodId);
  }

  @Get('valuation')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getValuation(@Request() req, @Query('subjectAssignmentId') saId: string, @Query('evaluationPeriodId') periodId: string, @Query('studentId') studentId: string) {
    await this.service.assertTeacherAssignment(req.user.id, req.user.role, saId);
    const resolvedPeriodId = await this.service.validatePeriodForAssignment(saId, periodId);
    return this.valuation.getValuation(studentId, saId, resolvedPeriodId);
  }

  @Get('valuation/student/:studentId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.STUDENT, UserRole.FAMILY)
  async getStudentValuation(
    @Request() req,
    @Param('studentId') studentId: string,
    @Query('evaluationPeriodId') periodId?: string,
  ) {
    const user = req.user;
    if (user.role === UserRole.STUDENT && user.studentId !== studentId) {
      throw new ForbiddenException('No tienes acceso a las competencias de este alumno');
    }
    if (user.role === UserRole.TEACHER) {
      const ok = await this.teacherAccess.canTeacherAccessStudent(user.id, studentId);
      if (!ok) throw new ForbiddenException('No tienes acceso a este alumno');
    }
    if (user.role === UserRole.FAMILY) {
      const ok = await this.familyAccess.canFamilyAccessStudent(user.id, studentId);
      if (!ok) throw new ForbiddenException('No tienes acceso a las competencias de este alumno');
    }
    return this.valuation.getStudentValuation(studentId, periodId);
  }
}
