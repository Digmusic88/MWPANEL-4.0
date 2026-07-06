import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { BulkImportService } from './services/bulk-import.service';
import { StudentsModule } from '../students/students.module';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Student } from '../students/entities/student.entity';
import { EducationalLevel } from '../students/entities/educational-level.entity';
import { Course } from '../students/entities/course.entity';
import { Family, FamilyStudent } from '../users/entities/family.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      Student,
      EducationalLevel,
      Course,
      Family,
      FamilyStudent,
    ]),
    StudentsModule,
  ],
  controllers: [EnrollmentController],
  providers: [EnrollmentService, BulkImportService],
  exports: [EnrollmentService, BulkImportService],
})
export class EnrollmentModule {}