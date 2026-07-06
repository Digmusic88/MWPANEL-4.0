import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../../modules/students/entities/student.entity';
import { ClassGroup } from '../../modules/students/entities/class-group.entity';

/**
 * Servicio de autorización RGPD: determina si un profesor tiene acceso
 * a un alumno o a un grupo concreto.
 *
 * Criterio de acceso (idéntico en todo el sistema): el profesor tiene acceso
 * si es TUTOR del grupo del alumno O si imparte una ASIGNATURA en ese grupo
 * (tabla subject_assignments). `userId` es el User.id del profesor autenticado
 * (req.user.id === req.user.userId).
 */
@Injectable()
export class TeacherAccessService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(ClassGroup)
    private readonly classGroupRepository: Repository<ClassGroup>,
  ) {}

  /** ¿El profesor (userId) puede acceder a la ficha/datos del alumno studentId? */
  async canTeacherAccessStudent(userId: string, studentId: string): Promise<boolean> {
    const count = await this.studentRepository
      .createQueryBuilder('student')
      .leftJoin('student.classGroups', 'classGroups')
      .leftJoin('subject_assignments', 'sa', 'sa.classGroupId = classGroups.id')
      .leftJoin('teachers', 'subjectTeacher', 'subjectTeacher.id = sa.teacherId')
      .leftJoin('teachers', 'tutorTeacher', 'tutorTeacher.id = classGroups.tutorId')
      .where('student.id = :studentId', { studentId })
      .andWhere(
        '(subjectTeacher.userId = :userId OR tutorTeacher.userId = :userId)',
        { userId },
      )
      .getCount();

    return count > 0;
  }

  /**
   * ¿El profesor (userId) puede gestionar el currículo/nivel del alumno EN una asignatura?
   * Más estricto que canTeacherAccessStudent: acceso si es TUTOR del grupo del alumno
   * O si imparte ESA asignatura concreta (subjectId) en el grupo del alumno.
   */
  async canTeacherAccessStudentForSubject(
    userId: string,
    studentId: string,
    subjectId: string,
  ): Promise<boolean> {
    const count = await this.studentRepository
      .createQueryBuilder('student')
      .leftJoin('student.classGroups', 'classGroups')
      .leftJoin('subject_assignments', 'sa', 'sa.classGroupId = classGroups.id')
      .leftJoin('teachers', 'subjectTeacher', 'subjectTeacher.id = sa.teacherId')
      .leftJoin('teachers', 'tutorTeacher', 'tutorTeacher.id = classGroups.tutorId')
      .where('student.id = :studentId', { studentId })
      .andWhere(
        '(tutorTeacher.userId = :userId OR (subjectTeacher.userId = :userId AND sa.subjectId = :subjectId))',
        { userId, subjectId },
      )
      .getCount();

    return count > 0;
  }

  /** ¿El profesor (userId) puede acceder al grupo classGroupId? */
  async canTeacherAccessClassGroup(userId: string, classGroupId: string): Promise<boolean> {
    const count = await this.classGroupRepository
      .createQueryBuilder('cg')
      .leftJoin('subject_assignments', 'sa', 'sa.classGroupId = cg.id')
      .leftJoin('teachers', 'subjectTeacher', 'subjectTeacher.id = sa.teacherId')
      .leftJoin('teachers', 'tutorTeacher', 'tutorTeacher.id = cg.tutorId')
      .where('cg.id = :classGroupId', { classGroupId })
      .andWhere(
        '(subjectTeacher.userId = :userId OR tutorTeacher.userId = :userId)',
        { userId },
      )
      .getCount();

    return count > 0;
  }
}
