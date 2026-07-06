import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { CurriculumApplyService } from '../curriculum-apply.service';
import { CurriculumGeneration, GenerationStatus } from '../../entities/curriculum-generation.entity';
import { SpecificCompetency } from '../../../competencies/entities/specific-competency.entity';
import { EvaluationCriterion } from '../../../competencies/entities/evaluation-criterion.entity';
import { BasicKnowledge } from '../../../competencies/entities/basic-knowledge.entity';
import { Subject } from '../../../students/entities/subject.entity';
import { Competency } from '../../../competencies/entities/competency.entity';

const draft = {
  id: 'g1', status: GenerationStatus.DRAFT, subjectName: 'Matemáticas', educationalLevelId: 'L',
  scopeType: 'course', scopeId: 'co1',
  payload: { specificCompetencies: [{ code: 'CE.MAT.1', name: 'n', description: 'd', keyCompetencyCodes: ['STEM','NOPE'], criteria: [{ code: '1.1', description: 'c' }] }], basicKnowledge: [{ code: 'A.1', block: 'A', title: 't', description: 'd', knowledgeType: 'KNOWLEDGE' }] },
};

describe('CurriculumApplyService', () => {
  const mk = () => {
    const calls: any = { spec: [], crit: [], know: [], mapping: [] };
    const genRepo = { findOne: jest.fn().mockResolvedValue({ ...draft }), save: jest.fn(async (x) => x) };
    const subjectRepo = { findOne: jest.fn().mockResolvedValue({ id: 'subj-mat-3p', name: 'Matemáticas', courseId: 'co1' }), find: jest.fn().mockResolvedValue([{ id: 'subj-mat-3p', name: 'Matemáticas', courseId: 'co1' }]) };
    const specRepo = { findOne: jest.fn().mockResolvedValue(null), create: (x: any) => x, save: jest.fn(async (x) => { calls.spec.push(x); return { id: 'sc1', ...x, keyCompetencies: [] }; }) };
    const critRepo = { findOne: jest.fn().mockResolvedValue(null), create: (x: any) => x, save: jest.fn(async (x) => { calls.crit.push(x); return x; }) };
    const knowRepo = { findOne: jest.fn().mockResolvedValue(null), create: (x: any) => x, save: jest.fn(async (x) => { calls.know.push(x); return x; }) };
    const compRepo = { find: jest.fn().mockResolvedValue([{ id: 'k-stem', code: 'STEM' }]) };
    return { calls, genRepo, subjectRepo, specRepo, critRepo, knowRepo, compRepo };
  };
  const build = async (m: any) => (await Test.createTestingModule({ providers: [
    CurriculumApplyService,
    { provide: getRepositoryToken(CurriculumGeneration), useValue: m.genRepo },
    { provide: getRepositoryToken(SpecificCompetency), useValue: m.specRepo },
    { provide: getRepositoryToken(EvaluationCriterion), useValue: m.critRepo },
    { provide: getRepositoryToken(BasicKnowledge), useValue: m.knowRepo },
    { provide: getRepositoryToken(Subject), useValue: m.subjectRepo },
    { provide: getRepositoryToken(Competency), useValue: m.compRepo },
  ] }).compile()).get(CurriculumApplyService);

  it('crea específica/criterio/saber con scoping de curso y salta la clave inválida', async () => {
    const m = mk(); const svc = await build(m);
    const res = await svc.apply('g1', 'u1');
    expect(res.specificsCreated).toBe(1);
    expect(res.criteriaCreated).toBe(1);
    expect(res.knowledgeCreated).toBe(1);
    expect(res.invalidKeyCodes).toContain('NOPE');
    expect(m.calls.crit[0].courseId).toBe('co1');   // scoping por curso
    expect(m.calls.know[0].subjectId).toBe('subj-mat-3p');
  });

  it('una generación ya applied → ConflictException', async () => {
    const m = mk(); m.genRepo.findOne = jest.fn().mockResolvedValue({ ...draft, status: GenerationStatus.APPLIED });
    const svc = await build(m);
    await expect(svc.apply('g1', 'u1')).rejects.toBeInstanceOf(ConflictException);
  });
});
