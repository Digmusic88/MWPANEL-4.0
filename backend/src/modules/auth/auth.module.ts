import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { StaffRole } from '../../common/staff-role.entity';

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([StaffRole])],
  controllers: [AuthController],
})
export class AuthModule {}
