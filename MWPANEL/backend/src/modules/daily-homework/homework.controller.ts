import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { HomeworkService } from './homework.service';
import { HwRecordStatus } from './entities/homework-activity-record.entity';

@ApiTags('homework')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('homework')
export class HomeworkController {
  constructor(private readonly svc: HomeworkService) {}

  // TEACHER - PENDING SUMMARY (badge counts)
  @Get('subjects/pending-summary') @Roles(UserRole.TEACHER) @ApiOperation({ summary: 'Conteo de pendientes por asignatura' })
  getPendingSummary(@Request() req: any) { return this.svc.getSubjectPendingSummary(req.user.sub || req.user.id); }

  // TEACHER - SUBJECTS
  @Get('subjects') @Roles(UserRole.TEACHER) @ApiOperation({ summary: 'Mis asignaturas' })
  getSubjects(@Request() req: any) { return this.svc.getMySubjects(req.user.sub || req.user.id); }

  @Post('subjects') @Roles(UserRole.TEACHER) @ApiOperation({ summary: 'Crear asignatura' })
  createSubject(@Body() body: { name: string; color: string }, @Request() req: any) {
    return this.svc.createSubject(body, req.user.sub || req.user.id);
  }

  @Patch('subjects/:id') @Roles(UserRole.TEACHER)
  updateSubject(@Param('id') id: string, @Body() body: { name?: string; color?: string }, @Request() req: any) {
    return this.svc.updateSubject(id, body, req.user.sub || req.user.id);
  }

  @Delete('subjects/:id') @Roles(UserRole.TEACHER)
  deleteSubject(@Param('id') id: string, @Request() req: any) {
    return this.svc.deleteSubject(id, req.user.sub || req.user.id);
  }

  // TEACHER - STUDENTS IN SUBJECT
  @Get('subjects/:id/students') @Roles(UserRole.TEACHER)
  getStudents(@Param('id') id: string, @Request() req: any) {
    return this.svc.getSubjectStudents(id, req.user.sub || req.user.id);
  }

  @Post('subjects/:id/students') @Roles(UserRole.TEACHER)
  setStudents(@Param('id') id: string, @Body() body: { studentIds: string[] }, @Request() req: any) {
    return this.svc.setSubjectStudents(id, body.studentIds, req.user.sub || req.user.id);
  }

  // TEACHER - SEARCH ALL STUDENTS
  @Get('students/search') @Roles(UserRole.TEACHER)
  searchStudents(@Query('q') q: string) { return this.svc.searchAllStudents(q || ''); }

  // TEACHER - GRID
  @Get('subjects/:id/grid') @Roles(UserRole.TEACHER)
  getGrid(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) { return this.svc.getSubjectGrid(id, startDate, endDate, req.user.sub || req.user.id); }

  // TEACHER - ACTIVITIES
  @Post('subjects/:id/activities') @Roles(UserRole.TEACHER)
  createActivity(@Param('id') id: string, @Body() body: { name: string; date: string; description?: string }, @Request() req: any) {
    return this.svc.createActivity(id, body, req.user.sub || req.user.id);
  }

  @Patch('activities/:id') @Roles(UserRole.TEACHER)
  updateActivity(@Param('id') id: string, @Body() body: { name?: string; description?: string }, @Request() req: any) {
    return this.svc.updateActivity(id, body, req.user.sub || req.user.id);
  }

  @Delete('activities/:id') @Roles(UserRole.TEACHER)
  deleteActivity(@Param('id') id: string, @Request() req: any) {
    return this.svc.deleteActivity(id, req.user.sub || req.user.id);
  }

  // TEACHER - RECORDS
  @Post('activities/:activityId/records/:studentId') @Roles(UserRole.TEACHER)
  upsertRecord(
    @Param('activityId') activityId: string,
    @Param('studentId') studentId: string,
    @Body() body: { status: HwRecordStatus; notes?: string },
    @Request() req: any,
  ) { return this.svc.upsertActivityRecord(activityId, studentId, body.status, body.notes ?? null, req.user.sub || req.user.id); }

  @Delete('activity-records/:id') @Roles(UserRole.TEACHER)
  deleteRecord(@Param('id') id: string, @Request() req: any) {
    return this.svc.deleteActivityRecord(id, req.user.sub || req.user.id);
  }

  // FAMILY
  @Get('family/subjects') @Roles(UserRole.FAMILY)
  getFamilySubjects(@Query('studentId') studentId: string, @Request() req: any) {
    return this.svc.getFamilySubjects(studentId, req.user.sub || req.user.id);
  }

  @Get('family/subjects/:id/grid') @Roles(UserRole.FAMILY)
  getFamilyGrid(
    @Param('id') id: string,
    @Query('studentId') studentId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) { return this.svc.getFamilySubjectGrid(id, studentId, startDate, endDate, req.user.sub || req.user.id); }
}
