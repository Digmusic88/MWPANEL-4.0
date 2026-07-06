import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CriterionBasicKnowledge } from './entities/criterion-basic-knowledge.entity';
import { EvaluationCriterion } from '../competencies/entities/evaluation-criterion.entity';
import { SpecificCompetency } from '../competencies/entities/specific-competency.entity';
import { BasicKnowledge } from '../competencies/entities/basic-knowledge.entity';
import { Subject } from '../students/entities/subject.entity';
import { Course } from '../students/entities/course.entity';
import { Cycle } from '../students/entities/cycle.entity';
import { SystemSetting } from '../settings/entities/system-setting.entity';
import { CandidatePoolService } from './services/candidate-pool.service';
import { AiSuggestionService } from './services/ai-suggestion.service';
import { CriterionKnowledgeService } from './services/criterion-knowledge.service';
import { CriterionKnowledgeController } from './criterion-knowledge.controller';
import { CriterionAssessmentModule } from '../criterion-assessment/criterion-assessment.module';

@Module({
  imports: [TypeOrmModule.forFeature([
    CriterionBasicKnowledge, EvaluationCriterion, SpecificCompetency, BasicKnowledge, Subject, Course, Cycle, SystemSetting,
  ]), CriterionAssessmentModule],
  providers: [CandidatePoolService, AiSuggestionService, CriterionKnowledgeService],
  controllers: [CriterionKnowledgeController],
  exports: [CandidatePoolService, AiSuggestionService, CriterionKnowledgeService],
})
export class CriterionKnowledgeModule {}
