import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { TeacherAccessService } from '../../../common/teacher-access/teacher-access.service';
import { FamilyAccessService } from '../../../common/family-access/family-access.service';
import { CurricularAdaptationService } from '../services/curricular-adaptation.service';
import { UpsertCurricularAdaptationDto, UpdateCurricularAdaptationDto } from '../dto/curricular-adaptation.dto';

@Controller('dua/curricular-adaptations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CurricularAdaptationController {
  constructor(
    private readonly service: CurricularAdaptationService,
    private readonly teacherAccess: TeacherAccessService,
    private readonly familyAccess: FamilyAccessService,
  ) {}

  @Post() @Roles(UserRole.ADMIN)
  upsert(@Request() req, @Body() dto: UpsertCurricularAdaptationDto) {
    return this.service.upsert({ ...dto, startDate: dto.startDate ? new Date(dto.startDate) : null, endDate: dto.endDate ? new Date(dto.endDate) : null }, req.user.id);
  }

  @Patch(':id') @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCurricularAdaptationDto) {
    return this.service.update(id, { ...dto, startDate: dto.startDate ? new Date(dto.startDate) : undefined, endDate: dto.endDate ? new Date(dto.endDate) : undefined } as any);
  }

  @Delete(':id') @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Get('student/:studentId') @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY, UserRole.STUDENT)
  async listForStudent(@Request() req, @Param('studentId') studentId: string, @Query('academicYearId') academicYearId?: string) {
    const user = req.user;
    if (user.role === UserRole.STUDENT && user.studentId !== studentId) throw new ForbiddenException('Sin acceso');
    if (user.role === UserRole.TEACHER && !(await this.teacherAccess.canTeacherAccessStudent(user.id, studentId))) throw new ForbiddenException('Sin acceso');
    if (user.role === UserRole.FAMILY && !(await this.familyAccess.canFamilyAccessStudent(user.id, studentId))) throw new ForbiddenException('Sin acceso');
    return this.service.listForStudent(studentId, academicYearId);
  }
}
