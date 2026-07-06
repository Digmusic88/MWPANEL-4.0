import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicRecordsController } from './academic-records.controller';
import { AcademicRecordsService } from './academic-records.service';
import { AcademicRecordsSyncService } from './services/academic-records-sync.service';
import { ReportGeneratorService } from './services/report-generator.service';
import { ExpedienteBuilderService } from './services/expediente-builder.service';
import { LomloeProgressService } from './services/lomloe-progress.service';
import {
  AcademicRecord,
  AcademicRecordEntry,
  AcademicRecordGrade
} from './entities';
import { Student } from '../students/entities/student.entity';
import { AcademicYear as AcademicYearEntity } from '../students/entities/academic-year.entity';
import { CentralizedGrade } from '../grades/entities/centralized-grade.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { EvaluationPeriod } from '../evaluations/entities/evaluation-period.entity';
import { ActivityAssessment } from '../activities/entities/activity-assessment.entity';
import { TaskSubmission } from '../tasks/entities/task-submission.entity';
import { ExamGrade } from '../tasks/entities/exam-grade.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { SettingsModule } from '../settings/settings.module';
import { TeacherAccessModule } from '../../common/teacher-access/teacher-access.module';
import { FamilyAccessModule } from '../../common/family-access/family-access.module';
import { CriterionAssessmentModule } from '../criterion-assessment/criterion-assessment.module';
import { DuaModule } from '../dua/dua.module';
import { CriterionAssessment } from '../criterion-assessment/entities/criterion-assessment.entity';
import { BasicKnowledgeAssessment } from '../criterion-assessment/entities/basic-knowledge-assessment.entity';
import { EvaluationCriterion } from '../competencies/entities/evaluation-criterion.entity';
import { BasicKnowledge } from '../competencies/entities/basic-knowledge.entity';
import { CriterionBasicKnowledge } from '../criterion-knowledge/entities/criterion-basic-knowledge.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AcademicRecord,
      AcademicRecordEntry,
      AcademicRecordGrade,
      Student,
      AcademicYearEntity,
      CentralizedGrade,
      SubjectAssignment,
      EvaluationPeriod,
      ActivityAssessment,
      TaskSubmission,
      ExamGrade,
      AttendanceRecord,
      CriterionAssessment,
      BasicKnowledgeAssessment,
      EvaluationCriterion,
      BasicKnowledge,
      CriterionBasicKnowledge,
    ]),
    SettingsModule,
    TeacherAccessModule,
    FamilyAccessModule,
    forwardRef(() => CriterionAssessmentModule),
    DuaModule,
  ],
  controllers: [AcademicRecordsController],
  providers: [AcademicRecordsService, AcademicRecordsSyncService, ReportGeneratorService, ExpedienteBuilderService, LomloeProgressService],
  exports: [AcademicRecordsService, AcademicRecordsSyncService, ReportGeneratorService, ExpedienteBuilderService, LomloeProgressService],
})
export class AcademicRecordsModule {}