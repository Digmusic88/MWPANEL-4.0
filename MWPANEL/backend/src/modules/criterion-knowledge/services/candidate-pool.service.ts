import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EvaluationCriterion } from '../../competencies/entities/evaluation-criterion.entity';
import { SpecificCompetency } from '../../competencies/entities/specific-competency.entity';
import { Subject } from '../../students/entities/subject.entity';
import { BasicKnowledge } from '../../competencies/entities/basic-knowledge.entity';
import { Course } from '../../students/entities/course.entity';

@Injectable()
export class CandidatePoolService {
  constructor(
    @InjectRepository(EvaluationCriterion) private readonly criterionRepo: Repository<EvaluationCriterion>,
    @InjectRepository(SpecificCompetency) private readonly specCompRepo: Repository<SpecificCompetency>,
    @InjectRepository(Subject) private readonly subjectRepo: Repository<Subject>,
    @InjectRepository(BasicKnowledge) private readonly knowledgeRepo: Repository<BasicKnowledge>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
  ) {}

  async buildScope(criterion: EvaluationCriterion): Promise<{ courseIds: Set<string>; cycleIds: Set<string> }> {
    const courseIds = new Set<string>();
    const cycleIds = new Set<string>();
    if (criterion.courseId) {
      courseIds.add(criterion.courseId);
      const course = await this.courseRepo.findOne({ where: { id: criterion.courseId } });
      // cycleId is the FK column in the DB; the entity declares it via @JoinColumn but not @Column
      const cycleId = (course as any)?.cycleId;
      if (cycleId) cycleIds.add(cycleId);
    }
    if (criterion.cycleId) {
      cycleIds.add(criterion.cycleId);
      const courses = await this.courseRepo.find({ where: { cycleId: criterion.cycleId } as any });
      for (const c of courses) courseIds.add(c.id);
    }
    return { courseIds, cycleIds };
  }

  async getCandidates(criterionId: string): Promise<BasicKnowledge[]> {
    const criterion = await this.criterionRepo.findOne({
      where: { id: criterionId },
      relations: ['specificCompetency', 'specificCompetency.subject'],
    });
    if (!criterion) throw new NotFoundException('Criterio no encontrado');

    const subjectName = (criterion.specificCompetency as any)?.subject?.name;
    if (!subjectName) return [];
    const sameAreaSubjects = await this.subjectRepo.find({ where: { name: subjectName } });
    const subjectIds = sameAreaSubjects.map((s) => s.id);
    if (subjectIds.length === 0) return [];

    const { courseIds, cycleIds } = await this.buildScope(criterion);
    const inArea = await this.knowledgeRepo.find({ where: { subjectId: In(subjectIds) } });
    const subjectIdSet = new Set(subjectIds);
    return inArea.filter(
      (k) =>
        subjectIdSet.has(k.subjectId) &&
        ((k.courseId && courseIds.has(k.courseId)) || (k.cycleId && cycleIds.has(k.cycleId))),
    );
  }

  /** Fallback: todos los saberes del área (asignatura) sin filtrar por curso/ciclo. */
  async getSubjectWideCandidates(criterionId: string): Promise<BasicKnowledge[]> {
    const criterion = await this.criterionRepo.findOne({
      where: { id: criterionId },
      relations: ['specificCompetency', 'specificCompetency.subject'],
    });
    if (!criterion) return [];
    const subjectName = (criterion.specificCompetency as any)?.subject?.name;
    if (!subjectName) return [];
    const sameAreaSubjects = await this.subjectRepo.find({ where: { name: subjectName } });
    const subjectIds = sameAreaSubjects.map((s) => s.id);
    if (subjectIds.length === 0) return [];
    return this.knowledgeRepo.find({ where: { subjectId: In(subjectIds) } });
  }
}
