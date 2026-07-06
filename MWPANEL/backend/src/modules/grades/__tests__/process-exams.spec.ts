import { CentralizedGradesService } from '../services/centralized-grades.service';
import { GradeComponent } from '../entities/grade-configuration.entity';

// processComponent/processExams no usan repos → stubs vacíos bastan.
const stub: any = {};
const makeService = () =>
  new CentralizedGradesService(
    stub, stub, stub, stub, stub, stub, stub, stub, stub, stub, stub, // repos (11)
    stub, // examGrade repo (nuevo, 12.º repo)
    stub, stub, stub, // huggingFaceAIService, gradeReportsService, aiInsightsService
    stub, // dataSource
    stub, // lomloeGradeMode (SP-B)
  );

const exam = (
  id: string,
  numericGrade: number,
  maxPoints: number | null,
  gradedAt: Date,
): any => ({
  id,
  numericGrade,
  gradedAt,
  task: { maxPoints },
});

describe('CentralizedGradesService.processExams', () => {
  let service: CentralizedGradesService;
  beforeEach(() => {
    service = makeService();
  });

  it('normaliza 8/10 → 80 y 90/100 → 90, media 85', () => {
    const exams = [
      exam('e1', 8, 10, new Date('2026-06-01T10:00:00Z')),
      exam('e2', 90, 100, new Date('2026-06-02T10:00:00Z')),
    ];
    const r = (service as any).processExams(exams, {});
    expect(r.score).toBeCloseTo(85, 5);
    expect(r.count).toBe(2);
    expect(r.ids).toEqual(['e1', 'e2']);
    expect(r.lastUpdate.getTime()).toBe(new Date('2026-06-02T10:00:00Z').getTime());
  });

  it('maxPoints null/0 → denominador 100 (38 → 38)', () => {
    const r = (service as any).processExams(
      [exam('e1', 38, null, new Date('2026-06-01T10:00:00Z'))],
      {},
    );
    expect(r.score).toBeCloseTo(38, 5);
    expect(r.count).toBe(1);
  });

  it('clamp 0-100 cuando la nota supera el máximo', () => {
    const r = (service as any).processExams(
      [exam('e1', 120, 100, new Date('2026-06-01T10:00:00Z'))],
      {},
    );
    expect(r.score).toBe(100);
  });

  it('numericGrade como string (driver decimal) se trata numérico', () => {
    const r = (service as any).processExams(
      [exam('e1', '50' as any, '100' as any, new Date('2026-06-01T10:00:00Z'))],
      {},
    );
    expect(r.score).toBeCloseTo(50, 5);
  });

  it('ignora exámenes sin nota numérica (null/NaN)', () => {
    const r = (service as any).processExams(
      [
        exam('e1', null as any, 100, new Date('2026-06-01T10:00:00Z')),
        exam('e2', 70, 100, new Date('2026-06-02T10:00:00Z')),
      ],
      {},
    );
    expect(r.count).toBe(1);
    expect(r.ids).toEqual(['e2']);
    expect(r.score).toBeCloseTo(70, 5);
  });

  it('lista vacía → score 0, count 0, ids []', () => {
    const r = (service as any).processExams([], {});
    expect(r).toMatchObject({ score: 0, count: 0, ids: [] });
  });

  it('el switch enruta GradeComponent.EXAMS a processExams', async () => {
    const sourceData = {
      tasks: [], activities: [], evaluations: [], rubrics: [], criteria: [],
      exams: [exam('e1', 8, 10, new Date('2026-06-01T10:00:00Z'))],
    };
    const configuration: any = {
      weightConfiguration: {
        [GradeComponent.EXAMS]: {
          weight: 40,
          enabled: true,
          minimumItems: 1,
          scale: 'numeric_0_100',
        },
      },
    };
    const bd = await (service as any).processComponent(
      GradeComponent.EXAMS,
      sourceData,
      configuration,
    );
    expect(bd.component).toBe(GradeComponent.EXAMS);
    expect(bd.itemCount).toBe(1);
    expect(bd.normalizedScore).toBeCloseTo(80, 5);
    expect(bd.weight).toBe(40);
    expect(bd.weightedScore).toBeCloseTo(32, 5); // 80 * 40 / 100
    expect(bd.sourceIds).toEqual(['e1']);
  });
});
