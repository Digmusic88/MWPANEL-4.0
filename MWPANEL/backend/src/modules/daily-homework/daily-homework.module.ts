import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyHomeworkService } from './daily-homework.service';
import { DailyHomeworkController } from './daily-homework.controller';
import { DailyHomeworkRecord } from './entities/daily-homework-record.entity';
import { DailyHomeworkNotification } from './entities/daily-homework-notification.entity';
import { HomeworkSubject } from './entities/homework-subject.entity';
import { HomeworkActivity } from './entities/homework-activity.entity';
import { HomeworkActivityRecord } from './entities/homework-activity-record.entity';
import { HomeworkService } from './homework.service';
import { HomeworkController } from './homework.controller';
import { ClassGroup } from '../students/entities/class-group.entity';
import { Student } from '../students/entities/student.entity';
import { Family, FamilyStudent } from '../users/entities/family.entity';
import { User } from '../users/entities/user.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { Notification } from '../communications/entities/notification.entity';
import { FamilyAlert } from '../families/entities/family-alert.entity';
import { CommunicationsModule } from '../communications/communications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DailyHomeworkRecord,
      DailyHomeworkNotification,
      HomeworkSubject,
      HomeworkActivity,
      HomeworkActivityRecord,
      ClassGroup,
      Student,
      Family,
      FamilyStudent,
      User,
      Teacher,
      SubjectAssignment,
      Notification,
      FamilyAlert,
    ]),
    CommunicationsModule,
  ],
  controllers: [DailyHomeworkController, HomeworkController],
  providers: [DailyHomeworkService, HomeworkService],
  exports: [DailyHomeworkService, HomeworkService],
})
export class DailyHomeworkModule {}
