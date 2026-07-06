import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoordinationController } from './coordination.controller';
import { CoordinationService } from './coordination.service';
import { CoordinationSheet } from './entities/coordination-sheet.entity';
import { CoordinationItem } from './entities/coordination-item.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CoordinationSheet, CoordinationItem]),
    UsersModule,
  ],
  controllers: [CoordinationController],
  providers: [CoordinationService],
  exports: [CoordinationService],
})
export class CoordinationModule {
  constructor() {
    console.log('🔧 CoordinationModule initialized with database entities');
  }
}