import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Family, Guardian } from './entities';
import { FamiliesController } from './families.controller';
import { StaffRole } from '../../common/staff-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Family, Guardian, StaffRole]), JwtModule.register({})],
  controllers: [FamiliesController],
})
export class FamiliesModule {}
