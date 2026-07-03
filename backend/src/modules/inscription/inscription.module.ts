import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { StaffRole } from '../../common/staff-role.entity';
import { InscriptionController } from './inscription.controller';
import { InscriptionService } from './inscription.service';

@Module({
  imports: [TypeOrmModule.forFeature([StaffRole]), JwtModule.register({})],
  controllers: [InscriptionController],
  providers: [InscriptionService],
})
export class InscriptionModule {}
