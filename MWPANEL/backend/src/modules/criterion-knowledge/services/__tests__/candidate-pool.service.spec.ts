import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In } from 'typeorm';
import { CandidatePoolService } from '../candidate-pool.service';
import { EvaluationCriterion } from '../../../competencies/entities/evaluation-criterion.entity';
import { SpecificCompetency } from '../../../competencies/entities/specific-competency.entity';
import { Subject } from '../../../students/entities/subject.entity';
import { BasicKnowledge } from '../../../competencies/entities/basic-knowledge.entity';
import { Course } from '../../../students/entities/course.entity';

describe('CandidatePoolService', () => {
  const make = (overrides: any) => {
    const criterion = { id: 'c1', courseId: 'course-3p', cycleId: null,
      specificCompetency: { id: 'sc1', subjectId: 'subj-cmn-3p', subject: { id: 'subj-cmn-3p', name: 'Conocimiento del Medio' } } };
    const repos: any = {
      criterion: { findOne: jest.fn().mockResolvedValue(criterion) },
      subject: { find: jest.fn().mockResolvedValue([{ id: 'subj-cmn-3p' }, { id: 'subj-cmn-4p' }]) },
      course: { findOne: jest.fn().mockResolvedValue({ id: 'course-3p', cycleId: 'cycle-2' }), find: jest.fn().mockResolvedValue([]) },
      knowledge: { find: jest.fn().mockResolvedValue([
        { id: 'k-match-course', subjectId: 'subj-cmn-3p', courseId: 'course-3p', cycleId: null },
        { id: 'k-match-cycle', subjectId: 'subj-cmn-4p', courseId: null, cycleId: 'cycle-2' },
        { id: 'k-other-area', subjectId: 'subj-mat', courseId: 'course-3p', cycleId: null },
        { id: 'k-other-scope', subjectId: 'subj-cmn-3p', courseId: 'course-9', cycleId: null },
      ]) },
      ...overrides,
    };
    return { criterion, repos };
  };

  const build = async (repos: any) => {
    const mod = await Test.createTestingModule({
      providers: [
        CandidatePoolService,
        { provide: getRepositoryToken(EvaluationCriterion), useValue: repos.criterion },
        { provide: getRepositoryToken(SpecificCompetency), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Subject), useValue: repos.subject },
        { provide: getRepositoryToken(BasicKnowledge), useValue: repos.knowledge },
        { provide: getRepositoryToken(Course), useValue: repos.course },
      ],
    }).compile();
    return mod.get(CandidatePoolService);
  };

  it('incluye saberes de la misma área que coinciden por curso o por ciclo del curso', async () => {
    const { repos } = make({});
    const svc = await build(repos);
    const result = await svc.getCandidates('c1');
    const ids = result.map((k: any) => k.id).sort();
    expect(ids).toEqual(['k-match-course', 'k-match-cycle'].sort());
    // la query a knowledge filtró por subjectIds del área
    expect(repos.knowledge.find).toHaveBeenCalledWith({ where: { subjectId: In(['subj-cmn-3p', 'subj-cmn-4p']) } });
  });

  it('para un criterio anclado por ciclo, usa el ciclo y los cursos de ese ciclo', async () => {
    const criterion = { id: 'c2', courseId: null, cycleId: 'cycle-2',
      specificCompetency: { id: 'sc1', subjectId: 'subj-cmn-3p', subject: { id: 'subj-cmn-3p', name: 'Conocimiento del Medio' } } };
    const repos = make({}).repos;
    repos.criterion.findOne = jest.fn().mockResolvedValue(criterion);
    repos.course.find = jest.fn().mockResolvedValue([{ id: 'course-3p' }, { id: 'course-4p' }]);
    const svc = await build(repos);
    const result = await svc.getCandidates('c2');
    const ids = result.map((k: any) => k.id).sort();
    expect(ids).toEqual(['k-match-course', 'k-match-cycle'].sort());
  });
});
