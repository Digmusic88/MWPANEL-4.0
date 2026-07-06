import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamilyStudent } from '../../modules/users/entities/family.entity';
import { FamilyAccessService } from './family-access.service';

/**
 * Módulo reutilizable de autorización RGPD familia→alumno.
 * Importar en cualquier módulo que exponga datos de alumnos a familias
 * e inyectar FamilyAccessService para validar la relación de tutela.
 */
@Module({
  imports: [TypeOrmModule.forFeature([FamilyStudent])],
  providers: [FamilyAccessService],
  exports: [FamilyAccessService],
})
export class FamilyAccessModule {}
