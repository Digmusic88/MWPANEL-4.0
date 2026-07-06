import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { SpecificCompetency } from '../../competencies/entities/specific-competency.entity';
import { Subject } from '../../students/entities/subject.entity';

@Injectable()
export class ApplicableCriteriaService {
  constructor(
    @InjectRepository(SubjectAssignment) private readonly assignmentRepo: Repository<SubjectAssignment>,
    @InjectRepository(SpecificCompetency) private readonly specCompRepo: Repository<SpecificCompetency>,
    @InjectRepository(Subject) private readonly subjectRepo: Repository<Subject>,
  ) {}

  async getForAssignment(subjectAssignmentId: string) {
    const assignment: SubjectAssignment = await this.assignmentRepo.findOne({
      where: { id: subjectAssignmentId },
      relations: [
        'subject',
        'classGroups',
        'classGroups.courses',
        'classGroups.courses.cycle',
        'classGroups.students',
        'classGroups.students.user',
        'classGroups.students.user.profile',
      ],
    });
    if (!assignment) throw new NotFoundException('Asignación no encontrada');

    // Build deduplicated student list from classGroups
    const studentEntities = (assignment.classGroups || [])
      .flatMap((g: any) => g.students || [])
      .filter((s: any) => s.user?.isActive);
    const byId = new Map<string, any>();
    for (const s of studentEntities) if (!byId.has(s.id)) byId.set(s.id, s);
    const students = [...byId.values()].map((s: any) => ({
      id: s.id,
      name: `${s.user?.profile?.firstName ?? ''} ${s.user?.profile?.lastName ?? ''}`.trim(),
    }));

    // Resolve courseIds and cycleIds from the classGroup's courses relation
    // (NOT from students, because students often have courseId NULL)
    const courseIds = new Set<string>();
    const cycleIds = new Set<string>();
    for (const group of (assignment.classGroups || [])) {
      for (const course of (group.courses || [])) {
        if (course.id) courseIds.add(course.id);
        if (course.cycle?.id) cycleIds.add(course.cycle.id);
      }
    }

    // Resolve the área's competencies by subject name (all variants share the same name)
    const subjectName = (assignment as any).subject?.name;
    if (!subjectName) return { students, groups: [] };

    const sameAreaSubjects = await this.subjectRepo.find({ where: { name: subjectName } });
    if (sameAreaSubjects.length === 0) return { students, groups: [] };

    const subjectIds = sameAreaSubjects.map((s) => s.id);

    const specComps = await this.specCompRepo.find({
      where: { subjectId: In(subjectIds) },
      relations: ['evaluationCriteria'],
      order: { order: 'ASC' },
    });

    const groups = specComps
      .map((sc: any) => {
        const criteria = (sc.evaluationCriteria || [])
          .filter((c: any) =>
            (c.courseId && courseIds.has(c.courseId)) ||
            (c.cycleId && cycleIds.has(c.cycleId)),
          )
          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
          .map((c: any) => ({ id: c.id, code: c.code, description: c.description }));
        return { specificCompetency: { id: sc.id, code: sc.code, name: sc.name }, criteria };
      })
      .filter((g) => g.criteria.length > 0);

    return { students, groups };
  }
}
