import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { MeetingPeriod } from './entities/meeting-period.entity';
import { MeetingSlot } from './entities/meeting-slot.entity';
import { MeetingBooking } from './entities/meeting-booking.entity';
import { MeetingSpace } from './entities/meeting-space.entity';

// Related entities needed for relationships
import { User } from '../users/entities/user.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Family, FamilyStudent } from '../users/entities/family.entity';
import { Student } from '../students/entities/student.entity';
import { ClassGroup } from '../students/entities/class-group.entity';

// Controllers
import { AdminMeetingsController } from './controllers/admin-meetings.controller';
import { AdminSpacesController } from './controllers/admin-spaces.controller';
import { TeacherMeetingsController } from './controllers/teacher-meetings.controller';
import { FamilyMeetingsController } from './controllers/family-meetings.controller';

// Services
import { MeetingsService } from './services/meetings.service';

// Calendar integration
import { CalendarModule } from '../calendar/calendar.module';
// Communications integration for notifications
import { CommunicationsModule } from '../communications/communications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Meeting entities
      MeetingPeriod,
      MeetingSlot,
      MeetingBooking,
      MeetingSpace,
      // Related entities
      User, // ✅ Necesario para calendario
      Teacher,
      Family,
      FamilyStudent,
      Student,
      ClassGroup,
    ]),
    CalendarModule, // ✅ Integración con calendario para eventos automáticos
    CommunicationsModule, // ✅ Sistema de notificaciones para reservas
  ],
  controllers: [
    AdminMeetingsController,
    AdminSpacesController,
    TeacherMeetingsController,
    FamilyMeetingsController,
  ],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {
  constructor() {
    console.log('🏢 MEETINGS MODULE LOADED - Sistema de gestión de reuniones disponible');
  }
}