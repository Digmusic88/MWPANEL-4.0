import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassGroupsService } from './class-groups.service';
import { ClassGroupsController } from './class-groups.controller';
import { ClassGroup } from '../students/entities/class-group.entity';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Course } from '../students/entities/course.entity';
import { AcademicYear } from '../students/entities/academic-year.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClassGroup,
      Student,
      Teacher,
      Course,
      AcademicYear,
    ]),
  ],
  controllers: [ClassGroupsController],
  providers: [ClassGroupsService],
  exports: [ClassGroupsService],
})
export class ClassGroupsModule {}