/**
 * @archivo: permission.service.ts
 * @módulo: Student Reports - Servicio de Permisos
 * @función: Gestión de permisos manuales otorgados por el Admin
 * @nota: Esta es la ÚNICA fuente de verdad para saber si un profesor puede escribir sobre un alumno
 */

import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TeacherReportPermission } from '../entities/teacher-report-permission.entity';
import { Student } from '../../students/entities/student.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';
import { AcademicYear } from '../../students/entities/academic-year.entity';
import {
  BulkAssignPermissionsDto,
  AssignPermissionsByGroupDto,
  AssignPermissionsByMultipleGroupsDto,
  BulkRevokePermissionsDto,
  UpdatePermissionDto,
  QueryPermissionsDto,
} from '../dto/permission.dto';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(TeacherReportPermission)
    private readonly permissionRepo: Repository<TeacherReportPermission>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(ClassGroup)
    private readonly classGroupRepo: Repository<ClassGroup>,
    @InjectRepository(AcademicYear)
    private readonly academicYearRepo: Repository<AcademicYear>,
  ) {}

  /**
   * ASIGNACIÓN MASIVA DE PERMISOS
   * El Admin selecciona un profesor y múltiples estudiantes
   */
  async bulkAssignPermissions(
    adminId: string,
    dto: BulkAssignPermissionsDto,
  ): Promise<{ created: number; skipped: number; permissions: TeacherReportPermission[] }> {
    // Verificar que el profesor existe
    const teacher = await this.teacherRepo.findOne({ where: { id: dto.teacherId } });
    if (!teacher) {
      throw new NotFoundException(`Profesor con ID ${dto.teacherId} no encontrado`);
    }

    // Verificar que el año académico existe
    const academicYear = await this.academicYearRepo.findOne({ where: { id: dto.academicYearId } });
    if (!academicYear) {
      throw new NotFoundException(`Año académico con ID ${dto.academicYearId} no encontrado`);
    }

    // Verificar que los estudiantes existen
    const students = await this.studentRepo.find({
      where: { id: In(dto.studentIds) },
    });

    if (students.length === 0) {
      throw new NotFoundException('No se encontraron estudiantes con los IDs proporcionados');
    }

    // Obtener permisos existentes para evitar duplicados
    const existingPermissions = await this.permissionRepo.find({
      where: {
        teacherId: dto.teacherId,
        academicYearId: dto.academicYearId,
        studentId: In(dto.studentIds),
      },
    });

    const existingStudentIds = new Set(existingPermissions.map(p => p.studentId));
    const newStudentIds = students.filter(s => !existingStudentIds.has(s.id)).map(s => s.id);

    // Crear nuevos permisos
    const newPermissions: TeacherReportPermission[] = [];
    for (const studentId of newStudentIds) {
      const permission = this.permissionRepo.create({
        teacherId: dto.teacherId,
        studentId,
        academicYearId: dto.academicYearId,
        grantedById: adminId,
        adminNote: dto.adminNote,
        isActive: true,
      });
      newPermissions.push(permission);
    }

    const savedPermissions = await this.permissionRepo.save(newPermissions);

    return {
      created: savedPermissions.length,
      skipped: existingPermissions.length,
      permissions: savedPermissions,
    };
  }

  /**
   * ASIGNACIÓN POR GRUPO DE CLASE
   * Más ágil: asigna todos los estudiantes de un grupo de una vez
   */
  async assignPermissionsByGroup(
    adminId: string,
    dto: AssignPermissionsByGroupDto,
  ): Promise<{ created: number; skipped: number; permissions: TeacherReportPermission[] }> {
    // Obtener el grupo con sus estudiantes
    const classGroup = await this.classGroupRepo.findOne({
      where: { id: dto.classGroupId },
      relations: ['students'],
    });

    if (!classGroup) {
      throw new NotFoundException(`Grupo de clase con ID ${dto.classGroupId} no encontrado`);
    }

    if (!classGroup.students || classGroup.students.length === 0) {
      throw new NotFoundException('El grupo de clase no tiene estudiantes asignados');
    }

    // Usar la función de asignación masiva
    return this.bulkAssignPermissions(adminId, {
      teacherId: dto.teacherId,
      studentIds: classGroup.students.map(s => s.id),
      academicYearId: dto.academicYearId,
      adminNote: dto.adminNote || `Asignado por grupo: ${classGroup.name}`,
    });
  }

  /**
   * ASIGNACIÓN POR MÚLTIPLES GRUPOS DE CLASE
   * Procesa varios grupos a la vez y acumula los resultados
   */
  async assignPermissionsByMultipleGroups(
    adminId: string,
    dto: AssignPermissionsByMultipleGroupsDto,
  ): Promise<{ created: number; skipped: number; permissions: TeacherReportPermission[] }> {
    let totalCreated = 0;
    let totalSkipped = 0;
    const allPermissions: TeacherReportPermission[] = [];

    // Obtener todos los grupos con sus estudiantes
    const classGroups = await this.classGroupRepo.find({
      where: { id: In(dto.classGroupIds) },
      relations: ['students'],
    });

    if (classGroups.length === 0) {
      throw new NotFoundException('No se encontraron grupos de clase con los IDs proporcionados');
    }

    // Recopilar todos los estudiantes de todos los grupos (sin duplicados)
    const studentIds = new Set<string>();
    const groupNames: string[] = [];

    for (const group of classGroups) {
      groupNames.push(group.name);
      if (group.students && group.students.length > 0) {
        group.students.forEach(s => studentIds.add(s.id));
      }
    }

    if (studentIds.size === 0) {
      throw new NotFoundException('Los grupos seleccionados no tienen estudiantes asignados');
    }

    // Usar la función de asignación masiva con todos los estudiantes
    const result = await this.bulkAssignPermissions(adminId, {
      teacherId: dto.teacherId,
      studentIds: Array.from(studentIds),
      academicYearId: dto.academicYearId,
      adminNote: dto.adminNote || `Asignado por grupos: ${groupNames.join(', ')}`,
    });

    return result;
  }

  /**
   * REVOCAR PERMISOS MASIVAMENTE
   */
  async bulkRevokePermissions(dto: BulkRevokePermissionsDto): Promise<{ revoked: number }> {
    const result = await this.permissionRepo.delete({
      id: In(dto.permissionIds),
    });

    return { revoked: result.affected || 0 };
  }

  /**
   * DESACTIVAR PERMISOS (soft delete)
   */
  async deactivatePermissions(permissionIds: string[]): Promise<{ deactivated: number }> {
    const result = await this.permissionRepo.update(
      { id: In(permissionIds) },
      { isActive: false },
    );

    return { deactivated: result.affected || 0 };
  }

  /**
   * ACTUALIZAR UN PERMISO
   */
  async updatePermission(id: string, dto: UpdatePermissionDto): Promise<TeacherReportPermission> {
    const permission = await this.permissionRepo.findOne({ where: { id } });
    if (!permission) {
      throw new NotFoundException(`Permiso con ID ${id} no encontrado`);
    }

    Object.assign(permission, dto);
    return this.permissionRepo.save(permission);
  }

  /**
   * CONSULTAR PERMISOS CON FILTROS
   */
  async findAll(query: QueryPermissionsDto): Promise<TeacherReportPermission[]> {
    const qb = this.permissionRepo.createQueryBuilder('permission')
      .leftJoinAndSelect('permission.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
      .leftJoinAndSelect('permission.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .leftJoinAndSelect('permission.academicYear', 'academicYear')
      .leftJoinAndSelect('permission.grantedBy', 'grantedBy')
      .leftJoinAndSelect('grantedBy.profile', 'grantedByProfile');

    if (query.teacherId) {
      qb.andWhere('permission.teacherId = :teacherId', { teacherId: query.teacherId });
    }

    if (query.studentId) {
      qb.andWhere('permission.studentId = :studentId', { studentId: query.studentId });
    }

    if (query.academicYearId) {
      qb.andWhere('permission.academicYearId = :academicYearId', { academicYearId: query.academicYearId });
    }

    if (query.activeOnly !== false) {
      qb.andWhere('permission.isActive = :isActive', { isActive: true });
    }

    qb.orderBy('permission.createdAt', 'DESC');

    return qb.getMany();
  }

  /**
   * OBTENER ESTUDIANTES ASIGNADOS A UN PROFESOR
   * Esta es la consulta principal para la vista del profesor
   */
  async getAssignedStudentsForTeacher(
    teacherId: string,
    academicYearId?: string,
  ): Promise<TeacherReportPermission[]> {
    const qb = this.permissionRepo.createQueryBuilder('permission')
      .leftJoinAndSelect('permission.student', 'student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('student.classGroups', 'classGroup')
      .where('permission.teacherId = :teacherId', { teacherId })
      .andWhere('permission.isActive = :isActive', { isActive: true });

    if (academicYearId) {
      qb.andWhere('permission.academicYearId = :academicYearId', { academicYearId });
    }

    qb.orderBy('profile.lastName', 'ASC')
      .addOrderBy('profile.firstName', 'ASC');

    return qb.getMany();
  }

  /**
   * VERIFICAR SI UN PROFESOR TIENE PERMISO PARA UN ESTUDIANTE
   * Esta es la verificación de seguridad antes de crear/editar un informe
   */
  async hasPermission(
    teacherId: string,
    studentId: string,
    academicYearId?: string,
  ): Promise<boolean> {
    const qb = this.permissionRepo.createQueryBuilder('permission')
      .where('permission.teacherId = :teacherId', { teacherId })
      .andWhere('permission.studentId = :studentId', { studentId })
      .andWhere('permission.isActive = :isActive', { isActive: true });

    if (academicYearId) {
      qb.andWhere('permission.academicYearId = :academicYearId', { academicYearId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  /**
   * OBTENER ESTADÍSTICAS DE PERMISOS
   */
  async getStats(academicYearId?: string): Promise<{
    totalPermissions: number;
    activePermissions: number;
    teachersWithPermissions: number;
    studentsWithReporters: number;
  }> {
    // Construir condiciones base
    const baseConditions: any = {};
    if (academicYearId) {
      baseConditions.academicYearId = academicYearId;
    }

    // Total de permisos
    const totalPermissions = await this.permissionRepo.count({
      where: baseConditions,
    });

    // Permisos activos
    const activePermissions = await this.permissionRepo.count({
      where: { ...baseConditions, isActive: true },
    });

    // Profesores únicos con permisos activos
    const teachersResult = await this.permissionRepo
      .createQueryBuilder('permission')
      .select('COUNT(DISTINCT permission.teacherId)', 'count')
      .where(academicYearId ? 'permission.academicYearId = :academicYearId' : '1=1', { academicYearId })
      .andWhere('permission.isActive = :isActive', { isActive: true })
      .getRawOne();

    // Estudiantes únicos con evaluadores asignados
    const studentsResult = await this.permissionRepo
      .createQueryBuilder('permission')
      .select('COUNT(DISTINCT permission.studentId)', 'count')
      .where(academicYearId ? 'permission.academicYearId = :academicYearId' : '1=1', { academicYearId })
      .andWhere('permission.isActive = :isActive', { isActive: true })
      .getRawOne();

    return {
      totalPermissions,
      activePermissions,
      teachersWithPermissions: parseInt(teachersResult?.count || '0', 10),
      studentsWithReporters: parseInt(studentsResult?.count || '0', 10),
    };
  }
}
