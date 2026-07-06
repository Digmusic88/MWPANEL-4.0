import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { Classroom } from '../students/entities/classroom.entity';
import { TimeSlot } from '../students/entities/time-slot.entity';
import { ScheduleSession } from '../students/entities/schedule-session.entity';
import { AcademicCalendar } from '../students/entities/academic-calendar.entity';
import { EducationalLevel } from '../students/entities/educational-level.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { AcademicYear } from '../students/entities/academic-year.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Classroom,
      TimeSlot,
      ScheduleSession,
      AcademicCalendar,
      EducationalLevel,
      SubjectAssignment,
      AcademicYear,
    ]),
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}