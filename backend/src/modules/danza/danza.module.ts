import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffRole } from '../../common/staff-role.entity';
import { DanzaController } from './danza.controller';

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([StaffRole])],
  controllers: [DanzaController],
})
export class DanzaModule {}
