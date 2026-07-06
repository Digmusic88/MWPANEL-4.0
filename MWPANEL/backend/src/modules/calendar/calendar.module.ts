import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import {
  CalendarEvent,
  CalendarEventGroup,
  CalendarEventSubject,
  CalendarEventStudent,
  CalendarEventReminder,
} from './entities';
import { User } from '../users/entities/user.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Student } from '../students/entities/student.entity';
import { Family, FamilyStudent } from '../users/entities/family.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CalendarEvent,
      CalendarEventGroup,
      CalendarEventSubject,
      CalendarEventStudent,
      CalendarEventReminder,
      User,
      Teacher,
      Student,
      Family,
      FamilyStudent,
      SubjectAssignment,
    ]),
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}