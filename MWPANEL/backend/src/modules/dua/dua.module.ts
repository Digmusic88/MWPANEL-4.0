/**
 * @module: DuaModule
 * @description: Módulo simplificado del sistema DUA (Diseño Universal para el Aprendizaje)
 * @features: Perfiles DUA, Acomodaciones sin dependencias circulares
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities DUA
import { DuaProfile } from './entities/dua-profile.entity';
import { DuaAccommodation } from './entities/dua-accommodation.entity';
import { AccommodationEffectiveness } from './entities/accommodation-effectiveness.entity';
import { CurricularAdaptation } from './entities/curricular-adaptation.entity';

// Entities necesarias para las relaciones
import { Student } from '../students/entities/student.entity';
import { User } from '../users/entities/user.entity';
import { AcademicYear } from '../students/entities/academic-year.entity';

// Services
import { DuaService } from './services/dua.service';
import { AccommodationService } from './services/accommodation.service';
import { CurricularAdaptationService } from './services/curricular-adaptation.service';

// Controllers
import { DuaController } from './controllers/dua.controller';
import { AccommodationController } from './controllers/accommodation.controller';
import { CurricularAdaptationController } from './controllers/curricular-adaptation.controller';

// Módulos de acceso RGPD reutilizables (profesor/familia -> alumno)
import { TeacherAccessModule } from '../../common/teacher-access/teacher-access.module';
import { FamilyAccessModule } from '../../common/family-access/family-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DuaProfile,
      DuaAccommodation,
      AccommodationEffectiveness,
      CurricularAdaptation,
      Student,
      User,
      AcademicYear,
    ]),
    // No importamos StudentsModule para evitar dependencias circulares
    TeacherAccessModule,
    FamilyAccessModule,
  ],
  controllers: [
    DuaController,
    AccommodationController,
    CurricularAdaptationController,
  ],
  providers: [
    DuaService,
    AccommodationService,
    CurricularAdaptationService,
  ],
  exports: [
    DuaService,
    AccommodationService,
    CurricularAdaptationService,
  ],
})
export class DuaModule {}