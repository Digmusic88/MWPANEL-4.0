import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';
import { TeacherTodoController } from './controllers/teacher-todo.controller';
import { TeacherNotificationsController } from './controllers/teacher-notifications.controller';
import { TeacherTodoService } from './services/teacher-todo.service';
import { TeacherTodoNotificationsService } from './services/teacher-todo-notifications.service';
import { EmployeeNumberService } from './services/employee-number.service';
import { UsersModule } from '../users/users.module';
import { TasksModule } from '../tasks/tasks.module';
import { CommunicationsModule } from '../communications/communications.module';
import { Teacher } from './entities/teacher.entity';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskSubmission } from '../tasks/entities/task-submission.entity';
import { AttendanceRequest } from '../attendance/entities/attendance-request.entity';
import { MeetingBooking } from '../meetings/entities/meeting-booking.entity';
import { Notification } from '../communications/entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Teacher, 
      User, 
      UserProfile, 
      SubjectAssignment,
      Task,
      TaskSubmission,
      AttendanceRequest,
      MeetingBooking,
      Notification,
    ]),
    ScheduleModule.forRoot(),
    UsersModule,
    forwardRef(() => TasksModule),
    forwardRef(() => CommunicationsModule),
  ],
  controllers: [TeacherTodoController, TeacherNotificationsController, TeachersController],
  providers: [
    TeachersService, 
    TeacherTodoService, 
    TeacherTodoNotificationsService,
    EmployeeNumberService,
  ],
  exports: [TeachersService, TeacherTodoService],
})
export class TeachersModule {}