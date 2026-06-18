import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { TareasController } from './tareas.controller';
import { StaffRole } from '../../common/staff-role.entity';

@Module({ imports: [JwtModule.register({}), TypeOrmModule.forFeature([StaffRole])], controllers: [TareasController] })
export class TareasModule {}
