import { CentralizedGradesService } from '../grades/services/centralized-grades.service';
import { GradePeriod } from '../grades/entities/centralized-grade.entity';
import { TasksService } from './tasks.service';

describe('TasksService — recalcCentralizedGradeSafe (DI + fail-soft)', () => {
  function buildService(calc: jest.Mock): { service: TasksService; warn: jest.Mock } {
    const centralized = { calculateCentralizedGrade: calc } as unknown as CentralizedGradesService;
    // Instanciación directa: pasamos undefined a los repos no usados por el helper
    // y el servicio centralizado en la posición que tendrá en el constructor real.
    const service = Object.create(TasksService.prototype) as TasksService;
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
