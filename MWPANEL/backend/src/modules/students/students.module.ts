import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { EnrollmentNumberService } from './services/enrollment-number.service';
import { RecentActivityService } from './services/recent-activity.service';
import { SecretariaFichaService } from './secretaria-ficha/secretaria-ficha.service';
import { EducationalLevelsController } from './educational-levels.controller';
import { EducationalLevelsService } from './services/educational-levels.service';
import { UsersModule } from '../users/users.module';
import { Student } from './entities/student.entity';
import { EducationalLevel } from './entities/educational-level.entity';
import { Cycle } from './entities/cycle.entity';
import { Course } from './entities/course.entity';
import { Subject } from './entities/subject.entity';
import { ClassGroup } from './entities/class-group.entity';
import { AcademicYear } from './entities/academic-year.entity';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { Task } from '../tasks/entities/task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      EducationalLevel,
      Cycle,
      Course,
      Subject,
      ClassGroup,
      AcademicYear,
      User,
      UserProfile,
      Teacher,
      Evaluation,
      Task,
    ]),
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({ secret: cs.get<string>('app.jwt.secret') }),
    }),
  ],
  controllers: [StudentsController, EducationalLevelsController],
  providers: [StudentsService, EnrollmentNumberService, EducationalLevelsService, RecentActivityService, SecretariaFichaService],
  exports: [
    StudentsService, 
    EnrollmentNumberService, 
    EducationalLevelsService, 
    RecentActivityService,
    TypeOrmModule, // Export TypeOrmModule to make repositories available
  ],
})
export class StudentsModule {}