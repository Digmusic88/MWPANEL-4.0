import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Student, Enrollment } from './entities';
import { Family } from '../families/entities';
import { StudentsController } from './students.controller';
import { StaffRole } from '../../common/staff-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Enrollment, Family, StaffRole]), JwtModule.register({})],
  controllers: [StudentsController],
})
export class StudentsModule {}
