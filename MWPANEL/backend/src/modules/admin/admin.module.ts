import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Family } from '../users/entities/family.entity';
import { Subject } from '../students/entities/subject.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { Message } from '../communications/entities/message.entity';
import { Activity } from '../activities/entities/activity.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Student,
      Teacher,
      Family,
      Subject,
      ClassGroup,
      Message,
      Activity,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}