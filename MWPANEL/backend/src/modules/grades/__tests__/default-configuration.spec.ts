import {
  GradeConfiguration,
  GradeComponent,
  GradingScale,
} from '../entities/grade-configuration.entity';

describe('GradeConfiguration.createDefaultConfiguration', () => {
  const make = () =>
    GradeConfiguration.createDefaultConfiguration(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

  it('incluye EXAMS 40 / TASKS 30 / ACTIVITIES 30', () => {
    const wc = make().weightConfiguration!;
    expect(wc[GradeComponent.EXAMS]).toMatchObject({
      weight: 40,
      enabled: true,
      scale: GradingScale.NUMERIC_0_100,
    });
    expect(wc[GradeComponent.TASKS]).toMatchObject({
      weight: 30,
      enabled: true,
      scale: GradingScale.NUMERIC_0_100,
    });
    expect(wc[GradeComponent.ACTIVITIES]).toMatchObject({
      weight: 30,
      enabled: true,
      scale: GradingScale.NUMERIC_0_100,
    });
  });

  it('NO incluye EVALUATIONS en el default', () => {
    const wc = make().weightConfiguration!;
    expect(wc[GradeComponent.EVALUATIONS]).toBeUndefined();
  });

  it('los componentes habilitados suman 100', () => {
    const wc = make().weightConfiguration!;
    const total = Object.values(wc)
      .filter((c: any) => c.enabled)
      .reduce((sum: number, c: any) => sum + c.weight, 0);
    expect(total).toBe(100);
  });

  it('EXAMS tiene minimumItems 1', () => {
    const wc = make().weightConfiguration!;
    expect(wc[GradeComponent.EXAMS]!.minimumItems).toBe(1);
  });

  it('mantiene escala 0-100 y umbral de aprobado', () => {
    const cfg = make();
    expect(cfg.defaultScale).toBe(GradingScale.NUMERIC_0_100);
    expect(cfg.passingGrade).toBe(50.0);
    expect(cfg.maximumGrade).toBe(100.0);
  });
});
