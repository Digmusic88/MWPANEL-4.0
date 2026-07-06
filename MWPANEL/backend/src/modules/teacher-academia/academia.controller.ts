import { Controller, Get, Post, Delete, Query, Body, Req, Res, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { forwardToSecretaria } from './academia-proxy.client';
import { AcademiaAccessService } from './academia-access.service';

@ApiTags('teacher-academia')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teacher/academia')
export class AcademiaController {
  constructor(private readonly access: AcademiaAccessService) {}

  private rawToken(req: any): string {
    const auth = req.headers['authorization'] || '';
    return auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  }
  private userId(req: any): string {
    return req.user?.sub || req.user?.id;
  }

  /** Reenvía y traduce: fallo de red → 502; el resto se propaga tal cual. */
  private async pass(
    res: Response, method: 'GET' | 'POST' | 'DELETE', path: string, token: string,
    opts: { query?: any; body?: any } = {},
  ) {
    let r: { status: number; body: any };
    try {
      r = await forwardToSecretaria(method, path, token, opts);
    } catch {
      return res.status(HttpStatus.BAD_GATEWAY).json({ message: 'No se pudo contactar con Secretaría' });
    }
    return res.status(r.status).json(r.body);
  }

  @Get('my-groups')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Grupos de academia (tarde) del profesor' })
  async myGroups(@Req() req: any, @Res() res: Response) {
    const userId = this.userId(req);
    await this.access.ensureTeacherAccess(userId);
    const teacherId = await this.access.resolveTeacherId(userId);
    if (!teacherId) return res.status(HttpStatus.OK).json({ hasAcademia: false, groups: [] });
    let r: { status: number; body: any };
    try {
      r = await forwardToSecretaria('GET', `secretaria/teachers/${teacherId}/panel`, this.rawToken(req));
    } catch {
      return res.status(HttpStatus.BAD_GATEWAY).json({ message: 'No se pudo contactar con Secretaría' });
    }
    if (r.status !== 200) return res.status(HttpStatus.OK).json({ hasAcademia: false, groups: [] });
    const groups = r.body?.groups || [];
    return res.status(HttpStatus.OK).json({ hasAcademia: groups.length > 0, groups });
  }

  // ---- Asistencia ----
  @Get('attendance/grid') @Roles(UserRole.TEACHER)
  async attGrid(@Req() req: any, @Res() res: Response,
    @Query('groupId') groupId: string, @Query('date') date: string, @Query('academicYearId') yearId?: string) {
    await this.access.ensureTeacherAccess(this.userId(req));
    return this.pass(res, 'GET', 'secretaria/attendance/grid', this.rawToken(req), { query: { groupId, date, academicYearId: yearId } });
  }

  @Post('attendance/save') @Roles(UserRole.TEACHER)
  async attSave(@Req() req: any, @Res() res: Response, @Body() body: any) {
    await this.access.ensureTeacherAccess(this.userId(req));
    return this.pass(res, 'POST', 'secretaria/attendance/save', this.rawToken(req), { body });
  }

  @Delete('attendance/day') @Roles(UserRole.TEACHER)
  async attDay(@Req() req: any, @Res() res: Response, @Query('groupId') groupId: string, @Query('date') date: string) {
    await this.access.ensureTeacherAccess(this.userId(req));
    return this.pass(res, 'DELETE', 'secretaria/attendance/day', this.rawToken(req), { query: { groupId, date } });
  }

  @Get('attendance/stats') @Roles(UserRole.TEACHER)
  async attStats(@Req() req: any, @Res() res: Response,
    @Query('from') from: string, @Query('to') to: string,
    @Query('groupId') groupId?: string, @Query('serviceId') serviceId?: string) {
    await this.access.ensureTeacherAccess(this.userId(req));
    return this.pass(res, 'GET', 'secretaria/attendance/stats', this.rawToken(req), { query: { from, to, groupId, serviceId } });
  }

  // ---- Tareas ----
  @Get('tareas/grid') @Roles(UserRole.TEACHER)
  async tarGrid(@Req() req: any, @Res() res: Response,
    @Query('groupId') groupId: string, @Query('date') date: string, @Query('academicYearId') yearId?: string) {
    await this.access.ensureTeacherAccess(this.userId(req));
    return this.pass(res, 'GET', 'secretaria/tareas/grid', this.rawToken(req), { query: { groupId, date, academicYearId: yearId } });
  }

  @Post('tareas/save') @Roles(UserRole.TEACHER)
  async tarSave(@Req() req: any, @Res() res: Response, @Body() body: any) {
    await this.access.ensureTeacherAccess(this.userId(req));
    return this.pass(res, 'POST', 'secretaria/tareas/save', this.rawToken(req), { body });
  }

  @Delete('tareas/day') @Roles(UserRole.TEACHER)
  async tarDay(@Req() req: any, @Res() res: Response, @Query('groupId') groupId: string, @Query('date') date: string) {
    await this.access.ensureTeacherAccess(this.userId(req));
    return this.pass(res, 'DELETE', 'secretaria/tareas/day', this.rawToken(req), { query: { groupId, date } });
  }

  // ---- Horario (franjas de tarde) ----
  @Get('schedule') @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Franjas horarias de academia (tarde) del profesor' })
  async schedule(@Req() req: any, @Res() res: Response,
    @Query('academicYearId') academicYearId?: string, @Query('groupId') groupId?: string) {
    await this.access.ensureTeacherAccess(this.userId(req));
    return this.pass(res, 'GET', 'secretaria/schedule', this.rawToken(req), { query: { academicYearId, groupId } });
  }
}
