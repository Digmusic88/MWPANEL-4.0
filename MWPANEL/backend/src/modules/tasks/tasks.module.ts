import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TestYourselfSectionsController } from './controllers/test-yourself-sections.controller';
import { TestYourselfSectionsService } from './services/test-yourself-sections.service';
import { CustomTabsController } from './controllers/custom-tabs.controller';
import { CustomTabsService } from './services/custom-tabs.service';
import {
  Task,
  TaskSubmission,
  TaskAttachment,
  TaskSubmissionAttachment,
  TaskRubricAssessment,
  TaskRubricAssessmentCriterion,
  TaskSubjectAssignment
} from './entities';
import { TestYourselfSection } from './entities/test-yourself-section.entity';
import { TestYourselfSectionAssignment } from './entities/test-yourself-section-assignment.entity';
import { CustomTab } from './entities/custom-tab.entity';
import { ExamGrade } from './entities/exam-grade.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Student } from '../students/entities/student.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { Family, FamilyStudent } from '../users/entities/family.entity';
import { User } from '../users/entities/user.entity';
import { GoogleDriveService } from '../educational-resources/services/google-drive.service';
import { EmailService } from '../communications/services/email.service';
import { NotificationService } from '../communications/services/notification.service';
import { Rubric } from '../activities/entities/rubric.entity';
import { RubricCriterion } from '../activities/entities/rubric-criterion.entity';
import { RubricLevel } from '../activities/entities/rubric-level.entity';
import { RubricCell } from '../activities/entities/rubric-cell.entity';
import { EvaluationCriterion } from '../competencies/entities/evaluation-criterion.entity';
import { EmailNotification } from '../communications/entities/email-notification.entity';
import { EmailTemplate } from '../communications/entities/email-template.entity';
import { EmailAutomation } from '../communications/entities/email-automation.entity';
import { UserNotificationPreferences } from '../communications/entities/user-notification-preferences.entity';
import { StudentNote } from '../student-notes/entities/student-note.entity';
import { GradesModule } from '../grades/grades.module';
import { CriterionAssessmentModule } from '../criterion-assessment/criterion-assessment.module';
import { AcademicYearsModule } from '../academic-years/academic-years.module';
import { mkdir } from 'fs/promises';
import { join } from 'path';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskSubmission,
      TaskAttachment,
      TaskSubmissionAttachment,
      TaskRubricAssessment,
      TaskRubricAssessmentCriterion,
      TaskSubjectAssignment,
      TestYourselfSection,
      TestYourselfSectionAssignment,
      CustomTab,
      ExamGrade,
      Teacher,
      Student,
      SubjectAssignment,
      ClassGroup,
      Family,
      FamilyStudent,
      User,
      Rubric,
      RubricCriterion,
      RubricLevel,
      RubricCell,
      EmailNotification,
      EmailTemplate,
      EmailAutomation,
      UserNotificationPreferences,
      StudentNote,
      EvaluationCriterion,
    ]),
    MulterModule.registerAsync({
      useFactory: async () => {
        // Crear directorios de uploads si no existen
        const uploadsPath = join(process.cwd(), 'uploads');
        const tasksPath = join(uploadsPath, 'tasks');
        const submissionsPath = join(uploadsPath, 'submissions');

        try {
          await mkdir(uploadsPath, { recursive: true });
          await mkdir(tasksPath, { recursive: true });
          await mkdir(submissionsPath, { recursive: true });
        } catch (error) {
          // Los directorios ya existen
        }

        return {
          dest: uploadsPath,
        };
      },
    }),
    forwardRef(() => GradesModule),
    forwardRef(() => CriterionAssessmentModule),
    AcademicYearsModule,
  ],
  controllers: [TestYourselfSectionsController, CustomTabsController, TasksController],
  providers: [TasksService, TestYourselfSectionsService, CustomTabsService, GoogleDriveService, EmailService, NotificationService],
  exports: [TasksService],
})
export class TasksModule {
  constructor() {
    console.log('🔍 TASKS MODULE LOADED - Controller and routes should be available');
    console.log('🔍 TasksController should handle POST /api/tasks/:id/attachments');
  }
}