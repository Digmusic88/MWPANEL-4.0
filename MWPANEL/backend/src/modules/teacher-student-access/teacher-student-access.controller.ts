import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { TeacherStudentAccessService } from './teacher-student-access.service';
import {
  CreateAccessDto,
  UpdateAccessDto,
  QueryAccessDto,
  BulkAssignAllDto,
  BulkAssignDto,
} from './dto/teacher-student-access.dto';

@Controller('teacher-student-access')
export class TeacherStudentAccessController {
  constructor(private readonly service: TeacherStudentAccessService) {}

  @Get('options/access-types')
  @Roles(UserRole.ADMIN)
  getAccessTypes() {
    return { data: this.service.getAccessTypes() };
  }

  @Get('options/reasons')
  @Roles(UserRole.ADMIN)
  getAccessReasons() {
    return { data: this.service.getAccessReasons() };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateAccessDto, @Request() req: any) {
    const data = await this.service.create(dto, req.user?.id);
    return { data };
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(@Query() query: QueryAccessDto) {
    const data = await this.service.findAll(query);
    return { data };
  }

  @Get('by-teacher/:teacherId')
  @Roles(UserRole.ADMIN)
  async findByTeacher(
    @Param('teacherId') teacherId: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const data = await this.service.findByTeacher(
      teacherId,
      academicYearId,
      activeOnly !== 'false',
    );
    return { data };
  }

  @Get('by-student/:studentId')
  @Roles(UserRole.ADMIN)
  async findByStudent(
    @Param('studentId') studentId: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const data = await this.service.findByStudent(
      studentId,
      academicYearId,
      activeOnly !== 'false',
    );
    return { data };
  }

  @Post('bulk-assign')
  @Roles(UserRole.ADMIN)
  async bulkAssign(@Body() dto: BulkAssignDto, @Request() req: any) {
    const data = await this.service.bulkAssign(dto, req.user?.id);
    return { data };
  }

  @Post('bulk-assign-all')
  @Roles(UserRole.ADMIN)
  async bulkAssignAll(@Body() dto: BulkAssignAllDto, @Request() req: any) {
    const data = await this.service.bulkAssignToAll(dto, req.user?.id);
    return { data };
  }

  @Post('copy-to-year')
  @Roles(UserRole.ADMIN)
  async copyToYear(
    @Body() body: { fromAcademicYearId: string; toAcademicYearId: string },
  ) {
    const data = await this.service.copyToNewYear(
      body.fromAcademicYearId,
      body.toAcademicYearId,
    );
    return { data };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id') id: string) {
    const data = await this.service.findOne(id);
    return { data };
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  async deactivate(@Param('id') id: string) {
    const data = await this.service.deactivate(id);
    return { data };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateAccessDto) {
    const data = await this.service.update(id, dto);
    return { data };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
    return { message: 'Acceso eliminado correctamente' };
  }
}
