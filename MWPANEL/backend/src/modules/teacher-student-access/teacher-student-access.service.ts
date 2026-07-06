import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherStudentAccess, AccessType, AccessReason } from './entities/teacher-student-access.entity';
import { Student } from '../students/entities/student.entity';
import {
  CreateAccessDto,
  UpdateAccessDto,
  QueryAccessDto,
  BulkAssignAllDto,
  BulkAssignDto,
} from './dto/teacher-student-access.dto';

const ACCESS_TYPE_LABELS: Record<string, string> = {
  read: 'Solo lectura',
  write: 'Lectura y escritura',
  full: 'Acceso completo',
};

const REASON_LABELS: Record<string, string> = {
  tutor: 'Tutor',
  support: 'Apoyo educativo',
  coordinator: 'Coordinador',
  counselor: 'Orientador',
  substitute: 'Sustituto',
  special_needs: 'Necesidades especiales',
  admin_override: 'Asignación administrativa',
  other: 'Otro',
};

@Injectable()
export class TeacherStudentAccessService {
  constructor(
    @InjectRepository(TeacherStudentAccess)
    private readonly repo: Repository<TeacherStudentAccess>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
  ) {}

  private formatAccess(access: TeacherStudentAccess) {
    const now = new Date();
    const isExpired = access.expiresAt ? new Date(access.expiresAt) < now : false;
    const isValid = access.isActive && !isExpired;

    return {
      ...access,
      accessTypeLabel: ACCESS_TYPE_LABELS[access.accessType] || access.accessType,
      reasonLabel: REASON_LABELS[access.reason] || access.reason,
      isExpired,
      isValid,
      teacher: access.teacher
        ? {
            id: access.teacher.id,
            firstName: (access.teacher.user as any)?.profile?.firstName || '',
            lastName: (access.teacher.user as any)?.profile?.lastName || '',
            email: (access.teacher.user as any)?.email || '',
            photoUrl: (access.teacher.user as any)?.profile?.avatarUrl || null,
          }
        : null,
      student: access.student
        ? {
            id: access.student.id,
            enrollmentNumber: (access.student as any).enrollmentNumber,
            firstName: (access.student.user as any)?.profile?.firstName || '',
            lastName: (access.student.user as any)?.profile?.lastName || '',
            photoUrl: (access.student.user as any)?.profile?.avatarUrl || null,
          }
        : null,
      academicYear: access.academicYear
        ? { id: access.academicYear.id, name: (access.academicYear as any).name }
        : null,
      grantedBy: access.grantedBy
        ? {
            id: access.grantedBy.id,
            firstName: (access.grantedBy as any)?.profile?.firstName || '',
            lastName: (access.grantedBy as any)?.profile?.lastName || '',
          }
        : null,
    };
  }

  private baseQuery() {
    return this.repo
      .createQueryBuilder('access')
      .leftJoinAndSelect('access.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
      .leftJoinAndSelect('access.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .leftJoinAndSelect('access.academicYear', 'academicYear')
      .leftJoinAndSelect('access.grantedBy', 'grantedBy')
      .leftJoinAndSelect('grantedBy.profile', 'grantedByProfile');
  }

  async create(dto: CreateAccessDto, grantedById: string): Promise<any> {
    // Check for duplicate
    const existing = await this.repo.findOne({
      where: {
        teacherId: dto.teacherId,
        studentId: dto.studentId,
        academicYearId: dto.academicYearId,
      },
    });
    if (existing) {
      throw new ConflictException('Ya existe un acceso para este profesor y estudiante en este año académico');
    }

    const access = this.repo.create({
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      grantedById,
    });
    const saved = await this.repo.save(access);
    const full = await this.baseQuery().where('access.id = :id', { id: saved.id }).getOne();
    return this.formatAccess(full!);
  }

  async update(id: string, dto: UpdateAccessDto): Promise<any> {
    const access = await this.repo.findOne({ where: { id } });
    if (!access) throw new NotFoundException('Acceso no encontrado');

    Object.assign(access, {
      ...dto,
      expiresAt: dto.expiresAt !== undefined
        ? (dto.expiresAt ? new Date(dto.expiresAt) : null)
        : access.expiresAt,
    });
    await this.repo.save(access);
    const full = await this.baseQuery().where('access.id = :id', { id }).getOne();
    return this.formatAccess(full!);
  }

  async deactivate(id: string): Promise<any> {
    return this.update(id, { isActive: false });
  }

  async delete(id: string): Promise<void> {
    const access = await this.repo.findOne({ where: { id } });
    if (!access) throw new NotFoundException('Acceso no encontrado');
    await this.repo.remove(access);
  }

  async findOne(id: string): Promise<any> {
    const access = await this.baseQuery().where('access.id = :id', { id }).getOne();
    if (!access) throw new NotFoundException('Acceso no encontrado');
    return this.formatAccess(access);
  }

  async findAll(query: QueryAccessDto): Promise<any[]> {
    const qb = this.baseQuery();

    if (query.teacherId) qb.andWhere('access.teacherId = :teacherId', { teacherId: query.teacherId });
    if (query.studentId) qb.andWhere('access.studentId = :studentId', { studentId: query.studentId });
    if (query.academicYearId) qb.andWhere('access.academicYearId = :academicYearId', { academicYearId: query.academicYearId });
    if (query.accessType) qb.andWhere('access.accessType = :accessType', { accessType: query.accessType });
    if (query.reason) qb.andWhere('access.reason = :reason', { reason: query.reason });
    if (query.isActive !== undefined) {
      const isActive = query.isActive === true || query.isActive === 'true';
      qb.andWhere('access.isActive = :isActive', { isActive });
    }

    const accesses = await qb.orderBy('access.createdAt', 'DESC').getMany();
    return accesses.map((a) => this.formatAccess(a));
  }

  async findByTeacher(teacherId: string, academicYearId?: string, activeOnly = true): Promise<any[]> {
    const query: QueryAccessDto = { teacherId };
    if (academicYearId) query.academicYearId = academicYearId;
    if (activeOnly) query.isActive = true;
    return this.findAll(query);
  }

  async findByStudent(studentId: string, academicYearId?: string, activeOnly = true): Promise<any[]> {
    const query: QueryAccessDto = { studentId };
    if (academicYearId) query.academicYearId = academicYearId;
    if (activeOnly) query.isActive = true;
    return this.findAll(query);
  }

  async copyToNewYear(fromAcademicYearId: string, toAcademicYearId: string): Promise<{ copiedCount: number; message: string }> {
    const existing = await this.repo.find({
      where: { academicYearId: fromAcademicYearId, isActive: true },
    });

    let copiedCount = 0;
    for (const access of existing) {
      const alreadyExists = await this.repo.findOne({
        where: {
          teacherId: access.teacherId,
          studentId: access.studentId,
          academicYearId: toAcademicYearId,
        },
      });
      if (!alreadyExists) {
        await this.repo.save(
          this.repo.create({
            teacherId: access.teacherId,
            studentId: access.studentId,
            academicYearId: toAcademicYearId,
            accessType: access.accessType,
            reason: access.reason,
            notes: access.notes,
            grantedById: access.grantedById,
          }),
        );
        copiedCount++;
      }
    }
    return { copiedCount, message: `Se copiaron ${copiedCount} accesos al nuevo año académico` };
  }

  async bulkAssign(
    dto: BulkAssignDto,
    grantedById: string,
  ): Promise<{ created: number; skipped: number; total: number }> {
    const accessType: AccessType = dto.accessType ?? 'read';
    const reason: AccessReason = dto.reason ?? 'admin_override';

    const existingAccesses = await this.repo.find({
      where: { teacherId: dto.teacherId, academicYearId: dto.academicYearId },
      select: ['studentId'],
    });
    const existingStudentIds = new Set(existingAccesses.map((a) => a.studentId));

    let created = 0;
    let skipped = 0;

    for (const studentId of dto.studentIds) {
      if (existingStudentIds.has(studentId)) {
        skipped++;
        continue;
      }
      await this.repo.save(
        this.repo.create({
          teacherId: dto.teacherId,
          studentId,
          academicYearId: dto.academicYearId,
          accessType,
          reason,
          notes: dto.notes ?? null,
          grantedById,
        }),
      );
      created++;
    }

    return { created, skipped, total: dto.studentIds.length };
  }

  async bulkAssignToAll(
    dto: BulkAssignAllDto,
    grantedById: string,
  ): Promise<{ created: number; skipped: number; total: number }> {
    const students = await this.studentRepo.find({ relations: ['user'] });
    const accessType: AccessType = dto.accessType ?? 'read';
    const reason: AccessReason = dto.reason ?? 'admin_override';

    // Fetch all existing accesses for this teacher+year in one query
    const existingAccesses = await this.repo.find({
      where: { teacherId: dto.teacherId, academicYearId: dto.academicYearId },
      select: ['studentId'],
    });
    const existingStudentIds = new Set(existingAccesses.map((a) => a.studentId));

    let created = 0;
    let skipped = 0;

    for (const student of students) {
      if (existingStudentIds.has(student.id)) {
        skipped++;
        continue;
      }
      await this.repo.save(
        this.repo.create({
          teacherId: dto.teacherId,
          studentId: student.id,
          academicYearId: dto.academicYearId,
          accessType,
          reason,
          notes: dto.notes ?? null,
          grantedById,
        }),
      );
      created++;
    }

    return { created, skipped, total: students.length };
  }

  getAccessTypes() {
    return [
      { value: 'read', label: 'Solo lectura' },
      { value: 'write', label: 'Lectura y escritura' },
      { value: 'full', label: 'Acceso completo' },
    ];
  }

  getAccessReasons() {
    return [
      { value: 'tutor', label: 'Tutor' },
      { value: 'support', label: 'Apoyo educativo' },
      { value: 'coordinator', label: 'Coordinador' },
      { value: 'counselor', label: 'Orientador' },
      { value: 'substitute', label: 'Sustituto' },
      { value: 'special_needs', label: 'Necesidades especiales' },
      { value: 'admin_override', label: 'Asignación administrativa' },
      { value: 'other', label: 'Otro' },
    ];
  }
}
