import { CentralizedGradesService } from '../grades/services/centralized-grades.service';
import { GradePeriod } from '../grades/entities/centralized-grade.entity';
import { ActivitiesService } from './activities.service';

describe('ActivitiesService — recalcCentralizedGradeSafe (DI + fail-soft)', () => {
  function buildService(calc: jest.Mock): { service: ActivitiesService; warn: jest.Mock } {
    const centralized = { calculateCentralizedGrade: calc } as unknown as CentralizedGradesService;
    const service = Object.create(ActivitiesService.prototype) as ActivitiesService;
    (service as any).centralizedGradesService = centralized;
    const warn = jest.fn();
    (service as any).logger = { warn, log: jest.fn(), error: jest.fn() };
    return { service, warn };
  }

  it('llama a calculateCentralizedGrade con CONTINUOUS y forceRecalculation', async () => {
    const calc = jest.fn().mockResolvedValue({});
    const { service } = buildService(calc);
    await (service as any).recalcCentralizedGradeSafe('stu-1', 'sa-1');
    expect(calc).toHaveBeenCalledWith({
      studentId: 'stu-1',
      subjectAssignmentId: 'sa-1',
      period: GradePeriod.CONTINUOUS,
      forceRecalculation: true,
    });
  });

  it('es fail-soft: si calculateCentralizedGrade lanza, NO relanza y loguea warn', async () => {
    const calc = jest.fn().mockRejectedValue(new Error('boom'));
    const { service, warn } = buildService(calc);
    await expect((service as any).recalcCentralizedGradeSafe('stu-1', 'sa-1')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
