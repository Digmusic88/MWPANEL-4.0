import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffRole } from '../../common/staff-role.entity';
import { SyncService } from './sync.service';
import { MocksApiClient } from './mocks-api.client';
import { SyncTriggersService } from './sync-triggers.service';
import { MocksSyncController } from './mocks-sync.controller';

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([StaffRole])],
  controllers: [MocksSyncController],
  providers: [SyncService, MocksApiClient, SyncTriggersService],
})
export class MocksSyncModule {}
