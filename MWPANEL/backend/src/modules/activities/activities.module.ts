import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { RubricsController } from './controllers/rubrics.controller';
import { RubricFoldersController } from './controllers/rubric-folders.controller';
import { RubricsService } from './services/rubrics.service';
import { RubricFoldersService } from './services/rubric-folders.service';
import { RubricUtilsService } from './services/rubric-utils.service';
import { Activity } from './entities/activity.entity';
import { ActivityAssessment } from './entities/activity-assessment.entity';
import { ActivityNotification } from './entities/activity-notification.entity';
import { Rubric } from './entities/rubric.entity';
import { RubricFolder } from './entities/rubric-folder.entity';
import { RubricCriterion } from './entities/rubric-criterion.entity';
import { RubricLevel } from './entities/rubric-level.entity';
import { RubricCell } from './entities/rubric-cell.entity';
import { RubricAssessment } from './entities/rubric-assessment.entity';
import { RubricAssessmentCriterion } from './entities/rubric-assessment-criterion.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { Student } from '../students/entities/student.entity';
import { Family, FamilyStudent } from '../users/entities/family.entity';
import { User } from '../users/entities/user.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { CommunicationsModule } from '../communications/communications.module';
import { GradesModule } from '../grades/grades.module';
import { EvaluationCriterion } from '../competencies/entities/evaluation-criterion.entity';
import { CriterionAssessmentModule } from '../criterion-assessment/criterion-assessment.module';
import { AcademicYearsModule } from '../academic-years/academic-years.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Activity,
      ActivityAssessment,
      ActivityNotification,
      Rubric,
      RubricFolder,
      RubricCriterion,
      RubricLevel,
      RubricCell,
      RubricAssessment,
      RubricAssessmentCriterion,
      ClassGroup,
      Student,
      Family,
      FamilyStudent,
      User,
      Teacher,
      SubjectAssignment,
      EvaluationCriterion,
    ]),
    CommunicationsModule,
    forwardRef(() => GradesModule),
    forwardRef(() => CriterionAssessmentModule),
    AcademicYearsModule,
  ],
  controllers: [ActivitiesController, RubricsController, RubricFoldersController],
  providers: [ActivitiesService, RubricsService, RubricFoldersService, RubricUtilsService],
  exports: [ActivitiesService, RubricsService, RubricFoldersService, RubricUtilsService],
})
export class ActivitiesModule {}