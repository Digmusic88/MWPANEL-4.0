import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';
import { TeacherAccessModule } from '../../common/teacher-access/teacher-access.module';
import { FamilyAccessModule } from '../../common/family-access/family-access.module';
import { AcademicYearsModule } from '../academic-years/academic-years.module';
import { CentralizedGradesController } from './controllers/centralized-grades.controller';
import { GradeConfigurationController } from './controllers/grade-configuration.controller';
import { UnifiedGradingProductionController } from './controllers/unified-grading-production.controller';
import { CentralizedGradesService } from './services/centralized-grades.service';
import { GradeConfigurationService } from './services/grade-configuration.service';
import { GradeReportsService } from './services/grade-reports.service';
import { AIInsightsService } from './services/ai-insights.service';
import { GradeSchedulerService } from './services/grade-scheduler.service';
import { CentralizedGrade } from './entities/centralized-grade.entity';
import { GradeConfiguration } from './entities/grade-configuration.entity';
import { GradingScale } from './entities/grading-scale.entity';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Subject } from '../students/entities/subject.entity';
import { Course } from '../students/entities/course.entity';
import { EducationalLevel } from '../students/entities/educational-level.entity';
import { TaskSubmission } from '../tasks/entities/task-submission.entity';
import { ExamGrade } from '../tasks/entities/exam-grade.entity';
import { ActivityAssessment } from '../activities/entities/activity-assessment.entity';
import { CompetencyEvaluation } from '../evaluations/entities/competency-evaluation.entity';
import { RubricAssessment } from '../activities/entities/rubric-assessment.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { CriterionAssessment } from '../criterion-assessment/entities/criterion-assessment.entity';
import { EvaluationPeriod } from '../evaluations/entities/evaluation-period.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { FamilyStudent } from '../users/entities/family.entity';
import { Family } from '../users/entities/family.entity';
import { HuggingFaceMCPService } from '../../services/ai/huggingface-mcp.service';
import { CriterionAssessmentModule } from '../criterion-assessment/criterion-assessment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Nuevas entidades centralizadas
      CentralizedGrade,
      GradeConfiguration,
      // Entidades del sistema unificado
      GradingScale,
      // Entidades existentes
      Student,
      Teacher,
      Subject,
      Course,
      EducationalLevel,
      TaskSubmission,
      ExamGrade,
      ActivityAssessment,
      CompetencyEvaluation,
      RubricAssessment,
      Evaluation,
      SubjectAssignment,
      ClassGroup,
      FamilyStudent,
      Family,
      CriterionAssessment,
      EvaluationPeriod,
    ]),
    TeacherAccessModule,
    FamilyAccessModule,
    AcademicYearsModule,
    CriterionAssessmentModule,
  ],
  controllers: [
    GradesController,
    CentralizedGradesController,
    GradeConfigurationController,
    UnifiedGradingProductionController,
  ],
  providers: [
    GradesService,
    CentralizedGradesService,
    GradeConfigurationService,
    GradeReportsService,
    AIInsightsService,
    GradeSchedulerService,
    HuggingFaceMCPService,
  ],
  exports: [
    GradesService,
    CentralizedGradesService,
  ],
})
export class GradesModule {}