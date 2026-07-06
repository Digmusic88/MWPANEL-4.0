/**
 * @archivo: qualitative-report.service.ts
 * @módulo: Student Reports - Servicio de Informes Cualitativos
 * @función: CRUD de informes con verificación de permisos
 * @nota: El profesor SOLO puede escribir si tiene permiso otorgado por el Admin
 */

import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentQualitativeReport } from '../entities/student-qualitative-report.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Student } from '../../students/entities/student.entity';
import { AcademicYear } from '../../students/entities/academic-year.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';
import { PermissionService } from './permission.service';
import {
  CreateQualitativeReportDto,
  UpdateQualitativeReportDto,
  QueryReportsDto,
  PREDEFINED_CONTEXT_TAGS,
} from '../dto/report.dto';

@Injectable()
export class QualitativeReportService {
  constructor(
    @InjectRepository(StudentQualitativeReport)
    private readonly reportRepo: Repository<StudentQualitativeReport>,
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(AcademicYear)
    private readonly academicYearRepo: Repository<AcademicYear>,
    @InjectRepository(ClassGroup)
    private readonly classGroupRepo: Repository<ClassGroup>,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * CREAR INFORME
   * Verifica que el profesor tenga permiso antes de crear
   */
  async createReport(
    userId: string,
    dto: CreateQualitativeReportDto,
  ): Promise<StudentQualitativeReport> {
    // Obtener el teacher ID desde el user ID
    const teacher = await this.teacherRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!teacher) {
      throw new ForbiddenException('No tienes perfil de profesor');
    }

    // Obtener año académico activo si no se especifica
    let academicYearId = dto.academicYearId;
    if (!academicYearId) {
      const activeYear = await this.academicYearRepo.findOne({
        where: { isCurrent: true },
      });
      if (!activeYear) {
        throw new BadRequestException('No hay año académico activo');
      }
      academicYearId = activeYear.id;
    }

    // VERIFICAR PERMISO - Esta es la única fuente de verdad
    const hasPermission = await this.permissionService.hasPermission(
      teacher.id,
      dto.studentId,
      academicYearId,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'No tienes permiso para escribir informes sobre este estudiante. Contacta con el administrador.',
      );
    }

    // Verificar si ya existe un informe del mismo profesor para el mismo estudiante/contexto
    const existingReport = await this.reportRepo.findOne({
      where: {
        studentId: dto.studentId,
        authorTeacherId: teacher.id,
        academicYearId,
        contextTag: dto.contextTag,
      },
    });

    if (existingReport) {
      throw new BadRequestException(
        `Ya tienes un informe de "${dto.contextTag}" para este estudiante. Edita el existente en lugar de crear uno nuevo.`,
      );
    }

    // Crear el informe
    const report = this.reportRepo.create({
      studentId: dto.studentId,
      authorTeacherId: teacher.id,
      academicYearId,
      contextTag: dto.contextTag,
      content: dto.content,
      priority: dto.priority || 2,
      visibleToFamily: dto.visibleToFamily || false,
    });

    return this.reportRepo.save(report);
  }

  /**
   * ACTUALIZAR INFORME
   * Solo el autor puede editar
   */
  async updateReport(
    reportId: string,
    userId: string,
    dto: UpdateQualitativeReportDto,
  ): Promise<StudentQualitativeReport> {
    const teacher = await this.teacherRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!teacher) {
      throw new ForbiddenException('No tienes perfil de profesor');
    }

    const report = await this.reportRepo.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Informe no encontrado');
    }

    // Solo el autor puede editar
    if (report.authorTeacherId !== teacher.id) {
      throw new ForbiddenException('Solo puedes editar tus propios informes');
    }

    // Actualizar campos
    if (dto.contextTag !== undefined) report.contextTag = dto.contextTag;
    if (dto.content !== undefined) report.content = dto.content;
    if (dto.priority !== undefined) report.priority = dto.priority;
    if (dto.visibleToFamily !== undefined) report.visibleToFamily = dto.visibleToFamily;

    return this.reportRepo.save(report);
  }

  /**
   * ELIMINAR INFORME
   * Solo el autor o admin pueden eliminar
   */
  async deleteReport(reportId: string, userId: string, isAdmin: boolean): Promise<void> {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });

    if (!report) {
      throw new NotFoundException('Informe no encontrado');
    }

    if (!isAdmin) {
      const teacher = await this.teacherRepo.findOne({
        where: { user: { id: userId } },
      });

      if (!teacher || report.authorTeacherId !== teacher.id) {
        throw new ForbiddenException('No tienes permiso para eliminar este informe');
      }
    }

    await this.reportRepo.remove(report);
  }

  /**
   * OBTENER MIS INFORMES COMO PROFESOR
   * Lista todos los informes que he escrito
   */
  async getMyReports(userId: string, academicYearId?: string): Promise<StudentQualitativeReport[]> {
    const teacher = await this.teacherRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!teacher) {
      throw new ForbiddenException('No tienes perfil de profesor');
    }

    const qb = this.reportRepo.createQueryBuilder('report')
      .leftJoinAndSelect('report.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .leftJoinAndSelect('student.classGroups', 'classGroup')
      .where('report.authorTeacherId = :teacherId', { teacherId: teacher.id });

    if (academicYearId) {
      qb.andWhere('report.academicYearId = :academicYearId', { academicYearId });
    }

    qb.orderBy('report.updatedAt', 'DESC');

    return qb.getMany();
  }

  /**
   * OBTENER INFORME EXISTENTE PARA UN ESTUDIANTE (si existe)
   * Útil para cargar datos en el formulario de edición
   */
  async getExistingReport(
    userId: string,
    studentId: string,
    contextTag?: string,
    academicYearId?: string,
  ): Promise<StudentQualitativeReport | null> {
    const teacher = await this.teacherRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!teacher) {
      return null;
    }

    const qb = this.reportRepo.createQueryBuilder('report')
      .where('report.authorTeacherId = :teacherId', { teacherId: teacher.id })
      .andWhere('report.studentId = :studentId', { studentId });

    if (contextTag) {
      qb.andWhere('report.contextTag = :contextTag', { contextTag });
    }

    if (academicYearId) {
      qb.andWhere('report.academicYearId = :academicYearId', { academicYearId });
    }

    return qb.getOne();
  }

  /**
   * OBTENER TODOS LOS INFORMES DE UN ESTUDIANTE
   * Vista del Tutor: ve todos los informes de todos los profesores
   */
  async getStudentReports(
    studentId: string,
    academicYearId?: string,
  ): Promise<StudentQualitativeReport[]> {
    const qb = this.reportRepo.createQueryBuilder('report')
      .leftJoinAndSelect('report.authorTeacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
      .leftJoinAndSelect('report.academicYear', 'academicYear')
      .where('report.studentId = :studentId', { studentId });

    if (academicYearId) {
      qb.andWhere('report.academicYearId = :academicYearId', { academicYearId });
    }

    qb.orderBy('report.priority', 'DESC')
      .addOrderBy('report.updatedAt', 'DESC');

    return qb.getMany();
  }

  /**
   * OBTENER ESTADÍSTICAS DE INFORMES DE UN ESTUDIANTE
   */
  async getStudentReportStats(
    studentId: string,
    academicYearId?: string,
  ): Promise<{
    totalReports: number;
    byContext: { contextTag: string; count: number }[];
    byPriority: { priority: number; count: number }[];
    lastReportDate: Date | null;
  }> {
    const reports = await this.getStudentReports(studentId, academicYearId);

    const byContext = new Map<string, number>();
    const byPriority = new Map<number, number>();
    let lastReportDate: Date | null = null;

    for (const report of reports) {
      byContext.set(report.contextTag, (byContext.get(report.contextTag) || 0) + 1);
      byPriority.set(report.priority, (byPriority.get(report.priority) || 0) + 1);

      if (!lastReportDate || report.updatedAt > lastReportDate) {
        lastReportDate = report.updatedAt;
      }
    }

    return {
      totalReports: reports.length,
      byContext: Array.from(byContext.entries()).map(([contextTag, count]) => ({ contextTag, count })),
      byPriority: Array.from(byPriority.entries()).map(([priority, count]) => ({ priority, count })),
      lastReportDate,
    };
  }

  /**
   * OBTENER ETIQUETAS DE CONTEXTO PREDEFINIDAS
   */
  getPredefinedContextTags(): string[] {
    return PREDEFINED_CONTEXT_TAGS;
  }

  /**
   * OBTENER TODAS LAS ETIQUETAS USADAS (para autocompletado)
   */
  async getUsedContextTags(academicYearId?: string): Promise<string[]> {
    const qb = this.reportRepo.createQueryBuilder('report')
      .select('DISTINCT report.contextTag', 'contextTag');

    if (academicYearId) {
      qb.where('report.academicYearId = :academicYearId', { academicYearId });
    }

    const results = await qb.getRawMany();
    return results.map(r => r.contextTag);
  }

  /**
   * VISTA DEL TUTOR: OBTENER TODOS LOS ESTUDIANTES TUTORADOS CON SUS INFORMES
   * Retorna una vista consolidada de todos los estudiantes de los grupos que tutoriza
   * con todos los informes que otros profesores han escrito sobre ellos
   */
  async getTutoredStudentsWithReports(
    userId: string,
    academicYearId?: string,
  ): Promise<{
    classGroups: Array<{
      id: string;
      name: string;
      students: Array<{
        id: string;
        enrollmentNumber: string;
        firstName: string;
        lastName: string;
        photoUrl: string | null;
        reports: Array<{
          id: string;
          contextTag: string;
          content: string;
          priority: number;
          priorityLabel: string;
          authorName: string;
          authorEmail: string;
          createdAt: Date;
          updatedAt: Date;
        }>;
        totalReports: number;
        hasHighPriority: boolean;
        lastReportDate: Date | null;
      }>;
      totalStudents: number;
      totalReports: number;
      studentsWithReports: number;
    }>;
    summary: {
      totalGroups: number;
      totalStudents: number;
      totalReports: number;
      studentsWithReports: number;
      highPriorityCount: number;
    };
  }> {
    // Obtener el teacher desde el user
    const teacher = await this.teacherRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!teacher) {
      throw new ForbiddenException('No tienes perfil de profesor');
    }

    // Obtener los grupos de clase donde este profesor es tutor
    const classGroups = await this.classGroupRepo.find({
      where: { tutor: { id: teacher.id } },
      relations: [
        'students',
        'students.user',
        'students.user.profile',
      ],
      order: { name: 'ASC' },
    });

    if (classGroups.length === 0) {
      return {
        classGroups: [],
        summary: {
          totalGroups: 0,
          totalStudents: 0,
          totalReports: 0,
          studentsWithReports: 0,
          highPriorityCount: 0,
        },
      };
    }

    // Recopilar todos los IDs de estudiantes
    const allStudentIds: string[] = [];
    classGroups.forEach(group => {
      group.students?.forEach(student => {
        if (student.id) allStudentIds.push(student.id);
      });
    });

    // Obtener todos los informes de todos los estudiantes tutorados
    let allReports: StudentQualitativeReport[] = [];
    if (allStudentIds.length > 0) {
      const qb = this.reportRepo.createQueryBuilder('report')
        .leftJoinAndSelect('report.authorTeacher', 'teacher')
        .leftJoinAndSelect('teacher.user', 'teacherUser')
        .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
        .where('report.studentId IN (:...studentIds)', { studentIds: allStudentIds });

      if (academicYearId) {
        qb.andWhere('report.academicYearId = :academicYearId', { academicYearId });
      }

      qb.orderBy('report.priority', 'DESC')
        .addOrderBy('report.updatedAt', 'DESC');

      allReports = await qb.getMany();
    }

    // Crear un mapa de reportes por estudiante
    const reportsByStudent = new Map<string, StudentQualitativeReport[]>();
    allReports.forEach(report => {
      if (!reportsByStudent.has(report.studentId)) {
        reportsByStudent.set(report.studentId, []);
      }
      reportsByStudent.get(report.studentId)!.push(report);
    });

    // Mapeo de prioridades
    const priorityLabels: Record<number, string> = {
      1: 'Informativo',
      2: 'Normal',
      3: 'Importante',
      4: 'Urgente',
    };

    // Construir la respuesta
    let totalStudents = 0;
    let totalReports = 0;
    let studentsWithReports = 0;
    let highPriorityCount = 0;

    const result = classGroups.map(group => {
      const students = (group.students || []).map(student => {
        const studentReports = reportsByStudent.get(student.id) || [];
        const hasHighPriority = studentReports.some(r => r.priority >= 3);

        if (hasHighPriority) highPriorityCount++;
        if (studentReports.length > 0) studentsWithReports++;
        totalReports += studentReports.length;

        return {
          id: student.id,
          enrollmentNumber: student.enrollmentNumber || '',
          firstName: student.user?.profile?.firstName || '',
          lastName: student.user?.profile?.lastName || '',
          photoUrl: student.user?.profile?.avatarUrl || student.photoUrl || null,
          reports: studentReports.map(r => ({
            id: r.id,
            contextTag: r.contextTag,
            content: r.content,
            priority: r.priority,
            priorityLabel: priorityLabels[r.priority] || 'Normal',
            authorName: `${r.authorTeacher?.user?.profile?.firstName || ''} ${r.authorTeacher?.user?.profile?.lastName || ''}`.trim(),
            authorEmail: r.authorTeacher?.user?.email || '',
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          })),
          totalReports: studentReports.length,
          hasHighPriority,
          lastReportDate: studentReports.length > 0 ? studentReports[0].updatedAt : null,
        };
      });

      // Ordenar estudiantes: primero los que tienen informes de alta prioridad
      students.sort((a, b) => {
        if (a.hasHighPriority && !b.hasHighPriority) return -1;
        if (!a.hasHighPriority && b.hasHighPriority) return 1;
        if (a.totalReports !== b.totalReports) return b.totalReports - a.totalReports;
        return a.lastName.localeCompare(b.lastName);
      });

      totalStudents += students.length;

      return {
        id: group.id,
        name: group.name,
        students,
        totalStudents: students.length,
        totalReports: students.reduce((sum, s) => sum + s.totalReports, 0),
        studentsWithReports: students.filter(s => s.totalReports > 0).length,
      };
    });

    return {
      classGroups: result,
      summary: {
        totalGroups: classGroups.length,
        totalStudents,
        totalReports,
        studentsWithReports,
        highPriorityCount,
      },
    };
  }

  /**
   * OBTENER INFORMACIÓN BÁSICA DE UN ESTUDIANTE
   * Útil para generar PDFs cuando no hay reportes
   */
  async getStudentBasicInfo(studentId: string): Promise<{
    id: string;
    firstName: string;
    lastName: string;
    enrollmentNumber: string;
    classGroup: string;
  } | null> {
    const student = await this.studentRepo.findOne({
      where: { id: studentId },
      relations: ['user', 'user.profile', 'classGroups'],
    });

    if (!student) {
      return null;
    }

    return {
      id: student.id,
      firstName: student.user?.profile?.firstName || '',
      lastName: student.user?.profile?.lastName || '',
      enrollmentNumber: student.enrollmentNumber || '',
      classGroup: student.classGroups?.[0]?.name || '',
    };
  }
}
