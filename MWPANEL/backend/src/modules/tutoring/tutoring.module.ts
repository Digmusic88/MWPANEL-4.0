import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutoringService } from './tutoring.service';
import { TutoringController } from './tutoring.controller';
import { TutoringGroup, TutoringStudent } from './entities';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Student } from '../students/entities/student.entity';
import { AcademicYear } from '../students/entities/academic-year.entity';
import { EducationalLevel } from '../students/entities/educational-level.entity';
import { CommunicationsModule } from '../communications/communications.module';
import { FamilyAccessModule } from '../../common/family-access/family-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TutoringGroup,
      TutoringStudent,
      Teacher,
      Student,
      AcademicYear,
      EducationalLevel
    ]),
    forwardRef(() => CommunicationsModule),
    FamilyAccessModule
  ],
  controllers: [TutoringController],
  providers: [TutoringService],
  exports: [TutoringService]
})
export class TutoringModule {}