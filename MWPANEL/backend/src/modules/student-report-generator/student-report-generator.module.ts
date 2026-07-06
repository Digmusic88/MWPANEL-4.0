import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradesModule } from '../grades/grades.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { EvaluationsModule } from '../evaluations/evaluations.module';
import { CompetenciesModule } from '../competencies/competencies.module';
import { DuaModule } from '../dua/dua.module';
import { StudentsModule } from '../students/students.module';
import { StudentReportsModule } from '../student-reports/student-reports.module';
import { CriterionAssessmentModule } from '../criterion-assessment/criterion-assessment.module';
import { AcademicRecordsModule } from '../academic-records/academic-records.module';
import { Student } from '../students/entities/student.entity';
import { AcademicYear } from '../students/entities/academic-year.entity';
import { StudentReportDataCollector } from './services/student-report-data.collector';
import { StudentReportMetricsEngine } from './services/student-report-metrics.engine';
import { StudentReportNarrativeService } from './services/student-report-narrative.service';
import { StudentReportPdfService } from './services/student-report-pdf.service';
import { StudentReportService } from './services/student-report.service';
import { StudentReportGeneratorController } from './student-report-generator.controller';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Student, AcademicYear]), GradesModule, AttendanceModule, EvaluationsModule, CompetenciesModule, DuaModule, StudentsModule, StudentReportsModule, CriterionAssessmentModule, AcademicRecordsModule],
  providers: [StudentReportDataCollector, StudentReportMetricsEngine, StudentReportNarrativeService, StudentReportPdfService, StudentReportService],
  controllers: [StudentReportGeneratorController],
})
export class StudentReportGeneratorModule {}
