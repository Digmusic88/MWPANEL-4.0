import { Controller, Get, Post, Body, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { StudentReportService } from './services/student-report.service';
import { GenerateReportDto } from './dto/generate-report.dto';

@Controller('student-reports/auto')
@UseGuards(JwtAuthGuard)
export class StudentReportGeneratorController {
  constructor(private readonly service: StudentReportService) {}

  @Get('options')
  options(@Query('studentId') studentId: string, @CurrentUser() user: User) {
    return this.service.getOptions(studentId, user.id, user.role);
  }

  @Post('generate')
  generate(@Body() dto: GenerateReportDto, @CurrentUser() user: User) {
    return this.service.generate(dto, user.id, user.role);
  }

  @Post('generate/pdf')
  async pdf(@Body() dto: GenerateReportDto, @CurrentUser() user: User, @Res() res: Response) {
    const buffer = await this.service.generatePdf(dto, user.id, user.role);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="informe-${dto.studentId}.pdf"`, 'Content-Length': String(buffer.length) });
    res.end(buffer);
  }
}
