import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CriterionKnowledgeService } from '../criterion-knowledge.service';
import { CandidatePoolService } from '../candidate-pool.service';
import { CriterionBasicKnowledge, CriterionKnowledgeStatus, CriterionKnowledgeSource } from '../../entities/criterion-basic-knowledge.entity';
import { EvaluationCriterion } from '../../../competencies/entities/evaluation-criterion.entity';
import { SpecificCompetency } from '../../../competencies/entities/specific-competency.entity';

describe('CriterionKnowledgeService', () => {
  const build = async (repos: any) => {
    const mod = await Test.createTestingModule({
      providers: [
        CriterionKnowledgeService,
        { provide: getRepositoryToken(CriterionBasicKnowledge), useValue: repos.link },
        { provide: getRepositoryToken(EvaluationCriterion), useValue: repos.criterion },
        { provide: getRepositoryToken(SpecificCompetency), useValue: repos.spec },
        { provide: CandidatePoolService, useValue: repos.pool ?? { getCandidates: jest.fn() } },
      ],
    }).compile();
    return mod.get(CriterionKnowledgeService);
  };

  it('deriva las competencias clave del criterio vía su específica', async () => {
    const repos = {
      link: {}, criterion: { findOne: jest.fn().mockResolvedValue({ id: 'c1', specificCompetencyId: 'sc1' }) },
      spec: { findOne: jest.fn().mockResolvedValue({ id: 'sc1', keyCompetencies: [
        { id: 'k1', code: 'STEM', name: 'Competencia STEM' }, { id: 'k2', code: 'CCL', name: 'Comunicación lingüística' },
      ] }) },
    };
    const svc = await build(repos);
    const result = await svc.deriveKeyCompetencies('c1');
    expect(result).toEqual([
      { id: 'k1', code: 'STEM', name: 'Competencia STEM' },
      { id: 'k2', code: 'CCL', name: 'Comunicación lingüística' },
    ]);
  });

  it('linkManual es idempotente: si ya existe el par, devuelve la fila existente sin crear otra', async () => {
    const existing = { id: 'l1', evaluationCriterionId: 'c1', basicKnowledgeId: 'k1', status: CriterionKnowledgeStatus.SUGGESTED };
    const save = jest.fn();
    const repos = {
      link: { findOne: jest.fn().mockResolvedValue(existing), create: (x: any) => x, save },
      criterion: {}, spec: {},
    };
    const svc = await build(repos);
    const res = await svc.linkManual('c1', 'k1', 'user1');
    expect(res).toBe(existing);
    expect(save).not.toHaveBeenCalled();
  });

  it('confirm cambia el estado a confirmed', async () => {
    const row = { id: 'l1', status: CriterionKnowledgeStatus.SUGGESTED };
    const repos = {
      link: { findOne: jest.fn().mockResolvedValue(row), save: jest.fn(async (x) => x) },
      criterion: {}, spec: {},
    };
    const svc = await build(repos);
    const res = await svc.confirm('l1', 'user1');
    expect(res.status).toBe(CriterionKnowledgeStatus.CONFIRMED);
  });

  it('getScopesForSubject devuelve solo los scopes del área pedida, deduplicados y con label', async () => {
    const criteria = [
      // CMN - ciclo A + curso B
      { cycleId: 'cy1', cycle: { name: 'Ciclo 1' }, courseId: null, course: null,
        specificCompetency: { subject: { name: 'CMN' } } },
      { cycleId: 'cy1', cycle: { name: 'Ciclo 1' }, courseId: null, course: null,
        specificCompetency: { subject: { name: 'CMN' } } }, // duplicate cycle
      { cycleId: null, cycle: null, courseId: 'co1', course: { name: 'Curso 1' },
        specificCompetency: { subject: { name: 'CMN' } } },
      // Matemáticas - ciclo diferente (no debe aparecer)
      { cycleId: 'cy2', cycle: { name: 'Ciclo 2' }, courseId: null, course: null,
        specificCompetency: { subject: { name: 'Matemáticas' } } },
    ];
    const repos = {
      link: {}, criterion: { find: jest.fn().mockResolvedValue(criteria) }, spec: {},
    };
    const svc = await build(repos);
    const result = await svc.getScopesForSubject('CMN');
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.scopeType === 'cycle' && r.scopeId === 'cy1')).toBeDefined();
    expect(result.find((r) => r.scopeType === 'course' && r.scopeId === 'co1')).toBeDefined();
    expect(result.find((r) => r.scopeId === 'cy2')).toBeUndefined();
  });

  it('getCandidatesForLinking excluye saberes ya enlazados y mapea {id,code,title,block}', async () => {
    const allCandidates = [
      { id: 'k1', code: 'A.1', title: 'Saber uno', block: 'Bloque 1' },
      { id: 'k2', code: 'A.2', title: 'Saber dos', block: 'Bloque 1' },
      { id: 'k3', code: 'A.3', title: 'Saber tres', block: 'Bloque 2' },
    ];
    const repos = {
      link: {
        findOne: jest.fn(),
        find: jest.fn().mockResolvedValue([{ basicKnowledgeId: 'k2' }]), // k2 already linked
      },
      criterion: {},
      spec: {},
      pool: { getCandidates: jest.fn().mockResolvedValue(allCandidates) },
    };
    const svc = await build(repos);
    const result = await svc.getCandidatesForLinking('c1');
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.id === 'k2')).toBeUndefined(); // excluded
    expect(result).toEqual(expect.arrayContaining([
      { id: 'k1', code: 'A.1', title: 'Saber uno', block: 'Bloque 1' },
      { id: 'k3', code: 'A.3', title: 'Saber tres', block: 'Bloque 2' },
    ]));
  });
});
