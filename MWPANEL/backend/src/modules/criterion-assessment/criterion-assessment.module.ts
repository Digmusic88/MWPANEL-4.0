import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CriterionAssessment } from './entities/criterion-assessment.entity';
import { CriterionScaleConfig } from './entities/criterion-scale-config.entity';
import { SubjectLomloeGradeMode } from './entities/subject-lomloe-grade-mode.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { Subject } from '../students/entities/subject.entity';
import { SpecificCompetency } from '../competencies/entities/specific-competency.entity';
import { EvaluationCriterion } from '../competencies/entities/evaluation-criterion.entity';
import { SettingsModule } from '../settings/settings.module';
import { TeacherAccessModule } from '../../common/teacher-access/teacher-access.module';
import { FamilyAccessModule } from '../../common/family-access/family-access.module';
import { CriterionNormalizationService } from './services/criterion-normalization.service';
import { ApplicableCriteriaService } from './services/applicable-criteria.service';
import { CriterionScaleConfigService } from './services/criterion-scale-config.service';
import { CriterionAssessmentService } from './services/criterion-assessment.service';
import { CompetencyValuationService } from './services/competency-valuation.service';
import { CriterionAssessmentController } from './criterion-assessment.controller';
import { EvaluationPeriod } from '../evaluations/entities/evaluation-period.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskSubmission } from '../tasks/entities/task-submission.entity';
import { ExamGrade } from '../tasks/entities/exam-grade.entity';
import { Activity } from '../activities/entities/activity.entity';
import { ActivityAssessment } from '../activities/entities/activity-assessment.entity';
import { CriterionDerivationService } from './services/criterion-derivation.service';
import { LomloeGradeModeService } from './services/lomloe-grade-mode.service';
import { BasicKnowledgeAssessment } from './entities/basic-knowledge-assessment.entity';
import { CriterionBasicKnowledge } from '../criterion-knowledge/entities/criterion-basic-knowledge.entity';
import { BasicKnowledge } from '../competencies/entities/basic-knowledge.entity';
import { WorkBasicKnowledgeAssessment } from './entities/work-basic-knowledge-assessment.entity';
import { BasicKnowledgeAssessmentService } from './services/basic-knowledge-assessment.service';
import { BasicKnowledgeAssessmentController } from './basic-knowledge-assessment.controller';
import { WorkBasicKnowledgeAssessmentService } from './services/work-basic-knowledge-assessment.service';
import { CriterionRollupService } from './services/criterion-rollup.service';
import { WorkBasicKnowledgeAssessmentController } from './work-basic-knowledge-assessment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CriterionAssessment, CriterionScaleConfig, SubjectAssignment, Subject, SpecificCompetency, EvaluationCriterion, EvaluationPeriod, Task, TaskSubmission, ExamGrade, Activity, ActivityAssessment, SubjectLomloeGradeMode, BasicKnowledgeAssessment, CriterionBasicKnowledge, BasicKnowledge, WorkBasicKnowledgeAssessment]),
    SettingsModule,
    TeacherAccessModule,
    FamilyAccessModule,
  ],
  providers: [CriterionNormalizationService, ApplicableCriteriaService, CriterionScaleConfigService, CriterionAssessmentService, CompetencyValuationService, CriterionDerivationService, LomloeGradeModeService, BasicKnowledgeAssessmentService, WorkBasicKnowledgeAssessmentService, CriterionRollupService],
  controllers: [CriterionAssessmentController, BasicKnowledgeAssessmentController, WorkBasicKnowledgeAssessmentController],
  exports: [CriterionAssessmentService, ApplicableCriteriaService, CompetencyValuationService, CriterionDerivationService, LomloeGradeModeService, WorkBasicKnowledgeAssessmentService, CriterionRollupService],
})
export class CriterionAssessmentModule {}
