import { Controller, Get, Post, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { BasicKnowledgeAssessmentService } from './services/basic-knowledge-assessment.service';
import { BulkSaberDto } from './dto/bulk-saber.dto';

@ApiTags('Evaluación por Saberes')
@Controller('basic-knowledge-assessment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BasicKnowledgeAssessmentController {
  constructor(private readonly service: BasicKnowledgeAssessmentService) {}

  @Get('grid')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getGrid(@Request() req, @Query('subjectAssignmentId') saId: string, @Query('evaluationPeriodId') periodId: string) {
    return this.service.getGrid(req.user.id, req.user.role, saId, periodId);
  }

  @Post('bulk')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  bulk(@Request() req, @Body() dto: BulkSaberDto) {
    return this.service.bulkUpsert(req.user.id, req.user.role, dto);
  }
}
