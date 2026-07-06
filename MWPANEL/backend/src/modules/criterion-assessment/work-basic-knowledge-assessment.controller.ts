import { BadRequestException, Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { WorkBasicKnowledgeAssessmentService } from './services/work-basic-knowledge-assessment.service';
import { CriterionRollupService } from './services/criterion-rollup.service';
import { BulkWorkSaberDto } from './dto/work-saber.dto';

const VALID_WORK_TYPES = ['activity', 'task', 'test'];

@ApiTags('Evaluación por Saberes (trabajo)')
@Controller('work-basic-knowledge-assessment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkBasicKnowledgeAssessmentController {
  constructor(
    private readonly service: WorkBasicKnowledgeAssessmentService,
    private readonly rollup: CriterionRollupService,
  ) {}

  @Get('cell')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getCell(@Request() req: any, @Query('workId') workId: string, @Query('workType') workType: string, @Query('studentId') studentId: string) {
    if (!VALID_WORK_TYPES.includes(workType)) {
      throw new BadRequestException(`workType inválido: debe ser uno de ${VALID_WORK_TYPES.join('|')}`);
    }
    return this.service.getCell(req.user.id, req.user.role, workId, workType, studentId);
  }

  @Post('bulk')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async bulk(@Request() req: any, @Body() dto: BulkWorkSaberDto) {
    const res = await this.service.bulkUpsert(req.user.id, req.user.role, dto);
    let derived = 0;
    if (res.evaluationPeriodId && res.criterionIds.length) {
      derived = await this.rollup.rollupForStudentCriteria(
        dto.studentId, res.subjectAssignmentId, res.criterionIds, res.evaluationPeriodId, res.teacherId,
      );
    }
    return { saved: res.saved, derived };
  }
}
