import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AcademicYear, Service, Program, Group } from './entities';
import { CatalogController } from './catalog.controller';
import { StaffRole } from '../../common/staff-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicYear, Service, Program, Group, StaffRole]), JwtModule.register({})],
  controllers: [CatalogController],
})
export class CatalogModule {}
