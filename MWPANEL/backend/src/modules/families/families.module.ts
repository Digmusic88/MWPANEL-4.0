import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { FamiliesController } from './families.controller';
import { FamiliesService } from './families.service';
import { UsersModule } from '../users/users.module';
import { GradesModule } from '../grades/grades.module';
import { TasksModule } from '../tasks/tasks.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { CommunicationsModule } from '../communications/communications.module';
import { Family, FamilyStudent } from '../users/entities/family.entity';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Student } from '../students/entities/student.entity';
import { FamilyAlert } from './entities/family-alert.entity';
import { FamilyNotificationPreferences } from './entities/family-notification-preferences.entity';
import { FamilyEmailLog } from './entities/family-email-log.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskSubmission } from '../tasks/entities/task-submission.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { FamilyAlertsService } from './services/family-alerts.service';
import { FamilyEmailNotificationsService } from './services/family-email-notifications.service';
import { FamilyNotificationPreferencesService } from './services/family-notification-preferences.service';
import { FamilyAlertsController } from './controllers/family-alerts.controller';
import { FamilyNotificationPreferencesController } from './controllers/family-notification-preferences.controller';
import { EmailNotification } from '../communications/entities/email-notification.entity';
import { EmailTemplate } from '../communications/entities/email-template.entity';
import { EmailAutomation } from '../communications/entities/email-automation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Family,
      FamilyStudent,
      User,
      UserProfile,
      Student,
      FamilyAlert,
      FamilyNotificationPreferences,
      FamilyEmailLog,
      Task,
      TaskSubmission,
      AttendanceRecord,
      EmailNotification,
      EmailTemplate,
      EmailAutomation,
    ]),
    ScheduleModule.forRoot(),
    forwardRef(() => UsersModule),
    forwardRef(() => GradesModule),
    forwardRef(() => TasksModule),
    forwardRef(() => AttendanceModule),
    forwardRef(() => CommunicationsModule)
  ],
  controllers: [FamilyAlertsController, FamilyNotificationPreferencesController, FamiliesController],
  providers: [FamiliesService, FamilyAlertsService, FamilyEmailNotificationsService, FamilyNotificationPreferencesService],
  exports: [FamiliesService, FamilyAlertsService, TypeOrmModule],
})
export class FamiliesModule {}