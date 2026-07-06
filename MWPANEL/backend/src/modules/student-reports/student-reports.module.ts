/**
 * @archivo: student-reports.module.ts
 * @módulo: Student Reports - Sistema de Permisos Manual
 * @función: Módulo para informes cualitativos con permisos controlados por Admin
 * @flujo:
 *   1. Admin asigna permisos a profesores para escribir sobre estudiantes
 *   2. Profesor ve "Mis Solicitudes de Informe" (estudiantes asignados)
 *   3. Profesor escribe informe con etiqueta de contexto MANUAL
 *   4. Tutor ve todos los informes de sus tutorados
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { TeacherReportPermission } from './entities/teacher-report-permission.entity';
import { StudentQualitativeReport } from './entities/student-qualitative-report.entity';

// Related entities for queries
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { AcademicYear } from '../students/entities/academic-year.entity';
import { User } from '../users/entities/user.entity';

// Services
import { PermissionService } from './services/permission.service';
import { QualitativeReportService } from './services/qualitative-report.service';
import { TutorReportPdfService } from './services/tutor-report-pdf.service';

// Controllers
import { AdminPermissionController } from './controllers/admin-permission.controller';
import { TeacherReportController } from './controllers/teacher-report.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Module entities
      TeacherReportPermission,
      StudentQualitativeReport,
      // Related entities for queries
      Student,
      Teacher,
      ClassGroup,
      AcademicYear,
      User,
    ]),
  ],
  controllers: [
    AdminPermissionController,
    TeacherReportController,
  ],
  providers: [
    PermissionService,
    QualitativeReportService,
    TutorReportPdfService,
  ],
  exports: [
    PermissionService,
    QualitativeReportService,
    TutorReportPdfService,
  ],
})
export class StudentReportsModule {}
