import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { EnrollmentsController } from './enrollments.controller';
import { StaffRole } from '../../common/staff-role.entity';

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([StaffRole])],
  controllers: [EnrollmentsController],
})
export class EnrollmentsModule {}
