import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurriculumGenerationService } from './services/curriculum-generation.service';
import { CurriculumApplyService } from './services/curriculum-apply.service';
import { GenerateDto, SavePayloadDto, ListQueryDto } from './dto/curriculum-generation.dto';
import { GenerationScopeType } from './entities/curriculum-generation.entity';

@ApiTags('Generación curricular IA')
@Controller('curriculum-generation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CurriculumGenerationController {
  constructor(
    private readonly gen: CurriculumGenerationService,
    private readonly applier: CurriculumApplyService,
  ) {}

  @Post('generate')
  @Roles(UserRole.ADMIN)
  generate(@Request() req, @Body() dto: GenerateDto) {
    return this.gen.generate(dto.subjectName, dto.scopeType, dto.scopeId, req.user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  list(@Query() q: ListQueryDto) {
    return this.gen.list(q.subjectName, q.scopeType as GenerationScopeType, q.scopeId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  getOne(@Param('id') id: string) { return this.gen.getOne(id); }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  save(@Param('id') id: string, @Body() dto: SavePayloadDto) { return this.gen.saveEdited(id, dto.payload); }

  @Post(':id/apply')
  @Roles(UserRole.ADMIN)
  apply(@Request() req, @Param('id') id: string) { return this.applier.apply(id, req.user.id); }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  discard(@Param('id') id: string) { return this.gen.discard(id); }
}
