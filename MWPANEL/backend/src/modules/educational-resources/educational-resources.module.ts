import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EducationalResourcesController } from './educational-resources.controller';
import { EducationalResourcesService } from './educational-resources.service';
import { GoogleDriveService } from './services/google-drive.service';
import { EducationalResource } from './entities/educational-resource.entity';
import { ResourceAssignment } from './entities/resource-assignment.entity';
import { ResourceView } from './entities/resource-view.entity';
import { ResourceComment } from './entities/resource-comment.entity';
import { ResourceFavorite } from './entities/resource-favorite.entity';
import { ResourceFolder } from './entities/resource-folder.entity';
import { Subject } from '../students/entities/subject.entity';
import { EducationalLevel } from '../students/entities/educational-level.entity';
import { Student } from '../students/entities/student.entity';
import { TeacherAccessModule } from '../../common/teacher-access/teacher-access.module';
import { AcademicYearsModule } from '../academic-years/academic-years.module';

@Module({
  imports: [
    ConfigModule,
    TeacherAccessModule,
    AcademicYearsModule,
    TypeOrmModule.forFeature([
      EducationalResource,
      ResourceAssignment,
      ResourceView,
      ResourceComment,
      ResourceFavorite,
      ResourceFolder,
      Subject,
      EducationalLevel,
      Student,
    ]),
  ],
  controllers: [EducationalResourcesController],
  providers: [EducationalResourcesService, GoogleDriveService],
  exports: [EducationalResourcesService, GoogleDriveService],
})
export class EducationalResourcesModule {}