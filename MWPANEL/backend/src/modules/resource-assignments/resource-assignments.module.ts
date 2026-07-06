/**
 * @archivo: resource-assignments.module.ts
 * @módulo: Resource Assignments Module
 * @función: Módulo principal para sistema simple de asignaciones
 * @proyecto: MW Panel 2.0
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceAssignmentsController } from './resource-assignments.controller';
import { ResourceAssignmentsService } from './resource-assignments.service';
import { ResourceAssignment } from '../educational-resources/entities/resource-assignment.entity';
import { EducationalResource } from '../educational-resources/entities/educational-resource.entity';
import { Student } from '../students/entities/student.entity';
import { ClassGroup } from '../students/entities/class-group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ResourceAssignment,
      EducationalResource,
      Student,
      ClassGroup
    ])
  ],
  controllers: [ResourceAssignmentsController],
  providers: [ResourceAssignmentsService],
  exports: [ResourceAssignmentsService]
})
export class ResourceAssignmentsModule {}