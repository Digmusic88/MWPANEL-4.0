import { Module } from '@nestjs/common';
import { AcademiaController } from './academia.controller';
import { AcademiaAccessService } from './academia-access.service';

@Module({
  controllers: [AcademiaController],
  providers: [AcademiaAccessService],
})
export class TeacherAcademiaModule {}
