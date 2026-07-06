import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceNotificationsService } from './services/attendance-notifications.service';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { AttendanceRequest } from './entities/attendance-request.entity';
import { Student } from '../students/entities/student.entity';
import { User } from '../users/entities/user.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { Family, FamilyStudent } from '../users/entities/family.entity';
import { Notification } from '../communications/entities/notification.entity';
import { CommunicationsModule } from '../communications/communications.module';
import { FamiliesModule } from '../families/families.module';
import { TeacherAccessModule } from '../../common/teacher-access/teacher-access.module';
import { FamilyAccessModule } from '../../common/family-access/family-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendanceRecord,
      AttendanceRequest,
      Student,
      User,
      ClassGroup,
      Family,
      FamilyStudent,
      Notification,
    ]),
    forwardRef(() => CommunicationsModule),
    forwardRef(() => FamiliesModule),
    TeacherAccessModule,
    FamilyAccessModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceNotificationsService],
  exports: [AttendanceService, AttendanceNotificationsService],
})
export class AttendanceModule {}