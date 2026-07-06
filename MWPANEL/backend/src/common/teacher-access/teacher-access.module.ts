import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '../../modules/students/entities/student.entity';
import { ClassGroup } from '../../modules/students/entities/class-group.entity';
import { TeacherAccessService } from './teacher-access.service';

/**
 * Módulo reutilizable de autorización RGPD profesor→alumno/grupo.
 * Importar en cualquier módulo que exponga datos de alumnos a profesores
 * e inyectar TeacherAccessService para validar la pertenencia.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Student, ClassGroup])],
  providers: [TeacherAccessService],
  exports: [TeacherAccessService],
})
export class TeacherAccessModule {}
