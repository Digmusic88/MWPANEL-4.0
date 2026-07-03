// backfill.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { StaffRole } from '../../common/staff-role.entity';
import { BackfillController } from './backfill.controller';
import { BackfillService } from './backfill.service';

@Module({
  imports: [TypeOrmModule.forFeature([StaffRole]), JwtModule.register({})],
  controllers: [BackfillController],
  providers: [BackfillService],
})
export class BackfillModule {}
