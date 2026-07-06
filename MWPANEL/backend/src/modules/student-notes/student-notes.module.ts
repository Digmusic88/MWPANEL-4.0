import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { StudentNote } from './entities/student-note.entity';
import { SharedNote } from './entities/shared-note.entity';
import { SharedNoteComment } from './entities/shared-note-comment.entity';
import { StudentNotesConfig } from './entities/student-notes-config.entity';
import { FamilyAccessControl } from './entities/family-access-control.entity';
import { FamilyAccessLog } from './entities/family-access-log.entity';
import { ModerationReport } from './entities/moderation-report.entity';
import { ModerationConfig } from './entities/moderation-config.entity';
import { StudentNotesController } from './student-notes.controller';
import { StudentNotesService } from './student-notes.service';
import { SharedNotesService } from './services/shared-notes.service';
import { SharedNotesCleanupService } from './services/cleanup.service';
import { SharedNoteCommentsService } from './services/shared-note-comments.service';
import { FamilyAccessService } from './services/family-access.service';
import { ModerationService } from './services/moderation.service';
import { AzureContentSafetyService } from './services/azure-content-safety.service';
import { FamilyAccessController } from './controllers/family-access.controller';
import { EducationalResourcesModule } from '../educational-resources/educational-resources.module';
import { CommunicationsModule } from '../communications/communications.module';
import { FamiliesModule } from '../families/families.module';
import { User } from '../users/entities/user.entity';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { Notification } from '../communications/entities/notification.entity';
import { Family, FamilyStudent } from '../users/entities/family.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentNote, 
      SharedNote,
      SharedNoteComment,
      StudentNotesConfig,
      FamilyAccessControl,
      FamilyAccessLog,
      ModerationReport,
      ModerationConfig,
      User, 
      Student, 
      Teacher, 
      SubjectAssignment, 
      ClassGroup,
      Notification,
      Family,
      FamilyStudent
    ]),
    JwtModule, // Para usar JwtService en el controller
    EducationalResourcesModule, // Para usar GoogleDriveService
    CommunicationsModule, // Para usar NotificationService
    FamiliesModule, // Para usar FamiliesService en family-access.service
  ],
  controllers: [
    StudentNotesController,
    FamilyAccessController,
  ],
  providers: [
    StudentNotesService, 
    SharedNotesService,
    SharedNotesCleanupService,
    SharedNoteCommentsService,
    FamilyAccessService,
    ModerationService,
    AzureContentSafetyService,
  ],
  exports: [
    StudentNotesService, 
    SharedNotesService,
    SharedNotesCleanupService,
    SharedNoteCommentsService,
    FamilyAccessService,
    ModerationService,
  ]
})
export class StudentNotesModule {}