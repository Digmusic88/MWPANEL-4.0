import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';
import { Evaluation } from './entities/evaluation.entity';
import { EvaluationPeriod } from './entities/evaluation-period.entity';
import { CompetencyEvaluation } from './entities/competency-evaluation.entity';
import { RadarEvaluation } from './entities/radar-evaluation.entity';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Subject } from '../students/entities/subject.entity';
import { AcademicYear } from '../students/entities/academic-year.entity';
import { Competency } from '../competencies/entities/competency.entity';
import { TeacherAccessModule } from '../../common/teacher-access/teacher-access.module';
import { FamilyAccessModule } from '../../common/family-access/family-access.module';
import { AcademicRecordsModule } from '../academic-records/academic-records.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Evaluation,
      EvaluationPeriod,
      CompetencyEvaluation,
      RadarEvaluation,
      Student,
      Teacher,
      Subject,
      AcademicYear,
      Competency,
    ]),
    TeacherAccessModule,
    FamilyAccessModule,
    AcademicRecordsModule,
  ],
  controllers: [EvaluationsController],
  providers: [EvaluationsService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}