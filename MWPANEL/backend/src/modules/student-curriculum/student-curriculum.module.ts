import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentSubjectLevelAssignment } from './entities/student-subject-level-assignment.entity';
import { StudentCurriculumAuditLog } from './entities/student-curriculum-audit-log.entity';
import { Student } from '../students/entities/student.entity';
import { Course } from '../students/entities/course.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { SpecificCompetency } from '../competencies/entities/specific-competency.entity';
import { BasicKnowledge } from '../competencies/entities/basic-knowledge.entity';
import { TeacherAccessService } from '../../common/teacher-access/teacher-access.service';
import { StudentCurriculumService } from './student-curriculum.service';
import { StudentCurriculumController } from './student-curriculum.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentSubjectLevelAssignment, StudentCurriculumAuditLog,
      Student, Course, ClassGroup, SpecificCompetency, BasicKnowledge,
    ]),
  ],
  controllers: [StudentCurriculumController],
  providers: [StudentCurriculumService, TeacherAccessService],
  exports: [StudentCurriculumService],
})
export class StudentCurriculumModule {}
