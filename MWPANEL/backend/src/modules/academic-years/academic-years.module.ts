import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicYearsController } from './academic-years.controller';
import { AcademicYear } from '../students/entities/academic-year.entity';
import { CurrentAcademicYearService } from './current-academic-year.service';
import { AcademicYearStampSubscriber } from './academic-year-stamp.subscriber';
import { ArchivedYearGuardSubscriber } from './archived-year-guard.subscriber';
import { AcademicYearClosureService } from './services/academic-year-closure.service';
import { YearStructureRolloverService } from './services/year-structure-rollover.service';
import { AcademicRecordsModule } from '../academic-records/academic-records.module';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicYear]), AcademicRecordsModule],
  controllers: [AcademicYearsController],
  providers: [
    CurrentAcademicYearService,
    AcademicYearStampSubscriber,
    ArchivedYearGuardSubscriber,
    AcademicYearClosureService,
    YearStructureRolloverService,
  ],
  exports: [CurrentAcademicYearService],
})
export class AcademicYearsModule {}