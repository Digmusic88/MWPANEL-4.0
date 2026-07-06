import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurriculumGeneration } from './entities/curriculum-generation.entity';
import { Cycle } from '../students/entities/cycle.entity';
import { Course } from '../students/entities/course.entity';
import { SystemSetting } from '../settings/entities/system-setting.entity';
import { SpecificCompetency } from '../competencies/entities/specific-competency.entity';
import { EvaluationCriterion } from '../competencies/entities/evaluation-criterion.entity';
import { BasicKnowledge } from '../competencies/entities/basic-knowledge.entity';
import { Subject } from '../students/entities/subject.entity';
import { Competency } from '../competencies/entities/competency.entity';
import { DecreeLoaderService } from './services/decree-loader.service';
import { CurriculumPromptService } from './services/curriculum-prompt.service';
import { CurriculumGenerationService } from './services/curriculum-generation.service';
import { CurriculumApplyService } from './services/curriculum-apply.service';
import { CurriculumGenerationController } from './curriculum-generation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CurriculumGeneration, Cycle, Course, SystemSetting, SpecificCompetency, EvaluationCriterion, BasicKnowledge, Subject, Competency])],
  providers: [DecreeLoaderService, CurriculumPromptService, CurriculumGenerationService, CurriculumApplyService],
  controllers: [CurriculumGenerationController],
  exports: [DecreeLoaderService, CurriculumPromptService, CurriculumGenerationService, CurriculumApplyService],
})
export class CurriculumGenerationModule {}
