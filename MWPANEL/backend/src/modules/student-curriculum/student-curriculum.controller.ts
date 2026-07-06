import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { TeacherAccessService } from '../../common/teacher-access/teacher-access.service';
import { StudentCurriculumService } from './student-curriculum.service';
import { ChangeBlockDto } from './dto/change-block.dto';
import { AddCourseDto, RemoveCourseDto } from './dto/course-op.dto';

@ApiTags('Student Curriculum')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('student-curriculum')
export class StudentCurriculumController {
  constructor(
    private readonly svc: StudentCurriculumService,
    private readonly access: TeacherAccessService,
  ) {}

  private async assertAccess(req: any, studentId: string, subjectId: string) {
    if (req.user.role === UserRole.ADMIN) return;
    const ok = await this.access.canTeacherAccessStudentForSubject(req.user.id, studentId, subjectId);
    if (!ok) throw new ForbiddenException('No tienes acceso a esta asignatura de este alumno');
  }

  @Get('audit')
  @Roles(UserRole.ADMIN)
  async audit(@Query('studentId') studentId?: string, @Query('subjectId') subjectId?: string) {
    return this.svc.getAuditLog({ studentId, subjectId });
  }

  @Get(':studentId/:subjectId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async get(@Param('studentId') studentId: string, @Param('subjectId') subjectId: string, @Query('academicYearId') academicYearId: string, @Request() req) {
    if (!academicYearId) throw new BadRequestException('academicYearId requerido');
    await this.assertAccess(req, studentId, subjectId);
    return this.svc.getSubjectCurriculum(studentId, subjectId, academicYearId);
  }

  @Post(':studentId/:subjectId/change-block')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async changeBlock(@Param('studentId') studentId: string, @Param('subjectId') subjectId: string, @Body() dto: ChangeBlockDto, @Request() req) {
    await this.assertAccess(req, studentId, subjectId);
    return this.svc.changeBlock({ ...dto, studentId, subjectId }, req.user.id);
  }

  @Post(':studentId/:subjectId/courses')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async addCourse(@Param('studentId') studentId: string, @Param('subjectId') subjectId: string, @Body() dto: AddCourseDto, @Request() req) {
    await this.assertAccess(req, studentId, subjectId);
    return this.svc.addCourse({ ...dto, studentId, subjectId }, req.user.id);
  }

  @Delete(':studentId/:subjectId/courses/:courseId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async removeCourse(@Param('studentId') studentId: string, @Param('subjectId') subjectId: string, @Param('courseId') courseId: string, @Body() dto: RemoveCourseDto, @Request() req) {
    await this.assertAccess(req, studentId, subjectId);
    return this.svc.removeCourse({ ...dto, studentId, subjectId, courseId }, req.user.id);
  }
}
