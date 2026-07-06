import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherStudentAccess } from './entities/teacher-student-access.entity';
import { Student } from '../students/entities/student.entity';
import { TeacherStudentAccessService } from './teacher-student-access.service';
import { TeacherStudentAccessController } from './teacher-student-access.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherStudentAccess, Student])],
  controllers: [TeacherStudentAccessController],
  providers: [TeacherStudentAccessService],
  exports: [TeacherStudentAccessService],
})
export class TeacherStudentAccessModule {}
