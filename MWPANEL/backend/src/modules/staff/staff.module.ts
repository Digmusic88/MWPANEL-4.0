/**
 * @archivo: staff.module.ts
 * @modulo: Staff (Claustro)
 * @funcion: Modulo principal para gestion de tareas y reuniones del claustro
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import {
  StaffTask,
  StaffTaskAssignment,
  StaffTaskComment,
  StaffTaskAttachment,
  StaffTaskHistory,
  StaffMeeting,
  StaffMeetingAgenda,
  StaffTag,
} from './entities';

// User entity for relations
import { User } from '../users/entities/user.entity';

// External modules
import { CommunicationsModule } from '../communications/communications.module';

// Services
import { StaffTasksService } from './services/staff-tasks.service';
import { StaffMeetingsService } from './services/staff-meetings.service';
import { StaffTagsService } from './services/staff-tags.service';
import { StaffMeetingAutoCloseService } from './services/staff-meeting-autoclose.service';
import { StaffMeetingRemindersService } from './services/staff-meeting-reminders.service';

// Controllers
import { StaffTasksController } from './controllers/staff-tasks.controller';
import { StaffMeetingsController } from './controllers/staff-meetings.controller';
import { StaffTagsController } from './controllers/staff-tags.controller';
import { StaffDashboardController } from './controllers/staff-dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StaffTask,
      StaffTaskAssignment,
      StaffTaskComment,
      StaffTaskAttachment,
      StaffTaskHistory,
      StaffMeeting,
      StaffMeetingAgenda,
      StaffTag,
      User,
    ]),
    ScheduleModule.forRoot(),
    forwardRef(() => CommunicationsModule),
  ],
  controllers: [
    StaffTasksController,
    StaffMeetingsController,
    StaffTagsController,
    StaffDashboardController,
  ],
  providers: [
    StaffTasksService,
    StaffMeetingsService,
    StaffTagsService,
    StaffMeetingAutoCloseService,
    StaffMeetingRemindersService,
  ],
  exports: [
    StaffTasksService,
    StaffMeetingsService,
    StaffTagsService,
  ],
})
export class StaffModule {}
