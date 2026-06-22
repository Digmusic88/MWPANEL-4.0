// backend/src/realtime/realtime.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffRole } from '../common/staff-role.entity';
import { RealtimeGateway } from './realtime.gateway';
import { ChangeFeedService } from './change-feed.service';

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([StaffRole])],
  providers: [RealtimeGateway, ChangeFeedService],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
