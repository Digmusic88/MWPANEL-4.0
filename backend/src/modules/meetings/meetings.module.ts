import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { MeetingsController } from './meetings.controller';
import { StaffRole } from '../../common/staff-role.entity';

@Module({ imports: [JwtModule.register({}), TypeOrmModule.forFeature([StaffRole])], controllers: [MeetingsController] })
export class MeetingsModule {}
