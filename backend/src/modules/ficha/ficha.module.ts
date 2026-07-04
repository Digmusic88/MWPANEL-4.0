import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { StaffRole } from '../../common/staff-role.entity';
import { FichaController } from './ficha.controller';
import { FichaService } from './ficha.service';

@Module({
  imports: [TypeOrmModule.forFeature([StaffRole]), JwtModule.register({})],
  controllers: [FichaController],
  providers: [FichaService],
})
export class FichaModule {}
