import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { FeeSchedule } from './entity';
import { FeeSchedulesController } from './fee-schedules.controller';
import { StaffRole } from '../../common/staff-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FeeSchedule, StaffRole]), JwtModule.register({})],
  controllers: [FeeSchedulesController],
})
export class FeeSchedulesModule {}
