import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { StudentSubjectLevelAssignment } from './entities/student-subject-level-assignment.entity';
import { StudentCurriculumAuditLog } from './entities/student-curriculum-audit-log.entity';
import { Student } from '../students/entities/student.entity';
import { Course } from '../students/entities/course.entity';
import { SpecificCompetency } from '../competencies/entities/specific-competency.entity';
import { BasicKnowledge } from '../competencies/entities/basic-knowledge.entity';

export type CriterionView = { id: string; code: string; description: string };
export type SaberView = { id: string; code: string | null; title: string | null; description: string };
export type CompetencyGroup = { id: string; code: string; name: string; criteria: CriterionView[] };
export type CourseCurriculumGroup = { courseId: string; courseName: string; competencies: CompetencyGroup[]; saberes: SaberView[] };
export type ActiveCourse = { courseId: string; courseName: string; validFrom: string };
export type SubjectCurriculumView = { activeCourses: ActiveCourse[]; catalog: CourseCurriculumGroup[] };

@Injectable()
export class StudentCurriculumService {
  constructor(
    @InjectRepository(StudentSubjectLevelAssignment) private readonly levelRepo: Repository<StudentSubjectLevelAssignment>,
    @InjectRepository(StudentCurriculumAuditLog) private readonly auditRepo: Repository<StudentCurriculumAuditLog>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectRepository(SpecificCompetency) private readonly specRepo: Repository<SpecificCompetency>,
    @InjectRepository(BasicKnowledge) private readonly bkRepo: Repository<BasicKnowledge>,
    private readonly dataSource: DataSource,
  ) {}

  async getCurriculumCatalogForCourses(subjectId: string, courseIds: string[]): Promise<CourseCurriculumGroup[]> {
    if (!courseIds.length) return [];
    const courses = await this.courseRepo.find({ where: { id: In(courseIds) } });
    const specComps = await this.specRepo.find({
      where: { subjectId },
      relations: ['evaluationCriteria'],
      order: { order: 'ASC' },
    });
    const byOrder = (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0);
    const groups: CourseCurriculumGroup[] = [];
    for (const course of courses) {
      const matches = (x: any) =>
        (x.courseId && x.courseId === course.id) ||
        (x.cycleId && (course as any).cycleId && x.cycleId === (course as any).cycleId);
      const competencies: CompetencyGroup[] = specComps
        .map((sc: any) => ({
          id: sc.id, code: sc.code, name: sc.name,
          criteria: (sc.evaluationCriteria || []).filter(matches).sort(byOrder)
            .map((c: any) => ({ id: c.id, code: c.code, description: c.description })),
        }))
        .filter((g) => g.criteria.length > 0);
      // Saberes básicos: anclados al ÁREA (subject + curso/ciclo), NO a la competencia específica.
      const where: any[] = [{ subjectId, courseId: course.id }];
      if ((course as any).cycleId) where.push({ subjectId, cycleId: (course as any).cycleId });
      const bkRows = await this.bkRepo.find({ where, order: { block: 'ASC', order: 'ASC' } });
      const saberes: SaberView[] = bkRows.map((k: any) => ({
        id: k.id, code: k.code ?? null, title: k.title ?? null, description: k.description,
      }));
      groups.push({ courseId: course.id, courseName: course.name, competencies, saberes });
    }
    return groups;
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private async activeRows(studentId: string, subjectId: string, academicYearId: string) {
    return this.levelRepo.find({
      where: { studentId, subjectId, academicYearId, validTo: IsNull() },
      relations: ['course'],
      order: { validFrom: 'ASC' },
    });
  }

  async getSubjectCurriculum(studentId: string, subjectId: string, academicYearId: string): Promise<SubjectCurriculumView> {
    const active = await this.activeRows(studentId, subjectId, academicYearId);
    let courseIds = active.map((a) => a.courseId);
    let activeCourses: ActiveCourse[] = active.map((a) => ({
      courseId: a.courseId, courseName: (a as any).course?.name ?? '', validFrom: a.validFrom,
    }));
    if (courseIds.length === 0) {
      const student = await this.studentRepo.findOne({ where: { id: studentId }, relations: ['course'] });
      const refCourseId = (student as any)?.course?.id ?? null;
      const refCourseName = (student as any)?.course?.name ?? '';
      if (refCourseId) {
        courseIds = [refCourseId];
        activeCourses = [{ courseId: refCourseId, courseName: refCourseName, validFrom: '' }];
      }
    }
    const catalog = await this.getCurriculumCatalogForCourses(subjectId, courseIds);
    return { activeCourses, catalog };
  }

  private requireReason(reason: string) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('El motivo es obligatorio');
    }
  }

  async changeBlock(input: { studentId: string; subjectId: string; academicYearId: string; newCourseId: string; reason: string; subjectAssignmentId?: string }, actorUserId: string): Promise<SubjectCurriculumView> {
    this.requireReason(input.reason);
    // M5: no-op si ya está exactamente en ese único curso (evita fila validFrom==validTo y auditoría vacía)
    const activePre = await this.activeRows(input.studentId, input.subjectId, input.academicYearId);
    if (activePre.length === 1 && activePre[0].courseId === input.newCourseId) {
      return this.getSubjectCurriculum(input.studentId, input.subjectId, input.academicYearId);
    }
    const today = this.todayIso();
    await this.dataSource.transaction(async (mgr) => {
      const lr = mgr.getRepository(StudentSubjectLevelAssignment);
      const active = await lr.find({ where: { studentId: input.studentId, subjectId: input.subjectId, academicYearId: input.academicYearId, validTo: IsNull() } });
      const before = active.map((a) => a.courseId);
      for (const row of active) { row.validTo = today; await lr.save(row); }
      await lr.save(lr.create({
        studentId: input.studentId, subjectId: input.subjectId, academicYearId: input.academicYearId,
        courseId: input.newCourseId, subjectAssignmentId: input.subjectAssignmentId ?? null,
        validFrom: today, validTo: null, createdById: actorUserId, reason: input.reason,
      }));
      await mgr.getRepository(StudentCurriculumAuditLog).save({
        studentId: input.studentId, subjectId: input.subjectId, academicYearId: input.academicYearId,
        action: 'change_block', oldValue: { courses: before }, newValue: { courses: [input.newCourseId] },
        reason: input.reason, changedById: actorUserId,
      });
    });
    return this.getSubjectCurriculum(input.studentId, input.subjectId, input.academicYearId);
  }

  async addCourse(input: { studentId: string; subjectId: string; academicYearId: string; courseId: string; reason: string; subjectAssignmentId?: string }, actorUserId: string): Promise<SubjectCurriculumView> {
    this.requireReason(input.reason);
    const today = this.todayIso();
    // M7: comprobación de duplicado DENTRO de la transacción (evita dos filas activas del mismo curso en carreras concurrentes)
    await this.dataSource.transaction(async (mgr) => {
      const lr = mgr.getRepository(StudentSubjectLevelAssignment);
      const active = await lr.find({ where: { studentId: input.studentId, subjectId: input.subjectId, academicYearId: input.academicYearId, validTo: IsNull() } });
      if (active.some((a) => a.courseId === input.courseId)) return; // idempotente
      await lr.save(lr.create({
        studentId: input.studentId, subjectId: input.subjectId, academicYearId: input.academicYearId,
        courseId: input.courseId, subjectAssignmentId: input.subjectAssignmentId ?? null,
        validFrom: today, validTo: null, createdById: actorUserId, reason: input.reason,
      }));
      await mgr.getRepository(StudentCurriculumAuditLog).save({
        studentId: input.studentId, subjectId: input.subjectId, academicYearId: input.academicYearId,
        action: 'add_course', oldValue: { courses: active.map((a) => a.courseId) },
        newValue: { courses: [...active.map((a) => a.courseId), input.courseId] },
        reason: input.reason, changedById: actorUserId,
      });
    });
    return this.getSubjectCurriculum(input.studentId, input.subjectId, input.academicYearId);
  }

  async removeCourse(input: { studentId: string; subjectId: string; academicYearId: string; courseId: string; reason: string }, actorUserId: string): Promise<SubjectCurriculumView> {
    this.requireReason(input.reason);
    const today = this.todayIso();
    await this.dataSource.transaction(async (mgr) => {
      const lr = mgr.getRepository(StudentSubjectLevelAssignment);
      const active = await lr.find({ where: { studentId: input.studentId, subjectId: input.subjectId, academicYearId: input.academicYearId, courseId: input.courseId, validTo: IsNull() } });
      for (const row of active) { row.validTo = today; await lr.save(row); }
      await mgr.getRepository(StudentCurriculumAuditLog).save({
        studentId: input.studentId, subjectId: input.subjectId, academicYearId: input.academicYearId,
        action: 'remove_course', oldValue: { courseId: input.courseId }, newValue: null,
        reason: input.reason, changedById: actorUserId,
      });
    });
    return this.getSubjectCurriculum(input.studentId, input.subjectId, input.academicYearId);
  }

  async getAuditLog(filter: { studentId?: string; subjectId?: string }): Promise<StudentCurriculumAuditLog[]> {
    const where: any = {};
    if (filter.studentId) where.studentId = filter.studentId;
    if (filter.subjectId) where.subjectId = filter.subjectId;
    return this.auditRepo.find({ where, order: { createdAt: 'DESC' }, take: 200 });
  }
}
