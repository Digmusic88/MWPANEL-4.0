import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CompetencyValuationService } from './competency-valuation.service';
import { CriterionAssessment } from '../entities/criterion-assessment.entity';
import { EvaluationCriterion } from '../../competencies/entities/evaluation-criterion.entity';
import { SpecificCompetency } from '../../competencies/entities/specific-competency.entity';

describe('CompetencyValuationService', () => {
  let svc: CompetencyValuationService;
  const caRepo = { find: jest.fn() };
  const critRepo = { find: jest.fn() };
  const scRepo = { find: jest.fn() };
  beforeEach(async () => {
    const mod = await Test.createTestingModule({ providers: [
      CompetencyValuationService,
      { provide: getRepositoryToken(CriterionAssessment), useValue: caRepo },
      { provide: getRepositoryToken(EvaluationCriterion), useValue: critRepo },
      { provide: getRepositoryToken(SpecificCompetency), useValue: scRepo },
    ]}).compile();
    svc = mod.get(CompetencyValuationService);
    jest.clearAllMocks();
  });
  it('agrega por competencia específica y reparte a clave', async () => {
    caRepo.find.mockResolvedValue([
      { evaluationCriterionId: 'c1', normalizedScore: '80' },
      { evaluationCriterionId: 'c2', normalizedScore: '60' },
    ]);
    critRepo.find.mockResolvedValue([
      { id: 'c1', specificCompetencyId: 'sc1' }, { id: 'c2', specificCompetencyId: 'sc1' },
    ]);
    scRepo.find.mockResolvedValue([
      { id: 'sc1', code: 'CE1', name: 'Comunica', keyCompetencies: [{ code: 'CCL', name: 'Ling' }] },
    ]);
    const res = await svc.getValuation('st1', 'a1', 'p1');
    expect(res.bySpecific).toEqual([{ id: 'sc1', code: 'CE1', name: 'Comunica', score: 70 }]);
    expect(res.byKey).toEqual([{ code: 'CCL', name: 'Ling', score: 70 }]);
  });
});

describe('CompetencyValuationService.getStudentValuation', () => {
  const makeService = (caFind: any, critFind: any, scFind: any) => {
    return Test.createTestingModule({
      providers: [
        CompetencyValuationService,
        { provide: getRepositoryToken(CriterionAssessment), useValue: { find: caFind } },
        { provide: getRepositoryToken(EvaluationCriterion), useValue: { find: critFind } },
        { provide: getRepositoryToken(SpecificCompetency), useValue: { find: scFind } },
      ],
    }).compile().then((m) => m.get(CompetencyValuationService));
  };

  it('devuelve hasData=false y arrays vacíos sin assessments', async () => {
    const svc = await makeService(jest.fn().mockResolvedValue([]), jest.fn(), jest.fn());
    expect(await svc.getStudentValuation('s1')).toEqual({ bySpecific: [], byKey: [], hasData: false });
  });

  it('promedia normalizedScore por competencia específica y reparte a la clave', async () => {
    const caFind = jest.fn().mockResolvedValue([
      { evaluationCriterionId: 'c1', normalizedScore: 80 },
      { evaluationCriterionId: 'c2', normalizedScore: 100 },
    ]);
    const critFind = jest.fn().mockResolvedValue([
      { id: 'c1', specificCompetencyId: 'sp1' },
      { id: 'c2', specificCompetencyId: 'sp1' },
    ]);
    const scFind = jest.fn().mockResolvedValue([
      { id: 'sp1', code: 'CE1', name: 'Comp esp 1', keyCompetencies: [{ code: 'CCL', name: 'Comunicación lingüística' }] },
    ]);
    const svc = await makeService(caFind, critFind, scFind);
    const res: any = await svc.getStudentValuation('s1');
    expect(res.hasData).toBe(true);
    expect(res.bySpecific).toEqual([{ id: 'sp1', code: 'CE1', name: 'Comp esp 1', score: 90 }]);
    expect(res.byKey).toEqual([{ code: 'CCL', name: 'Comunicación lingüística', score: 90 }]);
  });

  it('sin evaluationPeriodId no filtra por periodo', async () => {
    const caFind = jest.fn().mockResolvedValue([]);
    const svc = await makeService(caFind, jest.fn(), jest.fn());
    await svc.getStudentValuation('s1');
    expect(caFind).toHaveBeenCalledWith({ where: { studentId: 's1' } });
  });
});
