import { Controller, Get, Post, Put, Delete, Query, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CriterionKnowledgeService } from './services/criterion-knowledge.service';
import { AiSuggestionService } from './services/ai-suggestion.service';
import { MapQueryDto, SuggestDto, UpdateLinkDto, CreateLinkDto } from './dto/criterion-knowledge.dto';
import { SuggestWorkTaggingDto } from './dto/work-tagging.dto';
import { CriterionKnowledgeStatus } from './entities/criterion-basic-knowledge.entity';

@ApiTags('Conexión curricular (criterios↔saberes)')
@Controller('criterion-knowledge')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CriterionKnowledgeController {
  constructor(
    private readonly service: CriterionKnowledgeService,
    private readonly ai: AiSuggestionService,
  ) {}

  @Get('scopes')
  @Roles(UserRole.ADMIN)
  getScopes(@Query('subjectName') subjectName: string) {
    return this.service.getScopesForSubject(subjectName);
  }

  @Get('map')
  @Roles(UserRole.ADMIN)
  getMap(@Query() q: MapQueryDto) {
    return this.service.getMapBySubject(q.subjectName, { scopeType: q.scopeType, scopeId: q.scopeId });
  }

  @Post('suggest')
  @Roles(UserRole.ADMIN)
  suggest(@Request() req, @Body() dto: SuggestDto) {
    return this.ai.suggestForSubject(dto.subjectName, { scopeType: dto.scopeType, scopeId: dto.scopeId }, req.user.id);
  }

  @Post('backfill-orphans')
  @Roles(UserRole.ADMIN)
  backfillOrphans(@Request() req) {
    return this.service.backfillOrphanCriteria(req.user.id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateLinkDto) {
    return dto.status === CriterionKnowledgeStatus.REJECTED
      ? this.service.reject(id, req.user.id)
      : this.service.confirm(id, req.user.id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  link(@Request() req, @Body() dto: CreateLinkDto) {
    return this.service.linkManual(dto.evaluationCriterionId, dto.basicKnowledgeId, req.user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  unlink(@Param('id') id: string) {
    return this.service.unlink(id);
  }

  @Get('criterion/:criterionId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getForCriterion(@Param('criterionId') criterionId: string) {
    return this.service.getConfirmedForCriterion(criterionId);
  }

  @Get('candidates/:criterionId')
  @Roles(UserRole.ADMIN)
  getCandidates(@Param('criterionId') criterionId: string) {
    return this.service.getCandidatesForLinking(criterionId);
  }

  @Post('work-tagging/suggest')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  suggestWorkTagging(@Body() dto: SuggestWorkTaggingDto) {
    const text = [dto.description, dto.rubricText].filter(Boolean).join('\n\n');
    return this.service.suggestSaberesForWork(dto.subjectAssignmentId, text);
  }
}
