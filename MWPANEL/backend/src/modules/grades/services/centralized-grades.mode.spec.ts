import { applyLomloeMode } from './lomloe-mode.util';
import { GradeComponent } from '../entities/grade-configuration.entity';

const bd = (component: string, normalizedScore: number, weight: number, itemCount = 1) =>
  ({ component, normalizedScore, weight, weightedScore: (normalizedScore * weight) / 100, itemCount });

describe('applyLomloeMode', () => {
  const exams = bd(GradeComponent.EXAMS, 80, 100);
  const criteria = bd(GradeComponent.CRITERIA, 40, 50);

  it('parallel excluye CRITERIA (renormaliza sobre presentes)', () => {
    const r = applyLomloeMode('parallel', [exams, criteria], [{ normalizedScore: 40 }] as any);
    expect(r.breakdown.some((b: any) => b.component === GradeComponent.CRITERIA)).toBe(false);
  });
  it('derive mantiene CRITERIA', () => {
    const r = applyLomloeMode('derive', [exams, criteria], [{ normalizedScore: 40 }] as any);
    expect(r.breakdown.some((b: any) => b.component === GradeComponent.CRITERIA)).toBe(true);
    expect(r.finalGradeOverride).toBeNull();
  });
  it('replace = media de criterios', () => {
    const r = applyLomloeMode('replace', [exams, criteria], [{ normalizedScore: 40 }, { normalizedScore: 60 }] as any);
    expect(r.finalGradeOverride).toBe(50);
  });
  it('replace sin marcas cae a cálculo normal', () => {
    const r = applyLomloeMode('replace', [exams], [] as any);
    expect(r.finalGradeOverride).toBeNull();
  });

  // M-2: en replace el desglose persistido = un único CRITERIA al 100% (coherente con la nota).
  it('replace deja un desglose de un solo componente CRITERIA al 100%', () => {
    const r = applyLomloeMode('replace', [exams, criteria], [{ normalizedScore: 40 }, { normalizedScore: 60 }] as any);
    expect(r.finalGradeOverride).toBe(50);
    expect(r.breakdown).toHaveLength(1);
    expect(r.breakdown[0].component).toBe(GradeComponent.CRITERIA);
    expect(r.breakdown[0].weight).toBe(100);
    expect(r.breakdown[0].normalizedScore).toBe(50);
    expect(r.breakdown[0].weightedScore).toBe(50);
    expect(r.breakdown.some((b: any) => b.component === GradeComponent.EXAMS)).toBe(false);
  });

  // M-1: al quitar CRITERIA en parallel, renormaliza los pesos restantes para que sumen 100.
  it('parallel renormaliza los pesos restantes a 100 tras quitar CRITERIA', () => {
    const examsPart = bd(GradeComponent.EXAMS, 80, 60);   // weightedScore 48
    const crit = bd(GradeComponent.CRITERIA, 30, 40);
    const r = applyLomloeMode('parallel', [examsPart, crit], [{ normalizedScore: 30 }] as any);
    expect(r.breakdown).toHaveLength(1);
    const sum = r.breakdown.reduce((s: number, b: any) => s + b.weight, 0);
    expect(sum).toBeCloseTo(100, 5);
    // NEUTRO en la nota: (Σ weightedScore)/(Σ weight)*100 debe seguir siendo 80.
    const finalEquivalent = (r.breakdown.reduce((s: number, b: any) => s + b.weightedScore, 0) /
      r.breakdown.reduce((s: number, b: any) => s + b.weight, 0)) * 100;
    expect(finalEquivalent).toBeCloseTo(80, 5);
  });

  // M-1: sin CRITERIA no toca nada (no-regresión de configs normales).
  it('parallel NO renormaliza cuando no había CRITERIA', () => {
    const a = bd(GradeComponent.EXAMS, 80, 60);
    const b = bd(GradeComponent.TASKS, 50, 30); // suman 90 a propósito
    const r = applyLomloeMode('parallel', [a, b], [] as any);
    expect(r.breakdown).toHaveLength(2);
    const sum = r.breakdown.reduce((s: number, x: any) => s + x.weight, 0);
    expect(sum).toBe(90); // intacto: no se renormaliza si no había criterios
  });
});
